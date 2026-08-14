import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Nova senha" };

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Definir nova senha"
      description="Escolha uma senha nova para voltar a acessar sua conta."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Voltar para o login
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
