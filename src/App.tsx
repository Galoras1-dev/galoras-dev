import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePageTracker } from "@/hooks/usePageTracker";

// Loaded up front: the home page, login, and the two dashboards. Every other
// page is its own file, downloaded the first time someone opens it, so the
// dashboards no longer download the admin area, the photo background-removal
// model or Stripe before they can show anything.
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CoachDashboard from "./pages/coaching/CoachDashboard";

import CoachesAdmin from "./pages/admin/Coaches";

const CHUNK_RELOAD_KEY = "galoras_chunk_reload";

// A deploy replaces the page files, so a tab opened before it asks for files
// that no longer exist. Reload once to pick up the new version.
function lazyPage(load: () => Promise<{ default: ComponentType }>) {
  return lazy(() =>
    load()
      .then((mod) => {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
        return mod;
      })
      .catch((err) => {
        if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
          window.location.reload();
          return new Promise<never>(() => {});
        }
        throw err;
      })
  );
}

// Coaching
const CoachingDirectory = lazyPage(() => import("./pages/coaching/CoachingDirectory"));
const CoachProfile = lazyPage(() => import("./pages/coaching/CoachProfile"));
const WhyCoaching = lazyPage(() => import("./pages/coaching/WhyCoaching"));
const CoachMatching = lazyPage(() => import("./pages/coaching/CoachMatching"));
const CoachCompare = lazyPage(() => import("./pages/coaching/CoachCompare"));
const CoachProfileEdit = lazyPage(() => import("./pages/coaching/CoachProfileEdit"));
const CoachOnboarding = lazyPage(() => import("./pages/coaching/CoachOnboarding"));
const OnboardRedirect = lazyPage(() => import("./pages/coaching/OnboardRedirect"));

// Core pages
const About = lazyPage(() => import("./pages/About"));
const Contact = lazyPage(() => import("./pages/Contact"));
const Apply = lazyPage(() => import("./pages/Apply"));
const Pricing = lazyPage(() => import("./pages/Pricing"));
const BookingSuccess = lazyPage(() => import("./pages/BookingSuccess"));
const SessionRoom = lazyPage(() => import("./pages/SessionRoom"));
const SessionTranscript = lazyPage(() => import("./pages/SessionTranscript"));
const SubscriptionSuccess = lazyPage(() => import("./pages/SubscriptionSuccess"));
const Onboarding = lazyPage(() => import("./pages/Onboarding"));
const CoachSignup = lazyPage(() => import("./pages/CoachSignup"));

// Labs & Business
const Labs = lazyPage(() => import("./pages/Labs"));
const LabsArticle = lazyPage(() => import("./pages/LabsArticle"));
const LabsWatch = lazyPage(() => import("./pages/LabsWatch"));
const Enterprise = lazyPage(() => import("./pages/business/Enterprise"));
const ForYou = lazyPage(() => import("./pages/coaching/ForYou"));
const IsCoachingForMe = lazyPage(() => import("./pages/coaching/IsCoachingForMe"));
const Payments = lazyPage(() => import("./pages/legal/Payments"));

// Admin
const ImageGenerator = lazyPage(() => import("./pages/admin/ImageGenerator"));
const CoachCutoutManager = lazyPage(() => import("./pages/admin/CoachCutoutManager"));
const Applicants = lazyPage(() => import("./pages/admin/Applicants"));
const CoachesList = lazyPage(() => import("./pages/admin/CoachesList"));
const CoachEditorDetail = lazyPage(() => import("./pages/admin/CoachEditorDetail"));
const Bookings = lazyPage(() => import("@/pages/admin/Bookings"));
const ProductManager = lazyPage(() => import("@/pages/admin/ProductManager"));
const Portal = lazyPage(() => import("./pages/admin/Portal"));
const Leads = lazyPage(() => import("./pages/admin/Leads"));
const CompleteRegistration = lazyPage(() => import("./pages/CompleteRegistration"));

// Legal pages
const Terms = lazyPage(() => import("./pages/legal/Terms"));
const Privacy = lazyPage(() => import("./pages/legal/Privacy"));
const CookiePolicy = lazyPage(() => import("./pages/legal/CookiePolicy"));
const CoachAgreement = lazyPage(() => import("./pages/legal/CoachAgreement"));

const queryClient = new QueryClient();

const PAYMENT_GATE = import.meta.env.VITE_PAYMENT_GATE === "true";

