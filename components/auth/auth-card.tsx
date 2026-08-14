import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Link de rodapé: "já tem conta?", "voltar para o login"… */
  footer?: React.ReactNode;
}

export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>

      {footer ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {footer}
        </p>
      ) : null}
    </>
  );
}
