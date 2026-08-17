"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { createWorkspaceAction } from "@/app/(app)/workspaces/actions";
import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  createWorkspaceSchema,
  type CreateWorkspaceInput,
} from "@/lib/validations/workspace";

export function OnboardingForm() {
  const [pending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<CreateWorkspaceInput>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { name: "" },
  });

  function onSubmit(values: CreateWorkspaceInput) {
    setFormError(null);

    startTransition(async () => {
      const result = await createWorkspaceAction(values);

      // Em caso de sucesso a action redireciona e nada abaixo executa.
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(field as keyof CreateWorkspaceInput, { message });
      }
      setFormError(result.message ?? "Não foi possível criar o workspace.");
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormError message={formError} />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da empresa</FormLabel>
              <FormControl>
                <Input
                  autoFocus
                  autoComplete="organization"
                  placeholder="Lumiar Digital"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Aparece no topo da barra lateral. Dá para mudar depois.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Criar e continuar
          {pending ? null : <ArrowRight className="size-4" />}
        </Button>
      </form>
    </Form>
  );
}
