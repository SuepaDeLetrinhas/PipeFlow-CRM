"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isActiveNavItem, navItems } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  collapsed?: boolean;
  /** Fecha o drawer no mobile após navegar. */
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1" aria-label="Navegação principal">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActiveNavItem(pathname, href);

        const link = (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className={cn(collapsed && "sr-only")}>{label}</span>
          </Link>
        );

        if (!collapsed) return link;

        return (
          <Tooltip key={href} delayDuration={0}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}
