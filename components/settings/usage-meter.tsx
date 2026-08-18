/**
 * Barra de uso contra o teto do plano.
 *
 * Generaliza o `SeatMeter` que vivia dentro de `/settings`: a página de
 * cobrança precisa da mesma barra para leads, e duplicá-la deixaria dois
 * medidores que divergem no dia em que um deles mudar de cor.
 *
 * `limit: null` é o Pro — sem teto, não há proporção a desenhar, e uma barra
 * cheia ou vazia mentiria igual. Nesse caso mostra só o número absoluto.
 */
export function UsageMeter({
  label,
  used,
  limit,
  hint,
}: {
  label: string;
  used: number;
  /** Teto do plano. `null` no Pro, que não tem. */
  limit: number | null;
  hint?: string;
}) {
  const ratio = limit ? Math.min(used / limit, 1) : 0;
  const full = limit !== null && used >= limit;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-medium">{label}</p>

        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          {limit === null ? `${used} · sem limite` : `${used}/${limit}`}
        </p>
      </div>

      {limit === null ? null : (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={full ? "h-full bg-warning" : "h-full bg-primary"}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      )}

      {hint ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
