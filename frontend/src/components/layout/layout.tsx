import { useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  LayoutDashboard,
  Leaf,
  LogOut,
  Map,
  Menu,
  Settings,
  Sprout,
  Users,
  Waves,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { cn } from "@/utils/cn";
import { Badge } from "@/components/common/display";
import { AlertBell } from "@/components/alerts/alert-bell";
import { useAuth } from "@/context/AuthContext";
import heroImage from "@/assets/hero.png";

interface NavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
  adminOnly?: boolean;
}

const navigationItems: NavigationItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Mapa del terreno", path: "/map", icon: Map },
  { label: "Nodos", path: "/nodes", icon: Waves },
  { label: "Cultivos", path: "/crops", icon: Leaf },
  { label: "Estados", path: "/states", icon: Sprout },
  { label: "Alertas", path: "/alerts", icon: Bell },
  { label: "Historial", path: "/history", icon: FlaskConical },
  { label: "Reportes", path: "/reports", icon: Sprout },
  { label: "Configuración", path: "/settings", icon: Settings },
  { label: "Usuarios", path: "/users", icon: Users, adminOnly: true },
];

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  dev: "Desarrollo",
  components: "Componentes",
  map: "Mapa del terreno",
  nodes: "Nodos",
  crops: "Cultivos",
  states: "Estados",
  alerts: "Alertas",
  history: "Historial",
  reports: "Reportes",
  settings: "Configuración",
  users: "Usuarios",
  profile: "Mi perfil",
};

function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { user } = useAuth();
  const visibleItems = navigationItems.filter(
    (item) => !item.adminOnly || user?.role === "ADMIN",
  );

  return (
    <>
      <NavLink
        to="/dashboard"
        onClick={onNavigate}
        className={cn(
          "mb-7 flex items-center gap-3 px-4 text-white",
          collapsed ? "justify-center px-2" : "",
        )}
        aria-label="AgroSense, ir al dashboard"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-500">
          <Leaf aria-hidden="true" className="size-6" />
        </span>
        {!collapsed && (
          <span>
            <span className="block font-display text-lg font-bold">AgroSense</span>
            <span className="block text-[10px] uppercase tracking-[0.18em] text-white/60">
              Monitoreo de suelo
            </span>
          </span>
        )}
      </NavLink>
      <nav aria-label="Navegación principal" className="space-y-1">
        {visibleItems.map(({ label, path, icon: Icon, badge }) => (
          <NavLink
            key={path}
            to={path}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                "group flex min-h-11 items-center gap-3 border-l-[3px] px-3 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "",
                isActive
                  ? "border-primary-300 bg-primary-700 text-white"
                  : "border-transparent text-white/75 hover:bg-white/5 hover:text-white",
              )
            }
          >
            <Icon aria-hidden="true" className="size-5 shrink-0" />
            {!collapsed && <span className="flex-1">{label}</span>}
            {!collapsed && badge && (
              <Badge variant="danger" className="px-2 py-0.5">
                {badge}
              </Badge>
            )}
          </NavLink>
        ))}
      </nav>
      {!collapsed && (
        <div className="mt-auto rounded-md border border-white/10 bg-white/5 p-3 text-xs text-white/70">
          <p className="font-semibold text-white">Entorno de demostración</p>
          <p className="mt-1">Los módulos se habilitarán por fases.</p>
        </div>
      )}
    </>
  );
}

function Header({
  onMenu,
  collapsed,
  onToggleSidebar,
}: {
  onMenu: () => void;
  collapsed: boolean;
  onToggleSidebar: () => void;
}) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const pathParts = location.pathname.split("/").filter(Boolean);
  const currentLabel =
    routeLabels[pathParts[pathParts.length - 1] || "dashboard"] ||
    routeLabels[pathParts[0] || "dashboard"] ||
    "AgroSense";
  const [profileOpen, setProfileOpen] = useState(false);
  const initials =
    user?.name
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border-default bg-white/95 px-4 shadow-sm backdrop-blur sm:px-6">
      <button
        type="button"
        className="rounded-md p-2 text-text-secondary hover:bg-elevated lg:hidden"
        aria-label="Abrir navegación"
        onClick={onMenu}
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>
      <button
        type="button"
        className="hidden rounded-md p-2 text-text-secondary hover:bg-elevated lg:block"
        aria-label={collapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
        onClick={onToggleSidebar}
      >
        {collapsed ? (
          <ChevronRight aria-hidden="true" className="size-5" />
        ) : (
          <ChevronLeft aria-hidden="true" className="size-5" />
        )}
      </button>
      <div className="flex-1">
        <p className="text-xs text-text-muted">AgroSense /</p>
        <p className="text-sm font-semibold text-text-primary">{currentLabel}</p>
      </div>
      {user && <AlertBell />}
      <div className="relative">
        <button
          type="button"
          onClick={() => setProfileOpen((value) => !value)}
          aria-expanded={profileOpen}
          className="flex items-center gap-2 rounded-md p-1.5 hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <span className="grid size-8 place-items-center rounded-full bg-primary-100 text-xs font-semibold text-primary-900">
            {initials}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block max-w-36 truncate text-xs font-semibold text-text-primary">
              {user?.name}
            </span>
            <span className="block text-[10px] text-text-muted">{user?.email}</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="hidden size-4 text-text-muted sm:block"
          />
        </button>
        {profileOpen && (
          <div className="absolute right-0 top-12 z-40 w-52 rounded-md border border-border-default bg-white p-1 shadow-md">
            <Link
              to="/profile"
              onClick={() => setProfileOpen(false)}
              className="flex w-full items-center rounded px-3 py-2 text-left text-sm text-text-secondary hover:bg-base"
            >
              Mi perfil
            </Link>
            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);
                void logout();
              }}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-text-secondary hover:bg-base"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-base text-text-primary">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 hidden flex-col bg-dark px-3 py-5 transition-[width] duration-300 lg:flex",
            collapsed ? "w-[72px]" : "w-[260px]",
          )}
        >
          <SidebarContent collapsed={collapsed} />
        </aside>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-dark/50"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
            />
            <aside className="absolute inset-y-0 left-0 flex w-[min(280px,85vw)] flex-col bg-dark px-3 py-5 shadow-lg">
              <div className="mb-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded p-2 text-white hover:bg-white/10"
                  aria-label="Cerrar navegación"
                >
                  <X aria-hidden="true" className="size-5" />
                </button>
              </div>
              <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}
        <div
          className={cn(
            "min-w-0 flex-1 transition-[margin] duration-300",
            collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]",
          )}
        >
          <Header
            onMenu={() => setMobileOpen(true)}
            collapsed={collapsed}
            onToggleSidebar={() => setCollapsed((value) => !value)}
          />
          <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-primary-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-700 to-primary-500 opacity-95" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-screen"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="relative flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-lg bg-white/15">
            <Leaf aria-hidden="true" className="size-7" />
          </span>
          <span className="font-display text-2xl font-bold">AgroSense</span>
        </div>
        <div className="relative max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-100">
            Agricultura con datos
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight xl:text-5xl">
            Monitorea tu suelo, cultiva con datos.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-white/80">
            Conoce las condiciones de cada zona de tu terreno y toma decisiones informadas
            para tus cultivos.
          </p>
        </div>
        <p className="relative text-xs text-white/60">
          AgroSense · Monitoreo inteligente del suelo
        </p>
      </section>
      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
