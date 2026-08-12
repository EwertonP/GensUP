import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto mt-24 max-w-sm">
      <h1 className="mb-4 text-xl font-semibold">Entrar</h1>
      <LoginForm />
    </main>
  );
}
