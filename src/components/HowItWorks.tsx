import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const pillars = [
  {
    number: 1,
    title: "One Performance\nPhilosophy",
    body: "A shared view of clarity, fundamentals, and execution under pressure, applied consistently across every coach and programme.",
    accent: false,
    bg: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=800&auto=format&fit=crop",
    href: "/coaching/how-it-works",
  },
  {
    number: 2,
    title: "Curated Human\nCapital",
    body: "A selective network of coaches, operators and leaders aligned to one standard. Not just credentialled, but proven.",
    accent: true,
    bg: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=800&auto=format&fit=crop",
    href: "/coaching",
  },
  {
    number: 3,
    title: "Structured\nExperiences",
    body: "A clear pathway from individual coaching to team and enterprise engagement, designed for real conditions. Not classroom theory.",
    accent: false,
    bg: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?q=80&w=800&auto=format&fit=crop",
    href: "/coaching",
  },
  {
    number: 4,
    title: "Technology as\nan Enabler",
    body: "Supporting scale, quality and insight without replacing human judgment. Intelligence that surfaces the right coach at the right moment.",
    accent: false,
    bg: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?q=80&w=800&auto=format&fit=crop",
    href: "/coaching",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 bg-zinc-950">
      <div className="container-wide">

        {/* Heading */}
        <div className="text-center mb-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Galoras — The Performance Ecosystem
          </p>
          <h2 className="text-4xl md:text-5xl font-display font-black tracking-tight text-white uppercase">
            One Ecosystem.{" "}
            <span className="text-primary">One Standard.</span>
          </h2>
          <p className="mt-4 text-zinc-400 text-base max-w-2xl mx-auto">
            Connecting top-tier coaches, leaders, and organisations through one system — from individual growth to enterprise performance.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          {pillars.map((pillar) => (
            <Link
              key={pillar.number}
              to={pillar.href}
              className="group relative overflow-hidden rounded-2xl min-h-[380px] flex flex-col items-center justify-center text-center focus:outline-none"
            >
              {/* Background image */}
              <img
                src={pillar.bg}
                alt=""
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Default overlay — lighter so card looks clean */}
              <div className="absolute inset-0 bg-black/55 group-hover:bg-black/75 transition-colors duration-400" />

              {/* Title — always visible, absolutely centered */}
              <div className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center">
                <h3 className="text-xl md:text-2xl font-black uppercase leading-tight whitespace-pre-line transition-colors duration-300 text-primary group-hover:text-primary/40">
                  {pillar.title}
                </h3>
              </div>

              {/* Hover overlay — body + arrow, fades in over the title */}
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-sm text-white leading-relaxed max-w-[220px] translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                  {pillar.body}
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary mt-4">
                  Learn more <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>


      </div>
    </section>
  );
}
