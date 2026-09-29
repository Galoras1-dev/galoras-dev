import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { CookieBanner } from "@/components/legal/CookieBanner";

interface LayoutProps {
  children: ReactNode;
  hideNavbar?: boolean;
  hideFooter?: boolean;
}

export function Layout({ children, hideNavbar = false, hideFooter = false }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {!hideNavbar && <Navbar />}
      <main className={!hideNavbar ? "pt-16 md:pt-20" : ""}>
        {children}
      </main>
      {!hideFooter && <Footer />}
      {/* IdlePopup is deliberately NOT mounted before public launch.
          It fires 3 seconds after a visitor stops moving - which on a page
          somebody is READING means 3 seconds after they arrive - and it was
          mounted here, so it covered EVERY page including a coach's own public
          profile. It also promises "personalised coach matches in seconds" and
          sends people to /signup, neither of which Galoras can deliver yet.
          Put it back at public launch, and never on coach profiles. */}
      <CookieBanner />
    </div>
  );
}
