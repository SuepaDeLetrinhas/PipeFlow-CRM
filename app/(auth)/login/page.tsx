import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { FormSuccess } from "@/components/auth/form-error";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redefinida?: string };
}) {
  return (
    <AuthCard
      title="Entrar"
      description="Acesse seu workspace e continue de onde parou."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Criar conta grátis
          </Link>
        </>
      }
    >
      {searchParams.redefinida ? (
        <div className="mb-4">
          <FormSuccess message="Senha redefinida. Entre com a nova senha." />
        </div>
      ) : null}

      <LoginForm />
    </AuthCard>
  );
}
