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
          ─────────────────────────────────────────────────────────────────────
          It fires 3 seconds after a visitor stops moving - which on a page
          somebody is READING means 3 seconds after they arrive - and it is
          mounted in Layout, so it fired on every page in the site including a
          coach's own public profile.

          Two problems with that today, and the second is the serious one:

            1. It promises "personalised coach matches ... in seconds" and sends
               people to /signup. Galoras cannot deliver that yet. The directory
               is nearly empty and the public launch is January 2027.
            2. It covers the page a coach is sending their own audience to. A
               visitor arriving from a LinkedIn post about a named coach spends
               three seconds reading and then gets a signup wall over the top of
               that coach's proof.

          It is a good pattern for a marketplace with supply. Put it back at
          public launch, and not on coach profile pages. */}
      <CookieBanner />
    </div>
  );
}
