"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LinkStatusBadge } from "@/components/utm-links/LinkStatusBadge";
import { CopyLinkButton } from "@/components/utm-links/CopyLinkButton";
import type { UtmLink } from "@/lib/types/utm";

interface UtmLinkListProps {
  links: UtmLink[];
  showClientColumn: boolean;
  clientNameById: Map<string, string>;
  onEdit: (link: UtmLink) => void;
}

async function toggleActive(link: UtmLink): Promise<void> {
  const res = await fetch(`/api/utm-links/${link.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: !link.is_active }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Falha ao atualizar link");
  }
}

async function deleteLink(id: string): Promise<void> {
  const res = await fetch(`/api/utm-links/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Falha ao excluir link");
  }
}

export function UtmLinkList({ links, showClientColumn, clientNameById, onEdit }: UtmLinkListProps) {
  const queryClient = useQueryClient();
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const toggleMutation = useMutation({
    mutationFn: (link: UtmLink) => toggleActive(link),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["utm-links"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLink(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["utm-links"] }),
  });

  function handleDelete(link: UtmLink) {
    if (window.confirm("Excluir este link? Essa ação não pode ser desfeita.")) {
      deleteMutation.mutate(link.id);
    }
  }

  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-100 text-left text-xs text-neutral-500">
            <th className="px-4 py-2 font-medium">Título</th>
            {showClientColumn && <th className="px-4 py-2 font-medium">Cliente</th>}
            <th className="px-4 py-2 font-medium">Link</th>
            <th className="px-4 py-2 font-medium">Destino</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <tr key={link.id} className="border-b border-neutral-100 py-3 hover:bg-neutral-50">
              <td className="max-w-[220px] truncate px-4 py-3 font-medium text-neutral-900">{link.title}</td>
              {showClientColumn && (
                <td className="px-4 py-3 text-neutral-600">
                  {clientNameById.get(link.client_id) ?? link.client_id}
                </td>
              )}
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-neutral-500">
                    {origin.replace(/^https?:\/\//, "")}/l/{link.slug}
                  </span>
                  <CopyLinkButton url={`${origin}/l/${link.slug}`} />
                </div>
              </td>
              <td className="max-w-[220px] truncate px-4 py-3 text-xs text-neutral-500" title={link.destination_url}>
                {link.destination_url}
              </td>
              {/* TODO: cliques por link — endpoint ainda não existe (GET /api/utm-links/clicks só agrega por dia) */}
              <td className="px-4 py-3">
                <LinkStatusBadge isActive={link.is_active} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => onEdit(link)}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-2 py-1 text-xs"
                    onClick={() => toggleMutation.mutate(link)}
                    disabled={toggleMutation.isPending}
                  >
                    {link.is_active ? "Desativar" : "Ativar"}
                  </Button>
                  <Button
                    variant="danger"
                    className="px-2 py-1 text-xs"
                    onClick={() => handleDelete(link)}
                    disabled={deleteMutation.isPending}
                  >
                    Excluir
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
