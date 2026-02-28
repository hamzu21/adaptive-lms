import { useState, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, LogOut, Menu } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  navItems: NavItem[];
}

const SidebarContent = ({
  navItems,
  location,
  profile,
  role,
  onSignOut,
  onNavClick,
}: {
  navItems: NavItem[];
  location: ReturnType<typeof useLocation>;
  profile: { full_name: string; avatar_url: string | null } | null;
  role: string | null;
  onSignOut: () => void;
  onNavClick?: () => void;
}) => (
  <>
    <div className="p-5 border-b border-border">
      <Link to="/" className="flex items-center gap-2 font-bold text-lg">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-primary-foreground" />
        </div>
        <span>AdaptLearn</span>
      </Link>
    </div>

    <nav className="flex-1 p-4 space-y-1">
      {navItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          onClick={onNavClick}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            location.pathname === item.href
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
    </nav>

    <div className="p-4 border-t border-border">
      <Link
        to={`/${role}/profile`}
        onClick={onNavClick}
        className="flex items-center gap-3 mb-3 rounded-lg px-1 py-1.5 -mx-1 hover:bg-secondary transition-colors cursor-pointer"
      >
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
          {profile?.full_name?.charAt(0) || "U"}
        </div>
        <div>
          <p className="text-sm font-medium">{profile?.full_name || "User"}</p>
          <p className="text-xs text-muted-foreground capitalize">{role || "user"}</p>
        </div>
      </Link>
      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={onSignOut}>
        <LogOut className="w-4 h-4 mr-2" /> Sign Out
      </Button>
    </div>
  </>
);

const DashboardLayout = ({ children, title, navItems }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const swipeDirection = useRef<number>(0); // -1 = left (next), 1 = right (prev)
  const prevPathRef = useRef(location.pathname);

  // Swipe gesture state
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;

    // Only trigger if horizontal swipe > 80px and more horizontal than vertical
    if (Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx)) return;

    const currentIndex = navItems.findIndex((item) => item.href === location.pathname);
    if (currentIndex === -1) return;

    const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < navItems.length) {
      swipeDirection.current = dx < 0 ? -1 : 1;
      navigate(navItems[nextIndex].href);
    }
  }, [navItems, location.pathname, navigate]);

  // Track direction for non-swipe navigations (tab clicks)
  if (prevPathRef.current !== location.pathname) {
    const prevIndex = navItems.findIndex((i) => i.href === prevPathRef.current);
    const currIndex = navItems.findIndex((i) => i.href === location.pathname);
    if (swipeDirection.current === 0 && prevIndex !== -1 && currIndex !== -1) {
      swipeDirection.current = currIndex > prevIndex ? -1 : 1;
    }
    prevPathRef.current = location.pathname;
  }

  const direction = swipeDirection.current;
  // Reset after capturing
  const resetDirection = () => { swipeDirection.current = 0; };

  const handleSignOut = async () => {
    setMobileOpen(false);
    await signOut();
    navigate("/");
  };

  const sharedProps = { navItems, location, profile, role, onSignOut: handleSignOut };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border">
        <SidebarContent {...sharedProps} />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 flex flex-col">
                <SidebarContent {...sharedProps} onNavClick={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-bold">{title}</h1>
          </div>
          <NotificationBell />
        </header>
        <main
          className="flex-1 overflow-y-auto pb-20 lg:pb-6"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence mode="wait" initial={false} onExitComplete={resetDirection}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: direction * -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * 30 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="p-4 sm:p-6"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-center justify-around h-16 safe-area-pb">
          {navItems.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors",
                location.pathname === item.href
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <span className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full transition-colors",
                location.pathname === item.href && "bg-primary/10"
              )}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default DashboardLayout;
