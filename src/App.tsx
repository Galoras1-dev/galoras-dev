import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePageTracker } from "@/ooks/usePageTracker";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Coaching
import { CoachingDirectory, CoachProfile, WhyCoaching } from "./pages/coaching";
import CoachMatching from "./pages/coaching/CoachMatching";
import CoachCompare from "./pages/coaching/CoachCompare";
import CoachDashboard from "./pages/coaching/CoachDashboard";
import CoachProfileEdit from "./pages/coaching/CoachProfileEdit";
import CoachOnboarding from "./pages/coaching/CoachOnboarding";
import OnboardRedirect from "./pages/coaching/OnboardRedirect";
import CoachesAdmin from "./pages/admin/Coaches";

// Core pages
import About from "./pages/About";
import Contact from "./pages/Contact";
import Apply from "./pages/Apply";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Pricing from "./pages/Pricing";
import BookingSuccess from "./pages/BookingSuccess";
import SessionRoom from "./pages/SessionRoom";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import Onboarding from "./pages/Onboarding";
import CoachSignup from "./pages/CoachSignup";

// Labs & Business
import Labs from "./pages/Labs";
import LabsArticle from "./pages/LabsArticle";
import SportOfBusiness from "./pages/business/SportOfBusiness";

// Admin
import ImageGenerator from "./pages/admin/ImageGenerator";
import CoachCutoutManager from "./pages/admin/CoachCutoutManager";
import Applicants from "./pages/admin/Applicants";
import CoachesList from "./pages/admin/CoachesList";
import CoachEditorDetail from "./pages/admin/CoachEditorDetail";
import Bookings from "@/pages/admin/Bookings";
import ProductManager from "@/pages/admin/ProductManager";
import Portal from "./pages/admin/Portal";
import Leads from "./pages/admin/Leads";
import CompleteRegistration from "./pages/CompleteRegistration";

// Legal pages
import Terms from "./pages/legal/Terms";
import Privacy from "./pages/legal/Privacy";
import CookiePolicy from "./pages/legal/CookiePolicy";
import CoachAgreement from "./pages/legal/CoachAgreement";

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setState("denied");
        return;
      }
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
    <Routes>
          {/* Home */}
          <Route path="/" element={<Index />} />

          {/* B2C Routes — static routes MUST come before dynamic :coachId */}
          <Route path="/coaching" element={<PaymentGate><CoachingDirectory /></PaymentGate>} />
          <Route path="/coaching/matching" element={<PaymentGate><CoachMatching /></PaymentGate>} />
          <Route path="/coaching/compare" element={<PaymentGate><CoachCompare /></PaymentGate>} />
          <Route path="/coaching/why" element={<WhyCoaching />} />
          <Route path="/coaching/onboarding" element={<CoachOnboarding />} />
          <Route path="/coach/:slug" element={<PaymentGate><CoachProfile /></PaymentGate>} />
          <Route path="/coach/onboarding" element={<CoachOnboardingRedirect />} />
          <Route path="/onboard/:shortId" element={<OnboardRedirect />} />

          {/* Labs & Business Routes */}
          <Route path="/labs" element={<Labs />} />
          <Route path="/labs/:slug" element={<LabsArticle />} />
          <Route path="/business/sport-of-business" element={<SportOfBusiness />} />

          {/* Core Routes */}
          <Route path="/apply" element={<Apply />} />
          <Route path="/session/:bookingId" element={<SessionRoom />} />
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
