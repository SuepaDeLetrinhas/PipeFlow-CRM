"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Loader2, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { inviteMemberAction } from "@/app/(app)/settings/actions";
import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/constants";
import {
  inviteMemberSchema,
  type InviteMemberInput,
} from "@/lib/validations/invite";

/**
 * Formulário de convite.
 *
 * Quando o Resend não está configurado (ou recusa o envio), a action devolve
 * `emailDelivered: false` junto com o link. Mostrar esse link é o que mantém o
 * convite utilizável sem e-mail — e é também o caminho para testar o fluxo de
 * aceite em dev, sem depender de caixa de entrada.
 */
export function InviteForm({ disabled }: { disabled?: boolean }) {
  const [pending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [manualLink, setManualLink] = React.useState<string | null>(null);

  const form = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "", role: "member" },
  });

  function onSubmit(values: InviteMemberInput) {
    setFormError(null);
    setManualLink(null);

    startTransition(async () => {
      const result = await inviteMemberAction(values);

      if (!result.ok) {
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          form.setError(field as keyof InviteMemberInput, { message });
        }
        setFormError(result.message ?? "Não foi possível enviar o convite.");
        return;
      }

      form.reset();

      if (result.emailDelivered) {
        toast.success(`Convite enviado para ${values.email}.`);
        return;
      }

      // O convite existe; só o e-mail não saiu. A frase precisa deixar claro
      // que a pessoa NÃO foi notificada — senão o admin fica esperando.
      toast.info("Convite criado, mas o e-mail não foi enviado.");
      setManualLink(result.inviteUrl ?? null);
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <FormError message={formError} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  E-mail
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="off"
                    placeholder="colega@empresa.com.br"
                    disabled={disabled || pending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="sm:w-44">
                <FormLabel className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  Papel
                </FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled || pending}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="member">{ROLE_LABELS.member}</SelectItem>
                    <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={disabled || pending}
            className="sm:mt-[26px]"
          >
            {pending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Convidar
          </Button>
        </div>

        {manualLink ? <ManualLink url={manualLink} /> : null}
      </form>
    </Form>
  );
}

/** Link para repassar à mão quando o envio automático não aconteceu. */
function ManualLink({ url }: { url: string }) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // `navigator.clipboard` exige contexto seguro e permissão. Falhando, o
      // link continua visível e selecionável no campo — que é o essencial.
      toast.error("Não foi possível copiar. Selecione o link manualmente.");
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/5 p-3">
      <p className="text-sm text-muted-foreground">
        O e-mail não foi enviado. Repasse este link para a pessoa convidada:
      </p>
      <div className="flex gap-2">
        <Input readOnly value={url} className="font-mono text-xs" />
        <Button type="button" variant="outline" size="icon" onClick={copy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          <span className="sr-only">Copiar link</span>
        </Button>
      </div>
    </div>
  );
}
