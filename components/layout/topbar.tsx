"use client";

import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { isActiveNavItem, navItems } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { User } from "@/types";

interface TopbarProps {
  user: User;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenMobileNav: () => void;
}

export function Topbar({
  user,
  collapsed,
  onToggleCollapsed,
  onOpenMobileNav,
}: TopbarProps) {
  const pathname = usePathname();
  const current = navItems.find((item) => isActiveNavItem(pathname, item.href));

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenMobileNav}
        aria-label="Abrir menu"
      >
        <Menu />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="hidden md:inline-flex"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
      </Button>

      <span className="truncate text-sm font-semibold">
        {current?.label ?? "PipeFlow"}
      </span>

      <div className="ml-auto flex items-center gap-1">
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          {/* Busca real chega com a listagem de leads (M4). */}
          <Input
            type="search"
            disabled
            placeholder="Buscar leads e negócios…"
            aria-label="Buscar"
            title="A busca entra junto com a listagem de leads"
            className="h-9 w-56 pl-8 lg:w-72"
          />
        </div>
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
