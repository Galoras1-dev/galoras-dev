import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown, User, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

import { supabase, signOutAndClear } from "@/integrations/supabase/client";

const navItems = [
  { name: "Home", href: "/" },
  {
        name: "Coaching Exchange",
        href: "/coaching",
        children: [
          { name: "Find a Coach", href: "/coaching", description: "Browse our vetted coaches" },
                // { name: "How Matching Works", href: "/coaching/matching", description: "AI-powered coach matching" }, // hidden — Phase 3, pending sign-off
          { name: "Why Coaching", href: "/coaching/why", description: "The power of coaching" },
              ],
  },
  { name: "About", href: "/about" },
  ];

export function Navbar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isCoach, setIsCoach] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

  useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                setIsLoggedIn(!!session?.user);
                if (session?.user) {
                          checkRoles(session.user.id);
                } else {
                          setIsAdmin(false);
                          setIsCoach(false);
                }
        });

                supabase.auth.getSession().then(({ data: { session } }) => {
                        setIsLoggedIn(!!session?.user);
                        if (session?.user) {
                                  checkRoles(session.user.id);
                        }
                });

                return () => subscription.unsubscribe();
  }, []);

  const checkRoles = async (userId: string) => {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);

        const roles = data?.map(r => r.role) || [];
        setIsAdmin(roles.includes("admin"));

        // Coach status comes from profiles.user_type — the single source of truth
        // that login routing also uses (a user_roles 'coach' row is never written).
        const { data: prof } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("id", userId)
          .maybeSingle();
        setIsCoach(prof?.user_type === "coach");
  };

  const handleSignOut = () => signOutAndClear();

  return (
        <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
              <nav className="container-wide">
                      <div className="flex items-center justify-between h-16 md:h-20">
                        {/* Logo */}
                                <Link to="/" className="flex items-center gap-2">
                                            <img src="/galoras-logo.jpg" alt="Galoras" style={{ height: "40px", width: "auto" }} />
                                </Link>Link>
                      
                        {/* Desktop Navigation */}
                                <div className="hidden lg:flex items-center gap-1">
                                            <NavigationMenu>
                                                          <NavigationMenuList>
                                                            {navItems.map((item) => (
                            <NavigationMenuItem key={item.name}>
                              {item.children ? (
                                                    <>
                                                                            <NavigationMenuTrigger
                                                                                                        className={cn(
                                                                                                                                      "bg-transparent hover:bg-muted/50 data-[state=open]:bg-muted/50",
                                                                                                                                      location.pathname.startsWith(item.href) && "text-primary"
                                                                                                                                    )}
                                                                                                      >
                                                                              {item.name}
                                                                              </NavigationMenuTrigger>NavigationMenuTrigger>
                                                                            <NavigationMenuContent>
                                                                                                      <ul className="grid w-[400px] gap-1 p-4">
                                                                                                        {item.children.map((child) => (
                                                                                    <li key={child.name}>
                                                                                                                    <NavigationMenuLink asChild>
                                                                                                                                                      <Link
                                                                                                                                                                                            to={child.href}
                                                                                                                                                                                            className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                                                                                                                                                                          >
                                                                                                                                                                                          <div className="text-sm font-medium leading-none">{child.name}</div>div>
                                                                                                                                                                                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">
                                                                                                                                                                                                                                {child.description}
                                                                                                                                                                                                                              </p>p>
                                                                                                                                                        </Link>Link>
                                                                                                                      </NavigationMenuLink>NavigationMenuLink>
                                                                                      </li>li>
                                                                                  ))}
                                                                                                        </ul>ul>
                                                                              </NavigationMenuContent>NavigationMenuContent>
                                                    </>>
                                                  ) : (
                                                    <NavigationMenuLink asChild>
                                                                            <Link
                                                                                                        to={item.href}
                                                                                                        className={cn(
                                                                                                                                      "group inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50",
                                                                                                                                      location.pathname === item.href && "text-primary"
                                                                                                                                    )}
                                                                                                      >
                                                                              {item.name}
                                                                              </Link>Link>
                                                    </NavigationMenuLink>NavigationMenuLink>
                                                )}
                            </NavigationMenuItem>NavigationMenuItem>
                          ))}
                                                          </NavigationMenuList>NavigationMenuList>
                                            </NavigationMenu>NavigationMenu>
                                </div>div>
                      
                        {/* Right Side Actions */}
                                <div className="hidden lg:flex items-center gap-3">
                                  {!isCoach && (
                        <Button variant="ghost" size="sm" asChild>
                                        <Link to="/apply">Join as a Coach</Link>Link>
                        </Button>Button>
                                            )}
                                  {isLoggedIn ? (
                        <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                                          <Button variant="outline" size="icon">
                                                                              <User className="h-4 w-4" />
                                                          </Button>Button>
                                        </DropdownMenuTrigger>DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                                          <DropdownMenuItem asChild>
                                                                              <Link to={isCoach ? "/coach-dashboard" : "/dashboard"}>
                                                                                                    <User className="mr-2 h-4 w-4" />
                                                                                                    Dashboard
                                                                              </Link>Link>
                                                          </DropdownMenuItem>DropdownMenuItem>
                                          {isAdmin && (
                                              <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem asChild>
                                                                                            <Link to="/admin/applicants">
                                                                                                                      <ShieldCheck className="mr-2 h-4 w-4" />
                                                                                                                      Coach Approval
                                                                                              </Link>Link>
                                                                    </DropdownMenuItem>DropdownMenuItem>
                                              </>>
                                            )}
                                                          <DropdownMenuSeparator />
                                                          <DropdownMenuItem onSelect={(e) => {
                                              e.preventDefault();
                                              handleSignOut();
                        }}>
                                                                              <LogOut className="mr-2 h-4 w-4" />
                                                                              Sign Out
                                                          </DropdownMenuItem>DropdownMenuItem>
                                        </DropdownMenuContent>DropdownMenuContent>
                        </DropdownMenu>DropdownMenu>
                      ) : (
                        <>
                                        <Button variant="ghost" size="sm" asChild>
                                                          <Link to="/login">Log In</Link>Link>
                                        </Button>Button>
                                        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                                                          <Link to="/signup">Get Started</Link>Link>
                                        </Button>Button>
                        </>>
                      )}
                                </div>div>
                      
                        {/* Mobile Menu Button */}
                                <button
                                              className="lg:hidden p-2 text-foreground"
                                              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                              aria-label="Toggle menu"
                                            >
                                  {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                                </button>button>
                      </div>div>
              
                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="lg:hidden py-4 border-t border-border/50 animate-fade-in">
                                <div className="space-y-1">
                                  {navItems.map((item) => (
                                      <div key={item.name}>
                                        {item.children ? (
                                                            <DropdownMenu>
                                                                                  <DropdownMenuTrigger className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md hover:bg-muted">
                                                                                    {item.name}
                                                                                                          <ChevronDown className="h-4 w-4" />
                                                                                    </DropdownMenuTrigger>DropdownMenuTrigger>
                                                                                  <DropdownMenuContent className="w-full">
                                                                                    {item.children.map((child) => (
                                                                                        <DropdownMenuItem key={child.name} asChild>
                                                                                                                    <Link
                                                                                                                                                    to={child.href}
                                                                                                                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                                                                                                                  >
                                                                                                                      {child.name}
                                                                                                                      </Link>Link>
                                                                                          </DropdownMenuItem>DropdownMenuItem>
                                                                                      ))}
                                                                                    </DropdownMenuContent>DropdownMenuContent>
                                                            </DropdownMenu>DropdownMenu>
                                                          ) : (
                                                            <Link
                                                                                    to={item.href}
                                                                                    className={cn(
                                                                                                              "block px-3 py-2 text-sm font-medium rounded-md hover:bg-muted",
                                                                                                              location.pathname === item.href && "text-primary bg-muted"
                                                                                                            )}
                                                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                                                  >
                                                              {item.name}
                                                            </Link>Link>
                                                        )}
                                      </div>div>
                                    ))}
                                              <div className="pt-4 mt-4 border-t border-border space-y-2">
                                                {!isCoach && (
                                        <Link
                                                              to="/apply"
                                                              className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-muted"
                                                              onClick={() => setIsMobileMenuOpen(false)}
                                                            >
                                                            Join as a Coach
                                        </Link>Link>
                                                              )}
                                                {isLoggedIn ? (
                                        <>
                                                            <Link
                                                                                    to={isCoach ? "/coach-dashboard" : "/dashboard"}
                                                                                    className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-muted"
                                                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                                                  >
                                                                                  Dashboard
                                                            </Link>Link>
                                          {isAdmin && (
                                                                <Link
                                                                                          to="/admin/applicants"
                                                                                          className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted text-primary"
                                                                                          onClick={() => setIsMobileMenuOpen(false)}
                                                                                        >
                                                                                        <ShieldCheck className="h-4 w-4" />
                                                                                        Coach Approval
                                                                </Link>Link>
                                                            )}
                                                            <button
                                                                                    type="button"
                                                                                    className="w-full text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-muted"
                                                                                    onClick={() => {
                                                                                                              setIsMobileMenuOpen(false);
                                                                                                              handleSignOut();
                                                                                      }}
                                                                                  >
                                                                                  Sign Out
                                                            </button>button>
                                        </>>
                                      ) : (
                                        <>
                                                            <Link
                                                                                    to="/login"
                                                                                    className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-muted"
                                                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                                                  >
                                                                                  Log In
                                                            </Link>Link>
                                                            <div className="px-3">
                                                                                  <Button className="w-full bg-primary text-primary-foreground" asChild>
                                                                                                          <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                                                                                                                                    Get Started
                                                                                                            </Link>Link>
                                                                                    </Button>Button>
                                                            </div>div>
                                        </>>
                                      )}
                                              </div>div>
                                </div>div>
                    </div>div>
                      )}
              </nav>nav>
        </header>header>
      );
}</></></></></></header>
