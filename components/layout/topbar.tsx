"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { isActiveNavItem, navItems } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import type { User } from "@/types";

interface TopbarProps {
  user: User;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenMobileNav: () => void;
  /** Some com o botão de recolher onde a sidebar é trilho fixo (md–lg). */
  hideToggle?: boolean;
}

export function Topbar({
  user,
  collapsed,
  onToggleCollapsed,
  onOpenMobileNav,
  hideToggle = false,
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
        className={hideToggle ? "hidden" : "hidden md:inline-flex"}
        onClick={onToggleCollapsed}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
      </Button>

      <span className="truncate text-sm font-semibold">
        {current?.label ?? "PipeFlow"}
      </span>

      <div className="ml-auto flex items-center gap-1">
        {/*
          Atalho para a busca, não um campo de busca.

          O placeholder desabilitado que morava aqui prometia "buscar leads e
          negócios" desde antes de a busca existir; hoje ela existe, mas em
          `/leads`, com filtros de status, responsável e período que não cabem
          numa caixa da topbar. Um segundo campo que só soubesse fazer menos
          seria pior que um link para o que faz tudo.

          Vira só ícone abaixo de `sm`: ao lado do tema e do menu do usuário,
          o rótulo estourava a barra num telefone estreito.
        */}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground"
        >
          <Link href="/leads">
            <Search className="size-4" />
            <span className="hidden sm:inline">Buscar</span>
            <span className="sr-only sm:hidden">Buscar leads</span>
          </Link>
        </Button>
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
