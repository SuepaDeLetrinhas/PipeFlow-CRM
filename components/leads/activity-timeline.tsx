import { CalendarDays, Mail, PhoneCall, StickyNote } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import type { Activity, ActivityType, User } from "@/types";

const TYPE_ICONS: Record<ActivityType, LucideIcon> = {
  call: PhoneCall,
  email: Mail,
  meeting: CalendarDays,
  note: StickyNote,
};

const TYPE_CLASSES: Record<ActivityType, string> = {
  call: "bg-primary/10 text-primary",
  email: "bg-warning-muted text-warning-foreground",
  meeting: "bg-success-muted text-success-foreground",
  note: "bg-muted text-muted-foreground",
};

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Agrupa por dia civil preservando a ordem já definida em `getActivitiesByLead`. */
function groupByDay(activities: Activity[]) {
  const groups = new Map<string, Activity[]>();

  for (const activity of activities) {
    const day = activity.occurred_at.slice(0, 10);
    const bucket = groups.get(day);

    if (bucket) {
      bucket.push(activity);
    } else {
      groups.set(day, [activity]);
    }
  }

  // `Array.from` em vez de espalhar o iterador: o target do tsconfig é ES5.
  return Array.from(groups.entries());
}

interface ActivityTimelineProps {
  activities: Activity[];
  authors: Map<string, User>;
}

export function ActivityTimeline({
  activities,
  authors,
}: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <EmptyState
        icon={StickyNote}
        title="Nenhuma atividade registrada"
        description="Registre ligações, e-mails, reuniões e notas para manter o histórico do relacionamento."
      />
    );
  }

  return (
    <div className="space-y-6">
      {groupByDay(activities).map(([day, dayActivities]) => (
        <section key={day}>
          <h3 className="pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {formatDate(day, "long")}
          </h3>

          <ol className="space-y-3">
            {dayActivities.map((activity) => {
              const Icon = TYPE_ICONS[activity.type];
              const author = authors.get(activity.author_id);

              return (
                <li
                  key={activity.id}
                  className="flex gap-3 rounded-lg border p-3"
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      TYPE_CLASSES[activity.type],
                    )}
                    aria-hidden
                  >
                    <Icon className="size-4" />
                  </span>

                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-x-2 text-sm">
                      <span className="font-medium">
                        {ACTIVITY_TYPE_LABELS[activity.type]}
                      </span>
                      <span className="text-metric text-xs text-muted-foreground">
                        {timeFormatter.format(new Date(activity.occurred_at))}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                    {author ? (
                      <p className="text-xs text-muted-foreground">
                        por {author.full_name}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
