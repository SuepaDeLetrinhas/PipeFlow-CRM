import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

/** Erro geral do formulário — o que não pertence a um campo específico. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <Alert variant="destructive" role="alert">
      <AlertCircle className="size-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <Alert className="border-success/40 text-success" role="status">
      <CheckCircle2 className="size-4" />
      <AlertDescription className="text-foreground">{message}</AlertDescription>
    </Alert>
  );
}
