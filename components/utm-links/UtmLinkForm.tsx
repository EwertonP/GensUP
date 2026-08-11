"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ClientSelect } from "@/components/agency/ClientSelect";
import type { UtmLink } from "@/lib/types/utm";

interface UtmLinkFormProps {
  link: UtmLink | null;
  clientNameById: Map<string, string>;
  defaultClientId?: string;
  onClose: () => void;
}

interface FormState {
  client_id: string;
  title: string;
  slug: string;
  destination_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  is_active: boolean;
}

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function initialState(link: UtmLink | null, defaultClientId?: string): FormState {
  if (link) {
    return {
      client_id: link.client_id,
      title: link.title,
      slug: link.slug,
      destination_url: link.destination_url,
      utm_source: link.utm_source ?? "",
      utm_medium: link.utm_medium ?? "",
      utm_campaign: link.utm_campaign ?? "",
      utm_content: link.utm_content ?? "",
      utm_term: link.utm_term ?? "",
      is_active: link.is_active,
    };
  }
  return {
    client_id: defaultClientId ?? "",
    title: "",
    slug: "",
    destination_url: "",
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_content: "",
    utm_term: "",
    is_active: true,
  };
}

async function saveLink(link: UtmLink | null, form: FormState): Promise<UtmLink> {
  const isEdit = link !== null;
  const url = isEdit ? `/api/utm-links/${link.id}` : "/api/utm-links";
  const method = isEdit ? "PATCH" : "POST";

  const body = isEdit
    ? {
        title: form.title,
        destination_url: form.destination_url,
        utm_source: form.utm_source || null,
        utm_medium: form.utm_medium || null,
        utm_campaign: form.utm_campaign || null,
        utm_content: form.utm_content || null,
        utm_term: form.utm_term || null,
        is_active: form.is_active,
      }
    : {
        client_id: form.client_id,
        title: form.title,
        slug: form.slug,
        destination_url: form.destination_url,
        utm_source: form.utm_source || null,
        utm_medium: form.utm_medium || null,
        utm_campaign: form.utm_campaign || null,
        utm_content: form.utm_content || null,
        utm_term: form.utm_term || null,
        is_active: form.is_active,
      };

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const responseBody = await res.json().catch(() => ({}));
    throw new Error(responseBody.error ?? "Falha ao salvar link");
  }
  return res.json();
}

