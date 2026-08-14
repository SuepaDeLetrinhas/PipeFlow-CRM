"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { LeadFormDialog } from "@/components/leads/lead-form-dialog";
import { Button } from "@/components/ui/button";
import type { User } from "@/types";

interface NewLeadButtonProps {
  owners: User[];
  defaultOwnerId: string;
}

/**
 * Só o botão e o dialog são client — a tabela e a página seguem Server
 * Components, então a lista não vai para o bundle do navegador.
 */
export function NewLeadButton({ owners, defaultOwnerId }: NewLeadButtonProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        Novo lead
      </Button>

      <LeadFormDialog
        open={open}
        onOpenChange={setOpen}
        owners={owners}
        defaultOwnerId={defaultOwnerId}
      />
    </>
  );
}
