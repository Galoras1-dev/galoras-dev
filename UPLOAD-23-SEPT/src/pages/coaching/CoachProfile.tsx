import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout } from "@/components/layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Calendar, MessageCircle, Package, Linkedin } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/hooks/useAuth";
import { ContactModal } from "@/components/coaching/ContactModal";
import { ProductCard, CoachProduct } from "@/components/coaching/ProductCard";
import { useProductTypes } from "@/hooks/useProductTypes";
import { CheckoutModal } from "@/components/coaching/CheckoutModal";
import { RequestModal } from "@/components/coaching/RequestModal";
import { EnterpriseRequestModal } from "@/components/coaching/EnterpriseRequestModal";
import { loadStripe } from "@stripe/stripe-js";
import { useToast } from "@/hooks/use-toast";
import { GALORAS_PLATFORM_PRODUCTS } from "@/components/coaching/platformProducts";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "");

type CoachProfileData = {
  id: string;
  slug: string | null;
  display_name: string | null;
  headline: string | null;
  // The onboarding wizard collects a bio and a LinkedIn URL and this page never
  // showed either. A coach who completed all five steps got a page with their
  // name on it and nothing else they had written.
  bio: string | null;
  linkedin_url: string | null;
  positioning_statement: string | null;
  methodology: string | null;
  coaching_style: string | null;
  engagement_format: string | null;
  primary_pillar: string | null;
  proof_points: unknown;
  audience: string[] | null;
  tier: string | null;
  lifecycle_status: string | null;
  booking_url: string | null;
  avatar_url: string | null;
  /** Legacy second image column. The editor exposes both; this page reads
   *  avatar_url first and falls back, so a photo saved in either field shows. */
  profile_image_url: string | null;
  video_url: string | null;
};

function normalizeProofPoints(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => {
    if (typeof item === "string") return item.trim();
    if (item && typeof item === "object" && "text" in item) {
      const t = (item as { text?: unknown }).text;
      return typeof t === "string" ? t.trim() : "";
    }
    return "";
  }).filter(Boolean);
  if (typeof value === "string") return value.split("\n").map(l => l.trim()).filter(Boolean);
  return [];
}

