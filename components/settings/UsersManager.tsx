"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ClientSelect } from "@/components/agency/ClientSelect";
import type { Role } from "@/lib/auth/roles";

interface UserRow {
  id: string;
  email: string;
  role: Role;
  client_id: string | null;
  created_at: string;
  banned_until: string | null;
}

async function fetchUsers(): Promise<UserRow[]> {
  const res = await fetch("/api/users");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Falha ao carregar usuários");
  }
  return res.json();
}

async function inviteUser(payload: { email: string; role: Role; client_id: string | null }): Promise<void> {
  const res = await fetch("/api/users/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Falha ao convidar usuário");
  }
}

async function updateUserRole(id: string, role: Role, clientId: string | null): Promise<void> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, client_id: role === "cliente" ? clientId : null }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Falha ao atualizar usuário");
  }
}

async function setBanned(id: string, banned: boolean): Promise<void> {
  const res = await fetch(`/api/users/${id}/ban`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ banned }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Falha ao atualizar status da conta");
  }
}

function isBanned(user: UserRow): boolean {
  return !!user.banned_until && new Date(user.banned_until) > new Date();
}

// Gestão de usuários da agência (design/INFORMATION_ARCHITECTURE.md seção
// 7.1) -- criar via convite por e-mail, editar role/client_id, e
// ativar/desativar (ban do Supabase Auth, sem coluna nova).
export function UsersManager() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<{ email: string; role: Role; client_id: string }>({
    email: "",
    role: "cliente",
    client_id: "",
  });
  const [inviteError, setInviteError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const usersQuery = useQuery({ queryKey: ["users"], queryFn: fetchUsers });

  const inviteMutation = useMutation({
    mutationFn: () =>
      inviteUser({ email: inviteForm.email, role: inviteForm.role, client_id: inviteForm.client_id || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setInviteOpen(false);
      setInviteForm({ email: "", role: "cliente", client_id: "" });
    },
    onError: (err) => setInviteError(err instanceof Error ? err.message : "Falha ao convidar usuário"),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role, clientId }: { id: string; role: Role; clientId: string | null }) =>
      updateUserRole(id, role, clientId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const banMutation = useMutation({
    mutationFn: ({ id, banned }: { id: string; banned: boolean }) => setBanned(id, banned),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  function handleInviteSubmit(e: FormEvent) {
    e.preventDefault();
    setInviteError(null);
    if (!inviteForm.email.trim()) {
      setInviteError("Informe um e-mail.");
      return;
    }
    if (inviteForm.role === "cliente" && !inviteForm.client_id) {
      setInviteError("Selecione o cliente pra essa conta.");
      return;
    }
    inviteMutation.mutate();
  }

  const users = usersQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.02em]">Usuários da agência</h1>
          <p className="mt-1 text-sm text-neutral-500">Crie, edite e desative contas de acesso à plataforma.</p>
        </div>
        <Button variant="primary" onClick={() => setInviteOpen(true)}>
          + Convidar usuário
        </Button>
      </div>

      {usersQuery.isLoading && <p className="text-sm text-neutral-400">Carregando usuários...</p>}
      {usersQuery.isError && (
        <p className="text-sm text-status-error">
          {usersQuery.error instanceof Error ? usersQuery.error.message : "Falha ao carregar usuários."}
        </p>
      )}

      {users.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 text-neutral-900">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      disabled={roleMutation.isPending}
                      onChange={(e) =>
                        roleMutation.mutate({ id: user.id, role: e.target.value as Role, clientId: user.client_id })
                      }
                      className="rounded-md border border-neutral-200 px-2 py-1 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="cliente">cliente</option>
                      <option value="agencia">agencia</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        isBanned(user) ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {isBanned(user) ? "Desativado" : "Ativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-xs"
                      disabled={banMutation.isPending}
                      onClick={() => banMutation.mutate({ id: user.id, banned: !isBanned(user) })}
                    >
                      {isBanned(user) ? "Reativar" : "Desativar"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
            <form onSubmit={handleInviteSubmit} className="flex flex-col gap-4 p-6">
              <h2 className="text-lg font-semibold text-neutral-900">Convidar usuário</h2>

              {inviteError && <p className="text-xs text-status-error">{inviteError}</p>}

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-neutral-700" htmlFor="invite-email">
                  E-mail
                </label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-neutral-700" htmlFor="invite-role">
                  Role
                </label>
                <select
                  id="invite-role"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, role: e.target.value as Role }))}
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="cliente">cliente</option>
                  <option value="agencia">agencia</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              {inviteForm.role === "cliente" && (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-neutral-700">Cliente</label>
                  <ClientSelect
                    value={inviteForm.client_id}
                    onChange={(clientId) => setInviteForm((prev) => ({ ...prev, client_id: clientId }))}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? "Enviando..." : "Enviar convite"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
