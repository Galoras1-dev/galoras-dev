import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle, Calendar, Mail, Users, Send, Building2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CoachProduct {
  id:               string;
  product_type:     string;
  title:            string;
  outcome_statement?: string | null;
  target_audience?: string[] | null;
  delivery_format?: "online" | "in_person" | "hybrid" | null;
  session_count?:   number | null;
  duration_minutes?: number | null;
  duration_weeks?:  number | null;
  price_type:       string;
  price_amount?:    number | null;
  price_range_min?: number | null;
  price_range_max?: number | null;
  enterprise_ready: boolean;
  booking_mode:     string;
  visibility_scope: string;
  is_active:        boolean;
  sort_order:       number;
}

// ── Config ────────────────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<string, string> = {
  online:    "Remote",
  in_person: "In-Person",
  hybrid:    "Hybrid",
};

// ── Component ─────────────────────────────────────────────────────────────────

interface ProductCardProps {
  product:        CoachProduct;
  coachName?:     string;
  /** booking_url from the coach record — used for enquiry mode */
  bookingUrl?:    string | null;
  getTypeConfig?: (slug: string) => { label: string; className: string };
  /** Stripe checkout handler */
  onBookNow?:     () => void;
  /** Request form handler (packages/intensives) */
  onRequest?:     () => void;
  /** Enterprise proposal handler (corporate) */
  onEnterprise?:  () => void;
  /** Legacy: override CTA (backwards compat for platform products) */
  onCtaClick?:    () => void;
}

export function ProductCard({ product, coachName, bookingUrl, getTypeConfig, onBookNow, onRequest, onEnterprise, onCtaClick }: ProductCardProps) {
  const typeCfg = getTypeConfig
    ? getTypeConfig(product.product_type)
    : { label: product.product_type, className: "bg-zinc-500/10 border-zinc-500/30 text-zinc-400" };

  // Price display
  const priceText =
    product.price_type === "fixed" && product.price_amount
      ? `$${(product.price_amount / 100).toLocaleString()}`
      : product.price_type === "range" && product.price_range_min && product.price_range_max
        ? `$${(product.price_range_min / 100).toLocaleString()} – $${(product.price_range_max / 100).toLocaleString()}`
        : null;

  // Duration text
  const durationText = [
    product.session_count ? `${product.session_count} session${product.session_count > 1 ? "s" : ""}` : null,
    product.duration_minutes ? `${product.duration_minutes} min` : null,
    product.duration_weeks ? `${product.duration_weeks} week${product.duration_weeks > 1 ? "s" : ""}` : null,
  ].filter(Boolean).join(" · ");

  // Determine CTA type based on product characteristics
  const isEnterprise = product.product_type === "corporate" || product.enterprise_ready;
  // booking_mode is the authority on whether a product can be paid for.
  //
  // This used to be derived purely from which callbacks a parent handed in, so
  // booking_mode was decorative: a product marked "enquiry" still rendered Book
  // Now and ran a live checkout if the parent passed a handler. The two
  // hardcoded Galoras platform products did exactly that — both carry
  // booking_mode "enquiry" and both showed a working test-mode checkout button
  // on every master coach's profile. No amount of SQL could have reached them.
  const isStripe = product.booking_mode === "stripe" && (!!onCtaClick || !!onBookNow);
  const isRequestable = !!onRequest && !isStripe && !isEnterprise;

  let ctaLabel: string;
  let ctaIcon: React.ReactNode;
  let ctaVariant: "default" | "outline" = "default";

  if (isStripe) {
    ctaLabel = "Book Now";
    ctaIcon = <Calendar className="mr-1.5 h-3.5 w-3.5" />;
  } else if (isEnterprise && onEnterprise) {
    ctaLabel = "Request Proposal";
    ctaIcon = <Building2 className="mr-1.5 h-3.5 w-3.5" />;
    ctaVariant = "outline";
  } else if (isRequestable) {
    ctaLabel = "Request";
    ctaIcon = <Send className="mr-1.5 h-3.5 w-3.5" />;
  } else if (bookingUrl) {
    ctaLabel = "Book Now";
    ctaIcon = <Calendar className="mr-1.5 h-3.5 w-3.5" />;
  } else {
    ctaLabel = "Enquire";
    ctaIcon = <Mail className="mr-1.5 h-3.5 w-3.5" />;
    ctaVariant = "outline";
  }

  const handleCta = () => {
    // Gated on isStripe for the same reason as the label above: a checkout
    // handler must not run for a product that is not in stripe booking mode.
    if (isStripe) { (onCtaClick ?? onBookNow)!(); return; }
    if (isEnterprise && onEnterprise) { onEnterprise(); return; }
    if (isRequestable) { onRequest!(); return; }
    if (bookingUrl) {
      window.open(bookingUrl, "_blank", "noopener,noreferrer");
    } else {
      const subject = encodeURIComponent(`Enquiry: ${product.title}${coachName ? ` — ${coachName}` : ""}`);
      window.location.href = `mailto:hello@galoras.com?subject=${subject}`;
    }
  };

  return (
    <Card className="group flex flex-col border border-border hover:border-primary/30 transition-colors duration-200">
      <CardContent className="p-6 flex flex-col h-full">

        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${typeCfg.className}`}>
                {typeCfg.label}
              </span>
              {product.delivery_format && FORMAT_LABELS[product.delivery_format] && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground border border-border">
                  {FORMAT_LABELS[product.delivery_format]}
                </span>
              )}
              {product.enterprise_ready && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30">
                  <Users className="inline h-3 w-3 mr-0.5" />Enterprise
                </span>
              )}
            </div>
            <h3 className="text-base font-display font-semibold leading-snug">
              {product.title}
            </h3>
          </div>

          {/* Price */}
          {priceText && (
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-foreground">{priceText}</p>
            </div>
          )}
        </div>

        {/* Outcome statement */}
        {product.outcome_statement && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {product.outcome_statement}
          </p>
        )}

        {/* Target audience */}
        {product.target_audience && product.target_audience.length > 0 && (
          <p className="text-xs text-muted-foreground italic mb-4">
            <span className="font-medium not-italic text-foreground/70">For: </span>
            {product.target_audience.join(", ")}
          </p>
        )}

        {/* Spacer — pushes footer to bottom */}
        <div className="flex-1" />

        {/* Footer: duration + CTA */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-border mt-4">
          {durationText ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {durationText}
            </span>
          ) : (
            <span />
          )}

          <Button
            size="sm"
            variant={ctaVariant}
            className="shrink-0"
            onClick={handleCta}
          >
            {ctaIcon}
            {ctaLabel}
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}
