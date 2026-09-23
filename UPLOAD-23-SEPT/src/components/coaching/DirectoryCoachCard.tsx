import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CalendarCheck, RotateCcw, GitCompareArrows } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type CoachProduct = {
  product_type: string;
  title: string;
  price_type: string;
  price_amount: number | null;
  enterprise_ready: boolean;
};

export type DirectoryCoach = {
  id: string;
  slug: string | null;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  specialties: string[] | null;
  audience: string[] | null;
  avatar_url: string | null;
  cutout_url: string | null;
  profile_image_url: string | null;
  booking_url: string | null;
  tier: string | null;
  primary_pillar: string | null;
  engagement_format: string | null;
  coaching_style: string | null;
  coach_products?: CoachProduct[] | null;
};

type TagEntry = { tag_key: string; tag_label: string; tag_family: string };

interface DirectoryCoachCardProps {
  coach: DirectoryCoach;
  profilePath: string;
  matchScore: number;
  hasMatches: boolean;
  isLoggedIn: boolean;
  coachTags: TagEntry[];
  compareList: string[];
  getConfig: (slug: string) => { label: string; className: string };
  onToggleCompare: (id: string) => void;
  onContact: (id: string, name: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DirectoryCoachCard({
  coach,
  profilePath,
  compareList,
  getConfig,
  onToggleCompare,
}: DirectoryCoachCardProps) {
  const [flipped, setFlipped] = useState(false);

  const tierColors: Record<string, string> = {
    master: "bg-accent/15 border-accent/40 text-accent",
    elite: "bg-amber-500/15 border-amber-500/40 text-amber-400",
    pro: "bg-primary/15 border-primary/40 text-primary",
  };
  const tierClass = tierColors[coach.tier || ""] || "bg-zinc-800 border-zinc-700 text-zinc-400";

  return (
    <div
      className="relative h-[460px]"
      style={{ perspective: "1200px" }}
    >
      <div
        className="relative w-full h-full transition-transform duration-600 ease-in-out"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transitionDuration: "600ms",
        }}
      >
        {/* ════════ FRONT ════════ */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden border border-border bg-card flex flex-col"
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Photo — double-click to flip */}
          <div
            className="relative h-[240px] bg-background overflow-hidden cursor-pointer"
            onDoubleClick={() => setFlipped(true)}
          >
            {(coach.cutout_url || coach.avatar_url || coach.profile_image_url) ? (
              <img
                src={coach.cutout_url || coach.avatar_url || coach.profile_image_url || ""}
                alt={coach.display_name || "Coach"}
                className={`w-full h-full ${coach.cutout_url ? "object-contain object-bottom" : "object-cover object-top"}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl font-bold text-muted-foreground/30">
                  {(coach.display_name || "C").charAt(0)}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

            {/* Tier badge top-right */}
            {coach.tier && (
              <div className="absolute top-3 right-3">
                <span className={`px-3 py-1 text-xs font-bold rounded-full border capitalize ${tierClass}`}>
                  {coach.tier}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-foreground leading-tight">
                {coach.display_name}
              </p>
              <img src="/galoras-logo.jpg" alt="Galoras" className="h-4 w-auto opacity-70 shrink-0 ml-2" />
            </div>

            {coach.headline && (
              <p className="text-muted-foreground text-xs mb-2 line-clamp-2 leading-snug">
                {coach.headline}
              </p>
            )}

            {/* Pillar + Format badges */}
            <div className="flex flex-wrap gap-1 mb-auto">
              {coach.primary_pillar && (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary/10 border border-primary/30 text-primary">
                  {coach.primary_pillar}
                </span>
              )}
              {coach.engagement_format && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-card border border-border text-muted-foreground capitalize">
                  {coach.engagement_format === "in_person" ? "In-Person" : coach.engagement_format}
                </span>
              )}
            </div>

            {/* CTAs */}
            <div className="flex gap-2 pt-2 border-t border-border mt-2">
              <Link to={profilePath} className="flex-1">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-9 rounded-lg gap-1.5">
                  <CalendarCheck className="h-3.5 w-3.5" />
                  View & Book
                </Button>
              </Link>
              <button
                onClick={(e) => { e.preventDefault(); onToggleCompare(coach.id); }}
                title={compareList.includes(coach.id) ? "Remove from compare" : "Add to compare"}
                className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-colors ${
                  compareList.includes(coach.id)
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:border-accent/50 hover:text-accent"
                }`}
              >
                <GitCompareArrows className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => { e.preventDefault(); setFlipped(true); }}
                className="flex items-center justify-center w-9 h-9 rounded-lg border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                title="See details"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ════════ BACK ════════ */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden border border-border bg-card flex flex-col p-5"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <img src="/galoras-logo.jpg" alt="Galoras" className="h-5 w-auto" />
            <button
              onClick={() => setFlipped(false)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Flip back
            </button>
          </div>

          {/* Coaching Style */}
          {coach.coaching_style && (
            <div className="mb-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Coaching Style</p>
              <p className="text-sm text-white">{coach.coaching_style}</p>
            </div>
          )}

          {/* Products */}
          {coach.coach_products && coach.coach_products.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Products & Services</p>
              <div className="space-y-2">
                {coach.coach_products.slice(0, 3).map((p, i) => {
                  const { label, className } = getConfig(p.product_type);
                  const price = p.price_type === "fixed" && p.price_amount
                    ? `$${(p.price_amount / 100).toLocaleString()}`
                    : p.price_type === "enquiry" ? "Enquiry" : "";
                  return (
                    <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-background border border-border">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded border shrink-0 ${className}`}>
                          {label}
                        </span>
                        <span className="text-xs text-white truncate">{p.title}</span>
                      </div>
                      {price && (
                        <span className="text-xs font-semibold text-accent shrink-0 ml-2">{price}</span>
                      )}
                    </div>
                  );
                })}
                {coach.coach_products.length > 3 && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    +{coach.coach_products.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Specialties */}
          {coach.specialties && coach.specialties.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Specialties</p>
              <div className="flex flex-wrap gap-1">
                {coach.specialties.slice(0, 4).map(s => (
                  <span key={s} className="px-2 py-0.5 text-[10px] rounded-full border border-border text-muted-foreground capitalize">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Audience */}
          {coach.audience && coach.audience.length > 0 && (
            <div className="mb-auto">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Audience</p>
              <div className="flex flex-wrap gap-1">
                {coach.audience.map(a => (
                  <span key={a} className="px-2 py-0.5 text-[10px] rounded-full bg-primary/10 border border-primary/20 text-primary capitalize">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="pt-3 border-t border-border mt-3">
            <Link to={profilePath}>
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-9 rounded-lg gap-1.5">
                <CalendarCheck className="h-3.5 w-3.5" />
                View Full Profile & Book
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
