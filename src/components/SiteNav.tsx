/**
 * SiteNav — the foundry's top navigation, shared by every page.
 *
 * Editorial serif brand mark, brass underline hover states, and a compact
 * maker chip. Every item is a real link (keyboard navigable, focus-visible).
 */

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.svg";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";

const LINKS: { to: string; label: string }[] = [
  { to: "/", label: "Foundry" },
  { to: "/moulds", label: "Mould Rack" },
  { to: "/patterns", label: "Pattern Book" },
  { to: "/play/standalone", label: "Play" },
  { to: "/workshop", label: "My Cabinet" },
  { to: "/settings", label: "Settings" },
  { to: "/about", label: "About" },
];

export function SiteNav({ subtitle }: { subtitle?: string }) {
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }

  return (
    <header className="py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                aria-label="Foundry home menu"
              >
                <img src={logo} alt="" width={32} height={32} className="rounded-lg" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/" className="cursor-pointer">
                  Foundry home
                </Link>
              </DropdownMenuItem>
              {isAuthenticated && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="leading-tight">
            <Link to="/" className="block">
              <p className="small-caps text-xs text-muted-foreground">
                The Cartridge Foundry
              </p>
              {subtitle ? (
                <p className="font-pressing text-[10px] tracking-[0.2em] text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
            </Link>
          </div>
        </div>

        <nav aria-label="Primary" className="flex flex-wrap items-center gap-1">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                cn(
                  "small-caps rounded-md px-3 py-2 text-sm transition-colors",
                  "hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary",
                  isActive
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground",
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
          {isAuthenticated ? (
            <span className="small-caps ml-2 hidden text-xs text-muted-foreground lg:block">
              maker: {user?.name || user?.email}
            </span>
          ) : (
            <Button size="sm" className="ml-2" onClick={() => navigate("/auth?returnTo=/studio")}>
              Open a Studio
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
