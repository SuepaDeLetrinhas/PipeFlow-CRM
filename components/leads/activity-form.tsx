"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createActivityAction } from "@/app/(app)/leads/actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { activitySchema, type ActivityInput } from "@/lib/validations/lead";

interface ActivityFormProps {
  leadId: string;
}

export function ActivityForm({ leadId }: ActivityFormProps) {
  const [pending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<ActivityInput>({
    resolver: zodResolver(activitySchema),
    defaultValues: { lead_id: leadId, type: "call", description: "" },
  });

  function onSubmit(values: ActivityInput) {
    setFormError(null);

    startTransition(async () => {
      const result = await createActivityAction(values);

      if (result.ok) {
        toast.success(result.message ?? "Atividade registrada.");
        // Mantém o tipo escolhido: quem registra três ligações seguidas não
        // deveria reselecionar "Ligação" a cada uma.
        form.reset({ ...values, description: "" });
        return;
      }

      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(field as keyof ActivityInput, { message });
      }
      setFormError(result.message ?? "Não foi possível registrar a atividade.");
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3"
        noValidate
      >
        <FormError message={formError} />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(ACTIVITY_TYPE_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="O que aconteceu nesse contato?"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Registrar atividade
        </Button>
      </form>
    </Form>
  );
}
