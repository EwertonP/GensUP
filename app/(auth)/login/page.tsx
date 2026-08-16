import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto mt-24 max-w-sm">
      <h1 className="mb-4 text-3xl font-bold tracking-[-0.02em]">Entrar</h1>
      <LoginForm />
    </main>
  );
}
