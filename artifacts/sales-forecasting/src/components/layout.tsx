import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  BarChart2,
  Upload,
  Database,
  Brain,
  TrendingUp,
  GitCompare,
  Sun,
  Moon,
  Menu,
  X,
  Activity,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";

const navItems = [
  { href: "/", label: "Dashboard", icon: Activity },
  { href: "/upload", label: "Upload Dataset", icon: Upload },
  { href: "/compare", label: "Compare Models", icon: GitCompare },
];

const workflowItems = [
  { label: "1. Upload", icon: Database, href: "/upload" },
  { label: "2. Analyze", icon: BarChart2, href: null },
  { label: "3. Train Model", icon: Brain, href: null },
  { label: "4. View Results", icon: TrendingUp, href: null },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-200 
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:inset-auto`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary">
            <BarChart2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-sidebar-foreground leading-tight">Sales Forecasting</div>
            <div className="text-xs text-muted-foreground">ML Prediction System</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-2 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-widest">Navigation</p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            return (
              <Link key={href} href={href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer
                  ${active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </div>
              </Link>
            );
          })}

          <div className="pt-4">
            <p className="px-2 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-widest">Workflow</p>
            {workflowItems.map(({ label, icon: Icon, href }) =>
              href ? (
                <Link key={label} href={href}>
                  <div
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent cursor-pointer"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </div>
                </Link>
              ) : (
                <div key={label} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground opacity-40 cursor-default select-none">
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </div>
              )
            )}
          </div>
        </nav>

        {/* Theme toggle */}
        <div className="px-3 py-4 border-t border-sidebar-border shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-border flex items-center px-4 lg:px-6 gap-4 bg-card/50 backdrop-blur-sm sticky top-0 z-30 shrink-0">
          <Button variant="ghost" size="sm" className="lg:hidden -ml-2" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
          <div className="flex-1" />
          <div className="text-xs text-muted-foreground font-mono hidden sm:block">
            Sales Forecasting System v1.0
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
