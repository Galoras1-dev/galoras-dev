import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { FounderVideoModal } from "@/components/FounderVideoModal";
import { FeaturedCoaches } from "@/components/FeaturedCoaches";
import { HowItWorks } from "@/components/HowItWorks";
import { SEO } from "@/components/SEO";
import { PreLaunchNotice } from "@/components/PreLaunchNotice";
import { ArrowRight, Compass, Zap, Target, Brain, MessageCircle, TrendingUp } from "lucide-react";

const categories = [
  { icon: Target, name: "Leadership Under Pressure", slug: "leadership", desc: "Leading teams, making decisions, and holding authority when the stakes are real." },
  { icon: TrendingUp, name: "Career Acceleration", slug: "career", desc: "Moving faster, further, and with more intention — at every stage of the climb." },
  { icon: Zap, name: "Execution & Performance", slug: "performance", desc: "Closing the gap between what you intend and what you actually deliver." },
  { icon: Brain, name: "Mindset & Resilience", slug: "mindset", desc: "The mental edge that separates consistent performers from everyone else." },
  { icon: MessageCircle, name: "Influence & Communication", slug: "communication", desc: "How you show up, speak, and move people — in rooms that matter." },
  { icon: Compass, name: "Transitions & Pivots", slug: "transitions", desc: "Role changes, industry shifts, and reinventions — done with clarity and confidence." },
];

const HEADLINES: { parts: { text: string; highlight?: boolean }[]; href: string | null }[] = [
  {
    parts: [
      { text: "Business is a " },
      { text: "team sport.", highlight: true },
      { text: " Most teams never practice." },
    ],
    href: null,
  },
  {
    parts: [
      { text: "Clarity changes everything. " },
      { text: "Coaching", highlight: true },
      { text: " creates it." },
    ],
    href: "/coaching",
  },
  {
    parts: [
      { text: "Effort isn't the constraint. " },
      { text: "Guidance", highlight: true },
      { text: " is." },
    ],
    href: "/coaching",
  },
  {
    parts: [
      { text: "A coach gives you the space to " },
      { text: "reflect, commit, and grow.", highlight: true },
    ],
    href: "/coaching",
  },
  {
    parts: [
      { text: "The gap between you and your potential has a " },
      { text: "name.", highlight: true },
    ],
    href: "/coaching",
  },
];

// Timing constants (ms)
const SWEEP_DURATION = 750;
const HOLD_DURATION = 3200;
const EXIT_DURATION = 350;

type Phase = "sweep" | "visible" | "exiting";

function RotatingHero() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("sweep");
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  const runCycle = (idx: number) => {
    setIndex(idx);
    setPhase("sweep");

    timerRef.current = setTimeout(() => {
      setPhase("visible");

      timerRef.current = setTimeout(() => {
        setPhase("exiting");

        timerRef.current = setTimeout(() => {
          runCycle((idx + 1) % HEADLINES.length);
        }, EXIT_DURATION);
      }, HOLD_DURATION);
    }, SWEEP_DURATION);
  };

  useEffect(() => {
    if (!paused) {
      runCycle(0);
    }
    return clear;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  const headline = HEADLINES[index];

  const handleClick = () => {
    if (headline.href) {
      clear();
      navigate(headline.href);
    }
  };

  return (
    <div
      className="relative overflow-hidden cursor-default"
      onMouseEnter={() => { clear(); setPaused(true); }}
      onMouseLeave={() => { setPaused(false); }}
      style={{ minHeight: "3.5rem" }}
    >
      {/* Headline text */}
      <span
        onClick={handleClick}
        className={[
          "relative z-20 block text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight",
          headline.href ? "cursor-pointer" : "",
          phase === "sweep" || phase === "visible" ? "headline-reveal" : "",
          phase === "exiting" ? "headline-exit" : "",
        ].join(" ")}
      >
        {headline.parts.map((part, i) =>
          part.highlight
            ? <span key={i} className="text-gradient">{part.text}</span>
            : <span key={i} className="text-foreground">{part.text}</span>
        )}
        {headline.href && (
          <ArrowRight className="inline-block ml-3 h-8 w-8 text-accent opacity-70" />
        )}
      </span>
    </div>
  );
}

export default function Index() {
  return (
    <Layout>
      <SEO
        title="Elite Performance Coaching"
        description="Galoras connects high-performers and leadership teams with coaches who have operated at the level they coach. Execution-led. Results-driven."
        canonical="/"
      />
      <FounderVideoModal />
      <PreLaunchNotice />
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <OptimizedImage
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&q=80"
            alt="Professional team collaboration"
            className="w-full h-full"
            overlay
          />
          <div className="absolute inset-0 bg-background/70" />
        </div>

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--accent)/0.1),transparent_50%)]" />

        <div className="container-wide relative z-10 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <RotatingHero />

            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mt-8 mb-10">
              Coaching is not our business. Winning is.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/coaching">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary text-lg px-8 h-14">
                  Find Your Coach
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/apply">
                <Button size="lg" variant="outline" className="border-primary/50 text-foreground hover:bg-primary/10 text-lg px-8 h-14">
                  Join as a Coach
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <FeaturedCoaches />
      <HowItWorks />

      {/* Categories Preview */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">What We <span className="text-gradient">Coach</span></h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Real performance. Built through experience, not theory.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Link
                key={category.slug}
                to={`/coaching?category=${category.slug}`}
                className="group flex items-start gap-5 p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all card-hover"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                  <category.icon className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-display font-bold text-lg text-foreground">{category.name}</h3>
                    <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{category.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding hero-gradient">
        <div className="container-wide text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Stop Navigating It <span className="text-gradient">Alone</span></h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Every high-performer has blind spots. Galoras connects you with a coach who's been in the room and help you lead with more clarity, confidence, and impact.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Join the Galoras Community
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-primary/50 hover:bg-primary/10">
                Book a Business Consultation
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
