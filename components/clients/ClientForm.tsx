"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Client } from "@/lib/types/client";

interface ClientFormProps {
  onClose: () => void;
}

interface FormState {
  name: string;
  slug: string;
}

async function createClient(form: FormState): Promise<Client> {
  const res = await fetch("/api/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: form.name, slug: form.slug || null, status: "active" }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Falha ao criar cliente");
  }
  return res.json();
}

// Criação manual de cliente, sem passar pelo pipeline (design/INFORMATION_ARCHITECTURE.md
// seção 2.2) — útil para clientes legados. POST /api/clients é restrito a role=admin.
export function ClientForm({ onClose }: ClientFormProps) {
  const [form, setForm] = useState<FormState>({ name: "", slug: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const router = useRouter();

  const saveMutation = useMutation({
    mutationFn: () => createClient(form),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      onClose();
      router.push(`/clients/${client.id}`);
    },
    onError: (err) => {
      setErrors((prev) => ({ ...prev, form: err instanceof Error ? err.message : "Falha ao criar cliente" }));
    },
  });

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Informe um nome.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    if (!validate()) return;
    saveMutation.mutate();
  }

  const isSaving = saveMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold text-neutral-900">Novo cliente</h2>

          {errors.form && <p className="text-xs text-status-error">{errors.form}</p>}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700" htmlFor="name">
              Nome
            </label>
            <Input id="name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            {errors.name && <p className="text-xs text-status-error">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700" htmlFor="slug">
              Slug (link na bio)
            </label>
            <Input
              id="slug"
              placeholder="ex: minha-marca"
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
