"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface UserOption {
  id: string;
  email: string;
}

interface ProspectFormProps {
  users: UserOption[];
  defaultOwnerId?: string;
  onClose: () => void;
}

interface FormState {
  name: string;
  company: string;
  source: string;
  owner_user_id: string;
}

async function createProspect(form: FormState) {
  const res = await fetch("/api/prospects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: form.name,
      company: form.company || null,
      source: form.source || null,
      owner_user_id: form.owner_user_id || null,
      stage: "novo",
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Falha ao criar prospect");
  }
  return res.json();
}

export function ProspectForm({ users, defaultOwnerId, onClose }: ProspectFormProps) {
  const [form, setForm] = useState<FormState>({
    name: "",
    company: "",
    source: "",
    owner_user_id: defaultOwnerId ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: () => createProspect(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      onClose();
    },
    onError: (err) => {
      setErrors((prev) => ({ ...prev, form: err instanceof Error ? err.message : "Falha ao criar prospect" }));
    },
  });

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Informe um nome.";
    if (!form.company.trim()) next.company = "Informe uma empresa.";
    if (!form.owner_user_id) next.owner_user_id = "Selecione um dono para o prospect.";
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
          <h2 className="text-lg font-semibold text-neutral-900">Novo prospect</h2>

          {errors.form && <p className="text-xs text-status-error">{errors.form}</p>}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700" htmlFor="name">
              Nome
            </label>
            <Input id="name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            {errors.name && <p className="text-xs text-status-error">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700" htmlFor="company">
              Empresa
            </label>
            <Input
              id="company"
              value={form.company}
              onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
            />
            {errors.company && <p className="text-xs text-status-error">{errors.company}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700" htmlFor="source">
              Origem
            </label>
            <Input
              id="source"
              list="prospect-source-options"
              value={form.source}
              onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
            />
            <datalist id="prospect-source-options">
              <option value="indicação" />
              <option value="site" />
              <option value="instagram" />
              <option value="evento" />
              <option value="outbound" />
              <option value="linkedin" />
            </datalist>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700" htmlFor="owner_user_id">
              Dono do prospect
            </label>
            <select
              id="owner_user_id"
              value={form.owner_user_id}
              onChange={(e) => setForm((prev) => ({ ...prev, owner_user_id: e.target.value }))}
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="" disabled>
                Selecione...
              </option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </select>
            {errors.owner_user_id && <p className="text-xs text-status-error">{errors.owner_user_id}</p>}
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
