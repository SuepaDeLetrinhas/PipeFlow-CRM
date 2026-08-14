"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createDealAction, updateDealAction } from "@/app/(app)/pipeline/actions";
import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEAL_STAGES, DEAL_STAGE_LABELS } from "@/lib/constants";
import { dealSchema, type DealFormValues } from "@/lib/validations/deal";
import type { Deal, DealStage, Lead, User } from "@/types";

/** Valor do <Select> para "sem lead" — Radix não aceita SelectItem com "". */
const NO_LEAD = "nenhum";

interface DealFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owners: User[];
  leads: Lead[];
  /** Ausente cria; presente edita. */
  deal?: Deal;
  defaultOwnerId: string;
  defaultStage: DealStage;
}

/** Campos opcionais chegam null do banco e o input controlado precisa de "". */
function toFormValues(
  deal: Deal | undefined,
  defaultOwnerId: string,
  defaultStage: DealStage,
): DealFormValues {
  return {
    title: deal?.title ?? "",
    // O input numérico é controlado por string; "" evita o "0" pré-digitado
    // que o usuário teria de apagar.
    value: deal ? String(deal.value) : "",
    stage: deal?.stage ?? defaultStage,
    due_date: deal?.due_date ?? "",
    lead_id: deal?.lead_id ?? "",
    owner_id: deal?.owner_id ?? defaultOwnerId,
  };
}

export function DealFormDialog({
  open,
  onOpenChange,
  owners,
  leads,
  deal,
  defaultOwnerId,
  defaultStage,
}: DealFormDialogProps) {
  const [pending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);
  const editing = Boolean(deal);

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: toFormValues(deal, defaultOwnerId, defaultStage),
  });

  // Reabrir precisa recomeçar do negócio atual: sem isso o formulário guardaria
  // o rascunho anterior, inclusive de outro negócio.
  React.useEffect(() => {
    if (open) {
      form.reset(toFormValues(deal, defaultOwnerId, defaultStage));
      setFormError(null);
    }
  }, [open, deal, defaultOwnerId, defaultStage, form]);

  function onSubmit(values: DealFormValues) {
    setFormError(null);

    startTransition(async () => {
      const result = deal
        ? await updateDealAction(deal.id, values)
        : await createDealAction(values);

      if (result.ok) {
        toast.success(result.message ?? "Negócio salvo.");
        onOpenChange(false);
        return;
      }

      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(field as keyof DealFormValues, { message });
      }
      setFormError(result.message ?? "Não foi possível salvar o negócio.");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar negócio" : "Novo negócio"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Atualize os dados e a etapa deste negócio."
              : "Cadastre uma oportunidade para acompanhar no pipeline."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormError message={formError} />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Integração ERP" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="25000"
                        {...field}
                        value={String(field.value ?? "")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>Opcional.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etapa</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DEAL_STAGES.map((stage) => (
                          <SelectItem key={stage} value={stage}>
                            {DEAL_STAGE_LABELS[stage]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="owner_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {owners.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="lead_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead vinculado</FormLabel>
                  <Select
                    value={field.value || NO_LEAD}
                    onValueChange={(value) =>
                      field.onChange(value === NO_LEAD ? "" : value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_LEAD}>Nenhum</SelectItem>
                      {leads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.company
                            ? `${lead.name} · ${lead.company}`
                            : lead.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                {editing ? "Salvar alterações" : "Criar negócio"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
