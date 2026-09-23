import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Hand-picked for the homepage. This list is deliberately static — it is a
// showcase, not the directory. Anyone removed from Galoras must be removed
// here and in src/pages/About.tsx, which keeps its own copy.
const COACHES = [
  {
    name: "Mitesh Kapadia",
    title: "Master Coach",
    slug: "mitesh-kapadia",
    photo:
      "https://qbjuomsmnrclsjhdsjcz.supabase.co/storage/v1/object/public/coach-images/Outside_Blue_Mitesh-removebg-preview.png",
  },
];

export function FeaturedCoaches() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);
  const [colorizing, setColorizing] = useState(false);

  useEffect(() => {
    // Nothing to rotate between while there is a single featured coach.
    if (colorizing || COACHES.length < 2) return;
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setActive(i => (i + 1) % COACHES.length);
        setFading(false);
      }, 500);
    }, 5000);
    return () => clearInterval(interval);
  }, [colorizing]);

  const coach = COACHES[active];

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
              {COACHES.length > 1 && COACHES.map((c, i) => (
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
