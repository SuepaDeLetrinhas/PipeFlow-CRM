import Link from "next/link";
import { UserX } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

export default function LeadNotFound() {
  return (
    <EmptyState
      icon={UserX}
      title="Lead não encontrado"
      description="Este lead não existe ou pertence a outro workspace."
      action={
        <Button asChild>
          <Link href="/leads">Voltar para leads</Link>
        </Button>
      }
      className="mt-10"
    />
  );
}
