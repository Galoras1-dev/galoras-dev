import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase, signOutAndClear } from "@/integrations/supabase/client";
import { LayoutGrid, Users, BookOpen, Package, LogOut, ChevronRight, Gauge, MessageSquare, Home } from "lucide-react";

const NAV = [
  { label: "Portal",     href: "/admin/portal",     icon: Gauge },
  { label: "Applicants", href: "/admin/applicants", icon: Users },
  { label: "Coaches",    href: "/admin/coaches",    icon: LayoutGrid },
  { label: "Products",   href: "/admin/products",   icon: Package },
  { label: "Bookings",   href: "/admin/bookings",   icon: BookOpen },
  { label: "Leads",      href: "/admin/leads",      icon: MessageSquare },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  /** Current page title shown in top bar */
  title?: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("");
  const current = typeof window !== "undefined" ? window.location.pathname : "";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate("/login"); return; }
      setAdminName(session.user.email ?? "Admin");
    });
  }, [navigate]);

  const handleLogout = () => signOutAndClear();

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-zinc-800 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-zinc-800">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-white font-display font-black text-lg tracking-tight">
              galoras
            </span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mt-0.5">
              Admin
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 px-3">
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = current === href || current.startsWith(href + "/");
            return (
              <Link
                key={href}
                to={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
                {active && <ChevronRight className="h-3 w-3 ml-auto opacity-50" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 truncate mb-2">{adminName}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-zinc-800 flex items-center px-6 shrink-0">
          <h1 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
            {title ?? "Admin"}
          </h1>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:border-zinc-500 hover:bg-zinc-900 transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            Back to site
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
