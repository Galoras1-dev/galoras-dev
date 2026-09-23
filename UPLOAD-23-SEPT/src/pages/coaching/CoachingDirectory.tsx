import { useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Search, Sparkles, UserCircle2, ArrowRight, GitCompareArrows, X, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ContactModal } from "@/components/coaching/ContactModal";
import { DirectoryCoachCard, type DirectoryCoach } from "@/components/coaching/DirectoryCoachCard";
import { toggle } from "@/components/coaching/DirectoryFilters";
import { useAuth } from "@/hooks/useAuth";
import { useProductTypes } from "@/hooks/useProductTypes";

// ── Sidebar filter button ─────────────────────────────────────────────────────

function SidebarFilterBtn({
  label,
  active,
  color = "primary",
  onClick,
}: {
  label: string;
  active: boolean;
  color?: "primary" | "accent" | "emerald";
  onClick: () => void;
}) {
  const activeClass =
    color === "accent"
      ? "text-accent bg-accent/10 font-semibold"
      : color === "emerald"
      ? "text-emerald-400 bg-emerald-500/10 font-semibold"
      : "text-primary bg-primary/10 font-semibold";

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all text-left group ${
        active ? activeClass : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
      }`}
    >
      <span>{label}</span>
      {active && <ChevronRight className="h-3 w-3 opacity-60" />}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CoachingDirectory() {
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get("filter");
  const matchedParam = searchParams.get("matched") === "1";

  const [searchQuery, setSearchQuery] = useState("");
  const [selSpecialties, setSelSpecialties] = useState<string[]>(
    filterParam ? [filterParam] : []
  );
  const [selPillars, setSelPillars] = useState<string[]>([]);
  const [selTiers, setSelTiers] = useState<string[]>([]);
  const [selEngagementFormats, setSelEngagementFormats] = useState<string[]>([]);

  const [contactCoach, setContactCoach] = useState<{ id: string; name: string } | null>(null);
  const [compareList, setCompareList] = useState<string[]>([]);
  const { isLoggedIn, profile } = useAuth();
  const navigate = useNavigate();
  const { getConfig } = useProductTypes();

  const toggleCompare = (id: string) => {
    setCompareList((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const activeFilterCount =
    selSpecialties.length + selPillars.length + selTiers.length + selEngagementFormats.length;

  const clearAllFilters = () => {
    setSelSpecialties([]);
    setSelPillars([]);
    setSelTiers([]);
    setSelEngagementFormats([]);
    setSearchQuery("");
  };

  // ── Data ───────────────────────────────────────────────────────────────────

  const { data: coaches, isLoading, error } = useQuery({
    queryKey: ["public-coaches-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaches")
        .select("id, slug, display_name, headline, bio, specialties, audience, avatar_url, cutout_url, profile_image_url, booking_url, tier, primary_pillar, engagement_format, coaching_style, coach_products(product_type, title, price_type, price_amount, enterprise_ready)")
        .eq("lifecycle_status", "published")
        .order("display_name", { ascending: true });
      if (error) throw error;
      return (data || []) as DirectoryCoach[];
    },
  });

  const { data: coachTagData } = useQuery({
    queryKey: ["coach-tag-map-directory"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("coach_tag_map")
        .select("coach_id, tags(tag_key, tag_label, tag_family)");
      return data || [];
    },
  });

  const coachTagLookup = useMemo(() => {
    const map: Record<string, { tag_key: string; tag_label: string; tag_family: string }[]> = {};
    (coachTagData || []).forEach((row: any) => {
      if (!map[row.coach_id]) map[row.coach_id] = [];
      if (row.tags) map[row.coach_id].push(row.tags);
    });
    return map;
  }, [coachTagData]);

  const allTagLabels = useMemo(() => {
    const labels: Record<string, string[]> = {};
    (coachTagData || []).forEach((row: any) => {
      if (!row.tags) return;
      if (!labels[row.coach_id]) labels[row.coach_id] = [];
      labels[row.coach_id].push(row.tags.tag_label.toLowerCase());
    });
    return labels;
  }, [coachTagData]);

  const { dbPillars, dbTiers, dbEngagementFormats } = useMemo(() => {
    const pillars = new Set<string>(), tiers = new Set<string>(), formats = new Set<string>();
    (coaches || []).forEach(c => {
      if (c.primary_pillar) pillars.add(c.primary_pillar);
      if (c.tier) tiers.add(c.tier);
      if (c.engagement_format) formats.add(c.engagement_format);
    });
    return {
      dbPillars: [...pillars].sort(),
      dbTiers: [...tiers].sort(),
      dbEngagementFormats: [...formats].sort(),
    };
  }, [coaches]);

  const matchScore = (coach: DirectoryCoach): number => {
    if (!profile?.coaching_areas || profile.coaching_areas.length === 0) return 0;
    const userAreas = profile.coaching_areas.map((a) => a.toLowerCase());
    return (coach.specialties || []).filter((s) => userAreas.includes(s.toLowerCase())).length;
  };

  const filtered = (coaches || []).filter((coach) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const text = [coach.display_name, coach.headline, coach.bio, ...(coach.specialties || [])].join(" ").toLowerCase();
      const tags = (allTagLabels[coach.id] || []).join(" ");
      if (!text.includes(q) && !tags.includes(q)) return false;
    }
    const ct = coachTagLookup[coach.id] || [];
    if (selSpecialties.length > 0) {
      const keys = ct.filter(t => t.tag_family === "specialty").map(t => t.tag_key);
      const legacy = (coach.specialties || []).map(s => s.toLowerCase());
      if (!selSpecialties.some(s => keys.includes(s) || legacy.includes(s))) return false;
    }
    if (selPillars.length > 0 && (!coach.primary_pillar || !selPillars.includes(coach.primary_pillar))) return false;
    if (selTiers.length > 0 && (!coach.tier || !selTiers.includes(coach.tier))) return false;
    if (selEngagementFormats.length > 0 && (!coach.engagement_format || !selEngagementFormats.includes(coach.engagement_format))) return false;
    return true;
  }).sort((a, b) => matchScore(b) - matchScore(a));

  const hasProfile = isLoggedIn && profile?.onboarding_complete;
  const hasMatches = isLoggedIn && profile?.coaching_areas && profile.coaching_areas.length > 0;

  const coachProfilePath = (coach: DirectoryCoach) =>
    coach.slug ? `/coach/${coach.slug}` : `/coaching/${coach.id}`;

  // ── Active filter label for results bar ──────────────────────────────────────
  const activeLabel = [
    ...selPillars,
    ...selTiers.map(t => t.charAt(0).toUpperCase() + t.slice(1)),
    ...selEngagementFormats.map(f => f === "in_person" ? "In-Person" : f),
  ].join(", ");

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <SEO
        title="Find a Coach"
        description="Browse Galoras coaches by domain and operating background. Every coach has performed at the level they coach — leadership, career, performance, mindset, and more."
        canonical="/coaching"
      />

      {/* ══ HERO ══ */}
      <section className="pt-20 pb-10 bg-zinc-950 border-b border-zinc-900">
        <div className="container-wide">
          <div className="max-w-xl mx-auto text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
              Galoras Coaching Exchange
            </p>
            <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight text-white uppercase mb-3">
              Find a Coach for{" "}
              <span className="text-primary">Where You Are</span>
            </h1>
            <p className="text-zinc-500 text-sm mb-7 max-w-md mx-auto leading-relaxed">
              Every coach has performed at the level you're trying to reach. No generic advice — only people who've been in the room.
            </p>

            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search by name, specialty, or focus area..."
                className="pl-11 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 h-11 text-sm focus-visible:ring-primary rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══ BODY ══ */}
      <section className="bg-background min-h-screen">
        <div className="container-wide py-8 pb-28">
          <div className="flex gap-8 items-start">

            {/* ── SIDEBAR (desktop) ── */}
            <aside className="hidden lg:flex flex-col gap-5 w-52 shrink-0 sticky top-20 self-start">

              {/* Profile / onboarding nudge */}
              {!hasProfile && (
                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-start gap-2 mb-2">
                    <UserCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-zinc-400 leading-snug">
                      {isLoggedIn
                        ? "Complete your profile to see coaches matched to your goals."
                        : "Create a free profile to get personalized coach matches."}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(isLoggedIn ? "/onboarding" : "/signup")}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    {isLoggedIn ? "Complete profile →" : "Get started →"}
                  </button>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-zinc-800" />

              {/* ── Filter sections ── */}
              <div className="space-y-5">

                {/* Pillar */}
                {dbPillars.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1 px-1">
                      Coaching Pillar
                    </p>
                    <div className="space-y-0.5">
                      {dbPillars.map(p => (
                        <SidebarFilterBtn
                          key={p}
                          label={p}
                          active={selPillars.includes(p)}
                          color="primary"
                          onClick={() => setSelPillars(prev => toggle(prev, p))}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Tier */}
                {dbTiers.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1 px-1">
                      Coach Tier
                    </p>
                    <div className="space-y-0.5">
                      {dbTiers.map(t => (
                        <SidebarFilterBtn
                          key={t}
                          label={t.charAt(0).toUpperCase() + t.slice(1)}
                          active={selTiers.includes(t)}
                          color="accent"
                          onClick={() => setSelTiers(prev => toggle(prev, t))}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Engagement Format */}
                {dbEngagementFormats.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1 px-1">
                      Format
                    </p>
                    <div className="space-y-0.5">
                      {dbEngagementFormats.map(f => (
                        <SidebarFilterBtn
                          key={f}
                          label={f === "in_person" ? "In-Person" : f.charAt(0).toUpperCase() + f.slice(1)}
                          active={selEngagementFormats.includes(f)}
                          color="emerald"
                          onClick={() => setSelEngagementFormats(prev => toggle(prev, f))}
                        />
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Clear all */}
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-zinc-600 hover:text-red-400 transition-colors text-left px-1"
                >
                  Clear all filters ({activeFilterCount})
                </button>
              )}
            </aside>

            {/* ── MAIN ── */}
            <div className="flex-1 min-w-0">

              {/* Mobile filter pills */}
              <div className="lg:hidden overflow-x-auto mb-6 -mx-4 px-4">
                <div className="flex items-center gap-2 pb-1 min-w-max">
                  {dbPillars.map(p => (
                    <button key={p} onClick={() => setSelPillars(prev => toggle(prev, p))}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${
                        selPillars.includes(p)
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30 hover:text-white"
                      }`}>
                      {p}
                    </button>
                  ))}
                  {dbPillars.length > 0 && <div className="w-px h-4 bg-border shrink-0" />}
                  {dbTiers.map(t => (
                    <button key={t} onClick={() => setSelTiers(prev => toggle(prev, t))}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap capitalize transition-colors ${
                        selTiers.includes(t)
                          ? "bg-accent/15 border-accent/40 text-accent"
                          : "border-border text-muted-foreground hover:border-accent/30 hover:text-white"
                      }`}>
                      {t}
                    </button>
                  ))}
                  {dbTiers.length > 0 && <div className="w-px h-4 bg-border shrink-0" />}
                  {dbEngagementFormats.map(f => (
                    <button key={f} onClick={() => setSelEngagementFormats(prev => toggle(prev, f))}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap capitalize transition-colors ${
                        selEngagementFormats.includes(f)
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                          : "border-border text-muted-foreground hover:border-emerald-500/30 hover:text-white"
                      }`}>
                      {f === "in_person" ? "In-Person" : f}
                    </button>
                  ))}
                  {activeFilterCount > 0 && (
                    <>
                      <div className="w-px h-4 bg-border shrink-0" />
                      <button onClick={clearAllFilters} className="shrink-0 text-xs text-red-400 whitespace-nowrap font-medium">
                        Clear ({activeFilterCount})
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Matched banner */}
              {matchedParam && (
                <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                  <p className="text-sm text-emerald-300">Showing coaches matched to your context.</p>
                  <button
                    onClick={() => { clearAllFilters(); navigate("/coaching", { replace: true }); }}
                    className="ml-auto text-xs text-zinc-500 hover:text-zinc-300 whitespace-nowrap"
                  >
                    Clear match
                  </button>
                </div>
              )}

              {/* Results bar */}
              {!isLoading && !error && (
                <div className="flex items-center justify-between mb-6 pb-5 border-b border-zinc-900">
                  <div>
                    <p className="text-sm text-zinc-300">
                      <span className="font-bold text-white">{filtered.length}</span>
                      {" "}coach{filtered.length !== 1 ? "es" : ""}
                      {activeLabel && (
                        <span className="text-zinc-500"> · {activeLabel}</span>
                      )}
                    </p>
                  </div>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors lg:hidden"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}

              {/* Grid */}
              {isLoading ? (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-[440px] rounded-2xl bg-zinc-900 animate-pulse" />
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-20 text-red-400 text-sm">Failed to load coaches.</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-zinc-500 text-sm mb-4">No coaches match your current filters.</p>
                  <button onClick={clearAllFilters} className="text-primary text-sm hover:underline">
                    Clear all filters
                  </button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filtered.map((coach) => (
                    <DirectoryCoachCard
                      key={coach.id}
                      coach={coach}
                      profilePath={coachProfilePath(coach)}
                      matchScore={matchScore(coach)}
                      hasMatches={!!hasMatches}
                      isLoggedIn={!!isLoggedIn}
                      coachTags={coachTagLookup[coach.id] || []}
                      compareList={compareList}
                      getConfig={getConfig}
                      onToggleCompare={toggleCompare}
                      onContact={(id, name) => setContactCoach({ id, name })}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {contactCoach && (
        <ContactModal
          coachId={contactCoach.id}
          coachName={contactCoach.name}
          onClose={() => setContactCoach(null)}
        />
      )}

      {/* ── Floating Compare Tray ── */}
      {compareList.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-[#0a1628] border border-amber-500/40 shadow-2xl shadow-black/60 backdrop-blur-sm">
            <GitCompareArrows className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-sm text-slate-300 font-medium">
              {compareList.length} coach{compareList.length !== 1 ? "es" : ""} selected
              {compareList.length < 2 && (
                <span className="text-slate-500 ml-1">(select at least 2)</span>
              )}
            </span>
            <button
              onClick={() => navigate(`/coaching/compare?ids=${compareList.join(",")}`)}
              disabled={compareList.length < 2}
              className="ml-2 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Compare
            </button>
            <button
              onClick={() => setCompareList([])}
              className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
              title="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
