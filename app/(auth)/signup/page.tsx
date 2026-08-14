import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignupPage() {
  return (
    <AuthCard
      title="Criar conta"
      description="Grátis para até 2 colaboradores e 50 leads. Sem cartão."
      footer={
        <>
          Já tem uma conta?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthCard>
  );
}
