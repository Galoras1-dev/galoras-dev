import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// The showcase now reads PUBLISHED coaches, rather than a list typed in here.
//
// It used to be a hardcoded array of one — Mitesh — linking to
// /coach/mitesh-kapadia. If that coach is not published, or has no slug, the
// homepage's most prominent link is a 404, and nothing in the code would ever
// say so. A hand-maintained list of people also has to be updated in two places
// (here and About.tsx) every time someone joins or leaves, and it will not be.
//
// Reading from the database means the section fills itself as founding coaches
// go live, and shows NOTHING while there are none. An empty showcase is honest;
// a showcase of one person who may not exist is not.
//
// Only published coaches with a slug are eligible: a slug is what makes the
// link work, and lifecycle_status is what says the coach agreed to be seen.
// ─────────────────────────────────────────────────────────────────────────────

type ShowcaseCoach = {
  name: string;
  title: string;
  slug: string;
  photo: string;
};

export function FeaturedCoaches() {
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState<ShowcaseCoach[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);
  const [colorizing, setColorizing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("coaches")
        .select("display_name, headline, slug, cutout_url, avatar_url, profile_image_url, is_featured, featured_rank, published_at")
        .eq("lifecycle_status", "published")
        .not("slug", "is", null)
        .order("is_featured", { ascending: false })
        .order("featured_rank", { ascending: true, nullsFirst: false })
        .order("published_at", { ascending: true })
        .limit(8);

      if (error) {
        // Nothing renders rather than a broken showcase. The homepage is the
        // last place to surface a database error at a stranger.
        console.error("FeaturedCoaches: could not load published coaches", error);
        setLoaded(true);
        return;
      }

      const usable = (data ?? [])
        .map(c => {
          // cutout_url is the transparent-background portrait this layout was
          // designed around; the others are ordinary photos and still work.
          const photo = c.cutout_url || c.avatar_url || c.profile_image_url || null;
          if (!photo || !c.slug || !c.display_name) return null;
          return {
            name: c.display_name as string,
            // The headline is pipe-separated: "Role | proof | Galoras". Only the
            // first segment belongs on a name plate.
            title: (c.headline ? String(c.headline).split("|")[0] : "Galoras Coach").trim(),
            slug: c.slug as string,
            photo,
          } as ShowcaseCoach;
        })
        .filter(Boolean) as ShowcaseCoach[];

      setCoaches(usable);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (colorizing || coaches.length < 2) return;
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setActive(i => (i + 1) % coaches.length);
        setFading(false);
      }, 500);
    }, 5000);
    return () => clearInterval(interval);
  }, [colorizing, coaches.length]);

  // Render nothing at all until there is a real coach to show.
  if (!loaded || coaches.length === 0) return null;

  const coach = coaches[active % coaches.length];

  const handlePhotoClick = () => {
    setColorizing(true);
    setTimeout(() => {
      navigate(`/coach/${coach.slug}`);
      setColorizing(false);
    }, 600);
  };

  const filter = colorizing
    ? "grayscale(0%) contrast(1.0) brightness(1.05)"
    : "grayscale(100%) contrast(1.1)";

  return (
    <section className="relative overflow-hidden bg-zinc-950">
      {/* Subtle background accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--primary)/0.07),transparent_60%)]" />

      <div className="container-wide relative z-10">
        <div className="grid lg:grid-cols-2 gap-0 min-h-[640px]">

          {/* Left — photo panel */}
          <div className="relative flex items-end justify-center pt-16 pb-0 order-1">

            {/* Accent border frame */}
            <div
              className="absolute left-8 right-8 top-8 bottom-0 rounded-t-2xl border border-primary/15 pointer-events-none"
              style={{ borderBottom: "none" }}
            />

            {/* Photo */}
            <button
              onClick={handlePhotoClick}
              className="relative group focus:outline-none"
              aria-label={`View ${coach.name}'s profile`}
            >
              <img
                key={coach.slug}
                src={coach.photo}
                alt={coach.name}
                className="block mx-auto"
                style={{
                  maxHeight: 480,
                  maxWidth: "100%",
                  width: "auto",
                  objectFit: "contain",
                  filter,
                  opacity: fading ? 0 : 1,
                  transition: "filter 0.5s ease, opacity 0.5s ease",
                  cursor: "pointer",
                  position: "relative",
                  zIndex: 2,
                }}
              />

              {/* Hover badge */}
              {!colorizing && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                  <span className="text-xs font-semibold text-primary bg-zinc-950/80 border border-primary/30 px-4 py-2 rounded-full backdrop-blur-sm">
                    View Profile
                  </span>
                </div>
              )}
            </button>

            {/* Name plate — pinned above bottom edge */}
            <div
              className="absolute bottom-6 left-0 right-0 z-20 text-center pointer-events-none"
              style={{ opacity: fading ? 0 : 1, transition: "opacity 0.5s ease" }}
            >
              <div className="inline-flex flex-col items-center gap-0.5 bg-zinc-900/80 border border-zinc-800 px-5 py-2 rounded-full backdrop-blur-sm">
                <p className="text-white font-display font-bold text-sm leading-tight">{coach.name}</p>
                <p className="text-primary text-xs font-medium">{coach.title}</p>
              </div>
            </div>

          </div>

          {/* Right — copy */}
          <div className="flex flex-col justify-center py-20 pl-0 lg:pl-16 order-2">

            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-5">
              The Coaches
            </p>

            <h2 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tight mb-6 leading-tight">
              People Who Have <span className="text-gradient">Been There</span>
            </h2>

            <p className="text-zinc-300 text-lg leading-relaxed mb-4">
              Every Galoras coach has operated at the level they coach. Not studied it. Not observed it. Lived it, and taken responsibility for outcomes.
            </p>
            <p className="text-zinc-500 text-base leading-relaxed mb-10">
              Executives, founders, and operators who have led at the highest level and now deploy that experience to help others perform under real conditions.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link to="/coaching">
                <Button size="lg" className="bg-primary text-zinc-950 hover:bg-primary/90 font-bold">
                  Meet the Coaches
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            {/* Dot indicators — only meaningful with more than one coach */}
            <div className="flex gap-2">
              {coaches.length > 1 && coaches.map((c, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setFading(true);
                    setTimeout(() => { setActive(i); setFading(false); }, 400);
                  }}
                  className="transition-all rounded-full focus:outline-none"
                  style={{
                    width: active === i ? 28 : 8,
                    height: 8,
                    background: active === i ? "hsl(var(--primary))" : "rgba(255,255,255,0.2)",
                  }}
                  aria-label={c.name}
                />
              ))}
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