async function deleteLink(id: string): Promise<void> {
  const res = await fetch(`/api/utm-links/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Falha ao excluir link");
  }
}

function isDuplicateSlugError(message: string): boolean {
  return /duplicate|unique|já está em uso|already exists/i.test(message);
}

export function UtmLinkForm({ link, clientNameById, defaultClientId, onClose }: UtmLinkFormProps) {
  const isEdit = link !== null;
  const [form, setForm] = useState<FormState>(() => initialState(link, defaultClientId));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: () => saveLink(link, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-links"] });
      onClose();
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Falha ao salvar link";
      if (!isEdit && isDuplicateSlugError(message)) {
        setErrors((prev) => ({ ...prev, slug: message }));
      } else {
        setErrors((prev) => ({ ...prev, form: message }));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLink(link!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-links"] });
      onClose();
    },
    onError: (err) => {
      setErrors((prev) => ({ ...prev, form: err instanceof Error ? err.message : "Falha ao excluir link" }));
    },
  });

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!isEdit && !form.client_id) next.client_id = "Selecione um cliente.";
    if (!form.title.trim()) next.title = "Informe um título.";
    if (!isEdit) {
      if (!form.slug.trim()) next.slug = "Informe um slug.";
      else if (!/^[a-z0-9-]+$/.test(form.slug)) next.slug = "Use apenas letras minúsculas, números e hífen.";
    }
    if (!form.destination_url.trim()) next.destination_url = "Informe a URL de destino.";
    else {
      try {
        new URL(form.destination_url);
      } catch {
        next.destination_url = "URL inválida.";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    if (!validate()) return;
    saveMutation.mutate();
  }

  function handleSlugChange(raw: string) {
    setForm((prev) => ({ ...prev, slug: slugify(raw) }));
  }

  function applySuggestedSlug() {
    setForm((prev) => ({ ...prev, slug: `${prev.slug}-2` }));
  }

  function handleDelete() {
    if (!link) return;
    if (window.confirm("Excluir este link? Essa ação não pode ser desfeita.")) {
      deleteMutation.mutate();
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "seusite.com";
  const isSaving = saveMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-lg">
        <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto p-6">
          <h2 className="text-lg font-semibold text-neutral-900">{isEdit ? "Editar link" : "Novo link UTM"}</h2>

          {errors.form && <p className="text-xs text-status-error">{errors.form}</p>}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700" htmlFor="client_id">
              Cliente
            </label>
            {isEdit ? (
              <p className="text-sm text-neutral-700">
                Cliente: {clientNameById.get(link.client_id) ?? link.client_id}
              </p>
            ) : (
              <>
                <ClientSelect
                  id="client_id"
                  value={form.client_id}
                  onChange={(clientId) => setForm((prev) => ({ ...prev, client_id: clientId }))}
                />
                {errors.client_id && <p className="text-xs text-status-error">{errors.client_id}</p>}
              </>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700" htmlFor="title">
              Título
            </label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <p className="text-xs text-neutral-500">
              Nome interno para identificar o link (ex.: &quot;Post Reels — Promoção Agosto&quot;).
            </p>
            {errors.title && <p className="text-xs text-status-error">{errors.title}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700" htmlFor="slug">
              Slug
            </label>
            {isEdit ? (
              <p className="text-xs font-mono text-neutral-500">
                {origin}/l/{link.slug}
              </p>
            ) : (
              <>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="seu-slug"
                />
                <p className="text-xs font-mono text-neutral-500">
                  {origin}/l/{form.slug || "seu-slug"}
                </p>
                {errors.slug && (
                  <p className="text-xs text-status-error">
                    {errors.slug}{" "}
                    {isDuplicateSlugError(errors.slug) && (
                      <button
                        type="button"
                        onClick={applySuggestedSlug}
                        className="underline hover:no-underline"
                      >
                        Usar &quot;{form.slug}-2&quot;
                      </button>
                    )}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700" htmlFor="destination_url">
              URL de destino
            </label>
            <Input
              id="destination_url"
              type="url"
              placeholder="https://..."
              value={form.destination_url}
              onChange={(e) => setForm((prev) => ({ ...prev, destination_url: e.target.value }))}
            />
            {errors.destination_url && <p className="text-xs text-status-error">{errors.destination_url}</p>}
          </div>

          <div className="flex flex-col gap-3 rounded-md border border-neutral-100 p-3">
            <span className="text-xs font-semibold uppercase text-neutral-500">Parâmetros UTM</span>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-600" htmlFor="utm_source">
                utm_source
              </label>
              <Input
                id="utm_source"
                list="utm-source-options"
                value={form.utm_source}
                onChange={(e) => setForm((prev) => ({ ...prev, utm_source: e.target.value }))}
              />
              <datalist id="utm-source-options">
                <option value="instagram" />
                <option value="facebook" />
                <option value="google" />
                <option value="whatsapp" />
                <option value="email" />
                <option value="linkedin" />
              </datalist>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-600" htmlFor="utm_medium">
                utm_medium
              </label>
              <Input
                id="utm_medium"
                list="utm-medium-options"
                value={form.utm_medium}
                onChange={(e) => setForm((prev) => ({ ...prev, utm_medium: e.target.value }))}
              />
              <datalist id="utm-medium-options">
                <option value="social" />
                <option value="cpc" />
                <option value="email" />
                <option value="referral" />
                <option value="organic" />
                <option value="stories" />
                <option value="bio" />
              </datalist>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-600" htmlFor="utm_campaign">
                utm_campaign
              </label>
              <Input
                id="utm_campaign"
                value={form.utm_campaign}
                onChange={(e) => setForm((prev) => ({ ...prev, utm_campaign: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-600" htmlFor="utm_content">
                utm_content
              </label>
              <Input
                id="utm_content"
                value={form.utm_content}
                onChange={(e) => setForm((prev) => ({ ...prev, utm_content: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-600" htmlFor="utm_term">
                utm_term
              </label>
              <Input
                id="utm_term"
                value={form.utm_term}
                onChange={(e) => setForm((prev) => ({ ...prev, utm_term: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-start gap-2">
            <input
              id="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="mt-1"
            />
            <label htmlFor="is_active" className="text-sm text-neutral-700">
              Link ativo
              <p className="text-xs text-neutral-500">
                Links inativos continuam existindo mas redirecionam para a home ao serem acessados.
              </p>
            </label>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-neutral-100 pt-4">
            {isEdit ? (
              <Button type="button" variant="danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "Excluindo..." : "Excluir link"}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
