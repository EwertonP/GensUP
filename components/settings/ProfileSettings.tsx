"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ProfileSettingsProps {
  email: string;
  role: string;
  clientName: string | null;
}

// Meu perfil (design/INFORMATION_ARCHITECTURE.md seção 7.2): troca de senha
// via supabase.auth.updateUser (client SDK, sessão já autenticada) e dados
// somente-leitura de role/cliente vinculado -- hoje não existe absolutamente
// nada disso pela UI.
export function ProfileSettings({ email, role, clientName }: ProfileSettingsProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setStatus("error");
      setErrorMessage("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("error");
      setErrorMessage("As senhas não coincidem.");
      return;
    }

    setStatus("saving");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("success");
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-[-0.02em]">Meu perfil</h1>
        <p className="mt-1 text-sm text-neutral-500">Dados da sua conta e troca de senha.</p>
      </div>

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="text-sm font-semibold text-neutral-700">Dados da conta</h2>
        <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
          <dt className="text-neutral-400">E-mail</dt>
          <dd className="text-neutral-900">{email}</dd>
          <dt className="text-neutral-400">Role</dt>
          <dd className="text-neutral-900">{role}</dd>
          <dt className="text-neutral-400">Cliente</dt>
          <dd className="text-neutral-900">{clientName ?? "—"}</dd>
        </dl>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-neutral-700">Trocar senha</h2>
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
          {errorMessage && <p className="text-xs text-status-error">{errorMessage}</p>}
          {status === "success" && <p className="text-xs text-status-success">Senha atualizada com sucesso.</p>}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700" htmlFor="new-password">
              Nova senha
            </label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700" htmlFor="confirm-password">
              Confirmar nova senha
            </label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div>
            <Button type="submit" variant="primary" disabled={status === "saving"}>
              {status === "saving" ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
