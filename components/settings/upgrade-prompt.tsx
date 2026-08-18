import { Sparkles } from "lucide-react";

import { UpgradeButton } from "@/components/settings/billing-actions";

/**
 * Aviso de teto do Free com o caminho para assinar ali mesmo.
 *
 * Existe porque a mensagem de limite e o botão de assinar moravam em telas
 * diferentes: quem batia no teto em `/leads` lia "faça upgrade para o Pro" e
 * tinha de descobrir sozinho que o botão estava em `/settings`.
 *
 * Server Component — só o `UpgradeButton` que ele embrulha é cliente. Assim a
 * decisão de mostrar (que depende de plano, papel e contagem, todos vindos do
 * servidor) não precisa atravessar a fronteira como props de um componente
 * cliente.
 *
 * **Quem chama decide se aparece.** Este componente não consulta plano nem
 * papel: as duas telas que o usam já têm essa informação em mãos por outros
 * motivos, e buscá-la de novo aqui seria um round-trip a mais por render.
 */
export function UpgradePrompt({
  title,
  description,
  canUpgrade,
}: {
  title: string;
  description: string;
  /**
   * Só admin vê o botão. `createCheckoutSession()` recusa membro comum via
   * `requireAdmin()` — mostrar um botão que leva a uma recusa é pior do que
   * não mostrar botão nenhum. Para membro comum o texto de `description` deve
   * apontar o administrador, como já faz o aceite de convite.
   */
  canUpgrade: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-warning/40 bg-warning/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted">
          <Sparkles className="size-4 text-muted-foreground" />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {canUpgrade ? (
        <div className="shrink-0">
          <UpgradeButton />
        </div>
      ) : null}
    </div>
  );
}
