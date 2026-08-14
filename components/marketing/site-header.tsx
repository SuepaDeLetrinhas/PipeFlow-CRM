"use client";

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const sections = [
  { href: "/#funcionalidades", label: "Funcionalidades" },
  { href: "/#planos", label: "Planos" },
];

export function SiteHeader() {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Logo />
          <span className="text-base font-semibold tracking-tight">
            PipeFlow
          </span>
        </Link>

        <nav
          className="ml-6 hidden items-center gap-1 md:flex"
          aria-label="Seções do site"
        >
          {sections.map((section) => (
            <Button key={section.href} asChild variant="ghost" size="sm">
              <Link href={section.href}>{section.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          <div className="hidden items-center gap-2 sm:flex">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Começar grátis</Link>
            </Button>
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Abrir menu"
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">
                Navegue pelas seções do site e acesse sua conta.
              </SheetDescription>

              <div className="mt-6 flex flex-col gap-1">
                {sections.map((section) => (
                  <Link
                    key={section.href}
                    href={section.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {section.label}
                  </Link>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-2 border-t pt-6">
                <Button asChild variant="outline" onClick={() => setOpen(false)}>
                  <Link href="/login">Entrar</Link>
                </Button>
                <Button asChild onClick={() => setOpen(false)}>
                  <Link href="/signup">Começar grátis</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
