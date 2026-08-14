"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { DealFormDialog } from "@/components/pipeline/deal-form-dialog";
import { Button } from "@/components/ui/button";
import type { Lead, User } from "@/types";

interface NewDealButtonProps {
  owners: User[];
  leads: Lead[];
  defaultOwnerId: string;
}

/** Só o botão e o dialog são client — a página segue Server Component. */
export function NewDealButton({
  owners,
  leads,
  defaultOwnerId,
}: NewDealButtonProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        Novo negócio
      </Button>

      <DealFormDialog
        open={open}
        onOpenChange={setOpen}
        owners={owners}
        leads={leads}
        defaultOwnerId={defaultOwnerId}
        defaultStage="novo_lead"
      />
    </>
  );
}
