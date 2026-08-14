import {
  KanbanSquare,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Navegação da área logada. Usada pela sidebar e pelo título da barra superior. */
export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/settings", label: "Configurações", icon: Settings },
];

/** `/leads/abc` casa com o item `/leads`. */
export function isActiveNavItem(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
