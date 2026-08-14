import Link from "next/link";

import { Logo } from "@/components/layout/logo";

const links = [
  { href: "/#funcionalidades", label: "Funcionalidades" },
  { href: "/#planos", label: "Planos" },
  { href: "/login", label: "Entrar" },
  { href: "/signup", label: "Criar conta" },
];

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-2">
          <Logo />
          <div>
            <p className="text-sm font-semibold tracking-tight">PipeFlow CRM</p>
            <p className="text-xs text-muted-foreground">
              O funil de vendas do seu time, sem planilha.
            </p>
          </div>
        </div>

        <nav
          className="flex flex-wrap gap-x-6 gap-y-2"
          aria-label="Links do rodapé"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} PipeFlow CRM
        </p>
      </div>
    </footer>
  );
}