export default function CoachProfile() {
  const { slug, id, coachId } = useParams();

  const resolvedSlug = slug;
  const fallbackId = !slug ? id || coachId : null;

  const [coach, setCoach] = useState<CoachProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugError, setDebugError] = useState("");
  const [showContact, setShowContact] = useState(false);
  const { isLoggedIn } = useAuth();
  const { getConfig: getTypeConfig } = useProductTypes();
  const { toast } = useToast();
  const [products, setProducts] = useState<CoachProduct[]>([]);
  const [galarasDbProducts, setGalarasDbProducts] = useState<CoachProduct[]>([]);

  const [checkoutProduct, setCheckoutProduct] = useState<CoachProduct | null>(null);
  const [checkoutSecret, setCheckoutSecret] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [requestProduct, setRequestProduct] = useState<CoachProduct | null>(null);
  const [enterpriseProduct, setEnterpriseProduct] = useState<CoachProduct | null>(null);

  const handlePlatformCheckout = async (product: CoachProduct) => {
    if (!isLoggedIn) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (!coach || !product.price_amount) return;

    setCheckoutLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await supabase.functions.invoke("create-payment-intent", {
        body: {
          productId: product.id,
          coachId: coach.id,
          amountCents: product.price_amount,
          currency: "usd",
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setCheckoutLoading(false);
      if (res.error) {
        toast({ title: "Checkout error", description: res.error.message, variant: "destructive" });
        return;
      }
      if (res.data?.clientSecret) {
        setCheckoutProduct(product);
        setCheckoutSecret(res.data.clientSecret);
      } else {
        toast({ title: "Checkout error", description: res.data?.error ?? "Could not start checkout.", variant: "destructive" });
      }
    } catch (err: unknown) {
      setCheckoutLoading(false);
      const msg = err instanceof Error ? err.message : "Unexpected error";
      toast({ title: "Checkout error", description: msg, variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchCoach();
  }, [resolvedSlug, fallbackId]);

  useEffect(() => {
    if (coach?.id) fetchProducts(coach.id, coach.tier);
  }, [coach?.id]);

  const PRODUCT_SELECT = "id, product_type, title, outcome_statement, target_audience, delivery_format, session_count, duration_minutes, duration_weeks, price_type, price_amount, price_range_min, price_range_max, enterprise_ready, booking_mode, visibility_scope, is_active, sort_order";

  const fetchProducts = async (coachId: string, tier?: string | null) => {
    const { data } = await supabase
      .from("coach_products")
      .select(PRODUCT_SELECT)
      .eq("coach_id", coachId)
      .eq("is_active", true)
      .eq("visibility_scope", "public")
      .order("sort_order", { ascending: true });
    setProducts((data as CoachProduct[]) || []);

    if (tier === "master") {
      const { data: galCoach } = await supabase
        .from("coaches")
        .select("id")
        .eq("slug", "galoras")
        .maybeSingle();
      if (galCoach?.id) {
        const { data: gData } = await supabase
          .from("coach_products")
          .select(PRODUCT_SELECT)
          .eq("coach_id", galCoach.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        setGalarasDbProducts((gData as CoachProduct[]) || []);
      }
    } else {
      setGalarasDbProducts([]);
    }
  };

  const fetchCoach = async () => {
    setLoading(true);
    setDebugError("");
    try {
      let query = supabase
        .from("coaches")
        .select(
          "id, slug, display_name, headline, bio, linkedin_url, positioning_statement, methodology, coaching_style, engagement_format, primary_pillar, proof_points, audience, tier, lifecycle_status, booking_url, avatar_url, profile_image_url, video_url"
        )
        .eq("lifecycle_status", "published");

      if (resolvedSlug) {
        query = query.eq("slug", resolvedSlug);
      } else if (fallbackId) {
        query = query.eq("id", fallbackId);
      } else {
        setDebugError("Missing slug or coach id");
        setCoach(null);
        setLoading(false);
        return;
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error(error);
        setDebugError(JSON.stringify(error));
        setCoach(null);
        setLoading(false);
        return;
      }

      if (!data) {
        setCoach(null);
        setLoading(false);
        return;
      }

      setCoach(data as unknown as CoachProfileData);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setDebugError("Unexpected profile load error");
      setCoach(null);
      setLoading(false);
    }
  };

  // The tier chip is a Galoras billing tier, not a mark of quality. Showing
  // "Pro" — the entry tier — as a gold badge on a coach we invited personally
  // reads as a ranking to the visitor and as a grading to the coach. Only the
  // top tier earns a chip; everyone else simply has no badge.
  const showTierBadge = coach?.tier === "master";

  const proofPoints = useMemo(
    () => normalizeProofPoints(coach?.proof_points),
    [coach?.proof_points]
  );

  const lowestPrice = useMemo(() => {
    const priced = products.filter(p => p.price_amount && p.price_amount > 0);
    if (!priced.length) return null;
    return Math.min(...priced.map(p => p.price_amount!));
  }, [products]);

  return (
    <Layout>
      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/30" />
        <div className="container-wide relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <Link
                to="/coaching"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Coaching Exchange
              </Link>
            </div>

            {loading && (
              <div className="py-16 text-center text-muted-foreground">
                Loading profile...
              </div>
            )}

            {!loading && debugError && (
              <pre className="whitespace-pre-wrap text-red-500 text-sm">
                {debugError}
              </pre>
            )}

            {!loading && !debugError && !coach && (
              <div className="py-16 text-center">
                <h1 className="text-2xl font-semibold mb-2">Coach not found</h1>
                <p className="text-muted-foreground">
                  This profile is not currently available.
                </p>
              </div>
            )}

            {!loading && !debugError && coach && (
              <>
                {/* Page header — name + positioning above the two-column split */}
                <div className="mb-8">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
                      <Sparkles className="h-3.5 w-3.5" />
                      Galoras Coaching Exchange
                    </div>
                    {showTierBadge && (
                      <div className="inline-flex items-center px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium capitalize">
                        {coach.tier}
                      </div>
                    )}
                    {coach.primary_pillar && (
                      <div className="inline-flex items-center px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-medium">
                        {coach.primary_pillar}
                      </div>
                    )}
                  </div>
                  <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-3">
                    {coach.display_name || "Unnamed Coach"}
                  </h1>
                  {coach.headline && (
                    <p className="text-sm text-primary font-medium mb-4">
                      {coach.headline}
                    </p>
                  )}
                  {/* Fall back to the bio the coach wrote during onboarding.
                      Printing "not available" told the visitor nothing and made
                      a real coach's page look abandoned. If there is genuinely
                      nothing to say, say nothing. */}
                  {(coach.positioning_statement || coach.bio) && (
                    <p className="text-base md:text-lg text-muted-foreground max-w-2xl whitespace-pre-wrap">
                      {coach.positioning_statement || coach.bio}
                    </p>
                  )}

                  {coach.linkedin_url && (
                    <a
                      href={coach.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-4 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </a>
                  )}
                </div>

                {/* Two-column layout */}
                <div className="grid md:grid-cols-[1fr_300px] gap-8 items-start">

                  {/* Left: main content */}
                  <div className="space-y-6">

                    {/* Methodology — only when there is one. An empty section
                        headed "Methodology" saying "Methodology not available"
                        is worse than no section at all. */}
                    {coach.methodology && (
                      <section className="rounded-2xl border border-border bg-card p-8">
                        <h2 className="text-xl font-semibold mb-4">Methodology</h2>
                        <p className="text-muted-foreground leading-7 whitespace-pre-wrap">
                          {coach.methodology}
                        </p>
                      </section>
                    )}

                    {/* Intro Video */}
                    {coach.video_url && (
                      <section className="rounded-2xl border border-border bg-card p-8">
                        <h2 className="text-xl font-semibold mb-4">
                          Meet {coach.display_name?.split(" ")[0]}
                        </h2>
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
                          <video
                            src={coach.video_url}
                            controls
                            className="absolute inset-0 w-full h-full"
                            playsInline
                          />
                        </div>
                      </section>
                    )}

                    {/* Coaching Style */}
                    {(coach.coaching_style || coach.engagement_format || coach.primary_pillar) && (
                      <section className="rounded-2xl border border-border bg-card p-8">
                        <h2 className="text-xl font-semibold mb-4">Coaching Style</h2>
                        {coach.coaching_style && (
                          <p className="text-muted-foreground leading-7 whitespace-pre-wrap mb-6">
                            {coach.coaching_style}
                          </p>
                        )}
                        {(coach.engagement_format || coach.primary_pillar) && (
                          <div className="flex flex-wrap gap-3">
                            {coach.primary_pillar && (
                              <div className="inline-flex items-center px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-sm">
                                <span className="text-muted-foreground mr-1.5">Pillar:</span>
                                <span className="font-medium">{coach.primary_pillar}</span>
                              </div>
                            )}
                            {coach.engagement_format && (
                              <div className="inline-flex items-center px-3 py-1.5 rounded-full border border-border text-sm">
                                <span className="text-muted-foreground mr-1.5">Format:</span>
                                <span className="font-medium capitalize">{coach.engagement_format}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </section>
                    )}

                    {/* Proof Points — testimonial card style.
                        Only rendered when there are some. A card headed
                        "Results & Proof" containing "No proof points available
                        yet" was the first thing on a new coach's page: an empty
                        trophy cabinet with a spotlight on it, which a coach
                        reads as the site's opinion of them. */}
                    {proofPoints.length > 0 && (
                      <section className="rounded-2xl border border-border bg-card p-8">
                        <h2 className="text-xl font-semibold mb-6">Results & Proof</h2>
                        <div className="space-y-4">
                          {proofPoints.map((point, index) => (
                            <div
                              key={index}
                              className="rounded-xl border border-border bg-muted/20 p-5 relative"
                            >
                              <div className="text-5xl text-primary/20 font-serif leading-none absolute top-2 left-4 select-none">
                                "
                              </div>
                              <p className="text-muted-foreground leading-7 pt-4">{point}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Coach's Own Products — shown first */}
                    {products.length > 0 && (
                      <section className="rounded-2xl border border-border bg-card p-8">
                        <div className="flex items-center gap-3 mb-2">
                          <Package className="h-5 w-5 text-primary" />
                          <h2 className="text-xl font-semibold">
                            {coach.display_name ? `${coach.display_name}'s` : "Coach"} Sessions & Engagements
                          </h2>
                        </div>
                        <p className="text-sm text-muted-foreground mb-6">
                          Custom offerings designed by this coach.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4">
                          {products.map((product) => (
                            <ProductCard
                              key={product.id}
                              product={product}
                              coachName={coach.display_name || ""}
                              bookingUrl={coach.booking_url}
                              getTypeConfig={getTypeConfig}
                              onBookNow={
                                product.booking_mode === "stripe" && product.price_amount
                                  ? () => handlePlatformCheckout(product)
                                  : undefined
                              }
                              onRequest={() => setRequestProduct(product)}
                              onEnterprise={() => setEnterpriseProduct(product)}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Galoras Master Programs (master coaches only) */}
                    {galarasDbProducts.length > 0 && (
                      <section className="rounded-2xl border border-amber-500/20 bg-card p-8">
                        <div className="flex items-center gap-3 mb-2">
                          <Sparkles className="h-5 w-5 text-amber-400" />
                          <h2 className="text-xl font-semibold">Galoras Master Programs</h2>
                        </div>
                        <p className="text-sm text-muted-foreground mb-6">
                          Signature Galoras programs delivered by certified Master Coaches.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4">
                          {galarasDbProducts.map((product) => (
                            <ProductCard
                              key={product.id}
                              product={product}
                              coachName={coach.display_name || ""}
                              getTypeConfig={getTypeConfig}
                              onRequest={() => setRequestProduct(product)}
                              onEnterprise={() => setEnterpriseProduct(product)}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Galoras Platform Sessions — master tier only */}
                    {coach.tier === "master" && (
                      <section className="rounded-2xl border border-primary/20 bg-card p-8">
                        <div className="flex items-center gap-3 mb-2">
                          <Sparkles className="h-5 w-5 text-primary" />
                          <h2 className="text-xl font-semibold">Galoras Sessions</h2>
                        </div>
                        <p className="text-sm text-muted-foreground mb-6">
                          Standard sessions available through the Galoras Coaching Exchange.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4">
                          {GALORAS_PLATFORM_PRODUCTS.map((product) => (
                            <ProductCard
                              key={product.id}
                              product={product}
                              coachName={coach.display_name || ""}
                              getTypeConfig={getTypeConfig}
                              onCtaClick={() => handlePlatformCheckout(product)}
                            />
                          ))}
                        </div>
                        {checkoutLoading && (
                          <p className="text-sm text-muted-foreground text-center mt-4">
                            Preparing checkout…
                          </p>
                        )}
                      </section>
                    )}
                  </div>

                  {/* Right: sticky sidebar */}
                  <div className="md:sticky md:top-24 space-y-4">
                    <div className="rounded-2xl border border-border bg-card p-6">
                      {(coach.avatar_url || coach.profile_image_url) && (
                        <div className="mb-5">
                          <img
                            src={coach.avatar_url || coach.profile_image_url || ""}
                            alt={coach.display_name || "Coach"}
                            className="w-full rounded-xl object-cover object-top aspect-square max-h-64"
                          />
                        </div>
                      )}

                      <h2 className="text-base font-semibold mb-1">
                        {coach.display_name || "Unnamed Coach"}
                      </h2>
                      {coach.headline && (
                        <p className="text-xs text-primary font-medium mb-3 leading-snug">
                          {coach.headline}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mb-5">
                        {showTierBadge && (
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium capitalize">
                            {coach.tier}
                          </div>
                        )}
                        {coach.primary_pillar && (
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-medium">
                            {coach.primary_pillar}
                          </div>
                        )}
                      </div>

                      {lowestPrice && (
                        <p className="text-sm text-muted-foreground mb-4">
                          Starting from{" "}
                          <span className="text-foreground font-semibold">
                            ${(lowestPrice / 100).toLocaleString()}
                          </span>
                        </p>
                      )}

                      <div className="space-y-2">
                        <AuthGate isLoggedIn={isLoggedIn} message="Sign in to book a session">
                          {coach.booking_url ? (
                            <a
                              href={coach.booking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <Button
                                size="lg"
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
                                disabled={checkoutLoading}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {checkoutLoading ? "Loading…" : "Book a Call"}
                              </Button>
                            </a>
                          ) : (
                            <Button
                              size="lg"
                              className="w-full bg-primary text-primary-foreground"
                              disabled
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              Book a Call
                            </Button>
                          )}
                        </AuthGate>

                        <AuthGate isLoggedIn={isLoggedIn} message="Sign in to message this coach">
                          <Button
                            size="lg"
                            variant="outline"
                            className="w-full"
                            onClick={() => setShowContact(true)}
                          >
                            <MessageCircle className="mr-2 h-4 w-4" />
                            Message
                          </Button>
                        </AuthGate>
                      </div>
                    </div>

                    {coach.audience && coach.audience.length > 0 && (
                      <div className="rounded-2xl border border-border bg-card p-5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          Best suited for
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {coach.audience.map((a, i) => (
                            <div
                              key={i}
                              className="text-xs px-2 py-1 rounded-md border border-border bg-muted/30"
                            >
                              {a}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Link to="/coaching" className="block">
                      <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                        ← Browse all coaches
                      </Button>
                    </Link>
                  </div>
                </div>

                {showContact && coach && (
                  <ContactModal
                    coachId={coach.id}
                    coachName={coach.display_name || "Coach"}
                    onClose={() => setShowContact(false)}
                  />
                )}

                {checkoutProduct && checkoutSecret && (
                  <CheckoutModal
                    open={!!checkoutSecret}
                    stripePromise={stripePromise}
                    clientSecret={checkoutSecret}
                    productTitle={checkoutProduct.title}
                    amountCents={checkoutProduct.price_amount!}
                    currency="usd"
                    onSuccess={() => {
                      setCheckoutProduct(null);
                      setCheckoutSecret("");
                    }}
                    onClose={() => {
                      setCheckoutProduct(null);
                      setCheckoutSecret("");
                    }}
                  />
                )}

                {requestProduct && coach && (
                  <RequestModal
                    coachId={coach.id}
                    coachName={coach.display_name || "Coach"}
                    productId={requestProduct.id}
                    productTitle={requestProduct.title}
                    productType={requestProduct.product_type}
                    onClose={() => setRequestProduct(null)}
                  />
                )}

                {enterpriseProduct && coach && (
                  <EnterpriseRequestModal
                    coachId={coach.id}
                    coachName={coach.display_name || "Coach"}
                    productId={enterpriseProduct.id}
                    productTitle={enterpriseProduct.title}
                    productType={enterpriseProduct.product_type}
                    onClose={() => setEnterpriseProduct(null)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
