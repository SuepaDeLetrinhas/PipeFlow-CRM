"use client";

import Link from "next/link";
import { LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";
import type { User } from "@/types";

const themeOptions = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

export function UserMenu({ user }: { user: User }) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={`Menu de ${user.full_name}`}
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials(user.full_name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{user.full_name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="gap-2">
          <Link href="/settings">
            <Settings className="size-4" />
            Configurações
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <Sun className="size-4 dark:hidden" />
            <Moon className="hidden size-4 dark:block" />
            Tema
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              {themeOptions.map(({ value, label, icon: Icon }) => (
                <DropdownMenuItem
                  key={value}
                  onSelect={() => setTheme(value)}
                  className="gap-2"
                >
                  <Icon className="size-4" />
                  {label}
                  {theme === value ? (
                    <span className="ml-auto text-xs text-muted-foreground">
                      •
                    </span>
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* Logout de verdade entra junto com o Supabase Auth. */}
        <DropdownMenuItem className="gap-2 text-muted-foreground">
          <LogOut className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