function PaymentGate({ children }: { children: React.ReactNode }) {
  if (!PAYMENT_GATE) return <>{children}</>;
  return <NotFound />;
}

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const [state, setState] = useState<"loading" | "allowed" | "denied">("loading");

  useEffect(() => {
    (async () => {
      // The session already in the browser decides what to render, so the page
      // no longer waits on the Auth server. getUser() held the auth lock for a
      // full round trip and every other Supabase call queued behind it. The
      // data itself is still protected by RLS, which checks the token on every
      // request.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        setState("denied");
        return;
      }
      // Still ask the Auth server whether the session is valid, in the
      // background. Passing the token skips the auth lock, so this does not
      // hold up the page's own queries. A revoked session is sent to /login as
      // before; a network blip is not treated as a logout.
      supabase.auth.getUser(session.access_token).then(({ data, error }) => {
        if (!data.user && error?.status && error.status >= 400 && error.status < 500) {
          setState("denied");
        }
      });
      if (requireAdmin) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        setState(data ? "allowed" : "denied");
      } else {
        setState("allowed");
      }
    })();
  }, []);

  if (state === "loading") return null;
  if (state === "denied") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function CoachOnboardingRedirect() {
  const location = useLocation();
  return <Navigate to={`/coaching/onboarding${location.search}`} replace />;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function AppRoutes() {
  usePageTracker();
  return (
    <>
    <ScrollToTop />
    {/* Blank while a page's file downloads, as the route guard already is
        while it checks the session. */}
    <Suspense fallback={null}>
    <Routes>
          {/* Home */}
          <Route path="/" element={<Index />} />

          {/* B2C Routes — static routes MUST come before dynamic :coachId */}
          <Route path="/coaching" element={<PaymentGate><CoachingDirectory /></PaymentGate>} />
          <Route path="/coaching/matching" element={<PaymentGate><CoachMatching /></PaymentGate>} />
          <Route path="/coaching/compare" element={<PaymentGate><CoachCompare /></PaymentGate>} />
          <Route path="/coaching/how-it-works" element={<WhyCoaching />} />
          <Route path="/coaching/for-you" element={<ForYou />} />
          <Route path="/coaching/is-coaching-for-me" element={<IsCoachingForMe />} />
          <Route path="/coaching/why" element={<Navigate to="/coaching/how-it-works" replace />} />
          <Route path="/coaching/onboarding" element={<CoachOnboarding />} />
          <Route path="/coach/:slug" element={<PaymentGate><CoachProfile /></PaymentGate>} />
          {/* Preview by coach id, for the two people who need to see a profile
              before it is published: the coach it belongs to, and an admin.
              Same component as the live page - that is the point of it. The
              route carries no payment gate because a coach previewing their own
              unpublished page is not a visitor buying anything, and the edge
              function behind it refuses anyone else. */}
          <Route path="/coaching/preview/:coachId" element={<CoachProfile />} />
          <Route path="/coach/onboarding" element={<CoachOnboardingRedirect />} />
          <Route path="/onboard/:shortId" element={<OnboardRedirect />} />

          {/* Labs & Business Routes */}
          <Route path="/labs" element={<Labs />} />
          <Route path="/labs/watch/:slug" element={<LabsWatch />} />
          <Route path="/labs/:slug" element={<LabsArticle />} />
          <Route path="/enterprise" element={<Enterprise />} />
          <Route path="/legal/payments" element={<Payments />} />
          <Route path="/cookies" element={<CookiePolicy />} />
          {/* Old business URL kept as a redirect so existing links still land */}
          <Route path="/business/sport-of-business" element={<Navigate to="/enterprise" replace />} />

          {/* Core Routes */}
          <Route path="/apply" element={<Apply />} />
          <Route path="/session/:bookingId" element={<SessionRoom />} />
          <Route path="/transcripts/:transcriptId" element={<SessionTranscript />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Auth />} />

          {/* Onboarding */}
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

          {/* Coach signup */}
          <Route path="/coach-signup" element={<CoachSignup />} />

          {/* Payments & Subscriptions */}
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/complete-registration" element={<CompleteRegistration />} />
          <Route path="/booking-success" element={<BookingSuccess />} />
          <Route path="/subscription-success" element={<SubscriptionSuccess />} />

          {/* Dashboards */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route
            path="/coach-dashboard"
            element={
              <PaymentGate>
                <ProtectedRoute>
                  <CoachDashboard />
                </ProtectedRoute>
              </PaymentGate>
            }
          />
          <Route
            path="/coach-dashboard/edit"
            element={
              <PaymentGate>
                <ProtectedRoute>
                  <CoachProfileEdit />
                </ProtectedRoute>
              </PaymentGate>
            }
          />

          {/* Admin Portal (dev-only guard is inside the component) */}
          <Route
            path="/admin/portal"
            element={
              <PaymentGate>
                <ProtectedRoute requireAdmin>
                  <Portal />
                </ProtectedRoute>
              </PaymentGate>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/image-generator"
            element={
              <PaymentGate>
                <ProtectedRoute requireAdmin>
                  <ImageGenerator />
                </ProtectedRoute>
              </PaymentGate>
            }
          />
          <Route
            path="/admin/coach-cutouts"
            element={
              <PaymentGate>
                <ProtectedRoute requireAdmin>
                  <CoachCutoutManager />
                </ProtectedRoute>
              </PaymentGate>
            }
          />
          <Route
            path="/admin/applicants"
            element={
              <PaymentGate>
                <ProtectedRoute requireAdmin>
                  <Applicants />
                </ProtectedRoute>
              </PaymentGate>
            }
          />
          <Route
            path="/admin/coaches"
            element={
              <PaymentGate>
                <ProtectedRoute requireAdmin>
                  <CoachesList />
                </ProtectedRoute>
              </PaymentGate>
            }
          />
          <Route
            path="/admin/coaches/:id"
            element={
              <PaymentGate>
                <ProtectedRoute requireAdmin>
                  <CoachEditorDetail />
                </ProtectedRoute>
              </PaymentGate>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <PaymentGate>
                <ProtectedRoute requireAdmin>
                  <Bookings />
                </ProtectedRoute>
              </PaymentGate>
            }
          />
          <Route
            path="/admin/products"
            element={
              <PaymentGate>
                <ProtectedRoute requireAdmin>
                  <ProductManager />
                </ProtectedRoute>
              </PaymentGate>
            }
          />
          <Route
            path="/admin/leads"
            element={
              <PaymentGate>
                <ProtectedRoute requireAdmin>
                  <Leads />
                </ProtectedRoute>
              </PaymentGate>
            }
          />
          {/* Legal Routes */}
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/coach-agreement" element={<CoachAgreement />} />

          {/* Always last */}
          <Route path="*" element={<NotFound />} />
        </Routes>
    </Suspense>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
