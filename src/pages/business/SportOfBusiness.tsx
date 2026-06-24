import { Link } from "react-router-dom";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Target,
  Brain,
  Zap,
  Users,
  Shield,
  BarChart3,
} from "lucide-react";

const pillars = [
  {
    icon: Target,
    title: "Alignment",
    description:
      "Leadership teams that can't agree on direction don't execute. The Sport of Business starts by establishing shared clarity on what matters, why it matters, and who owns what.",
  },
  {
    icon: Brain,
    title: "Decision-Making Under Pressure",
    description:
      "Speed and quality of decisions under pressure is what separates high-performing teams from the rest. We install the structures and disciplines that make good decisions repeatable.",
  },
  {
    icon: Zap,
    title: "Execution Discipline",
    description:
      "Execution fails when accountability is unclear and follow-through is optional. The Sport of Business builds the disciplines that close the gap between intention and outcome.",
  },
];

const differentiators = [
  {
    icon: Users,
    title: "Teams as Performance Units",
    description:
      "We don't coach individuals in isolation. The Sport of Business measures and improves how your leadership team functions as a unit. That is where performance is won or lost.",
  },
  {
    icon: Shield,
    title: "Built for Real Conditions",
    description:
      "Not classroom theory. Every intervention is designed to be applied under the actual pressure, pace, and constraints your team faces. Not in a controlled environment.",
  },
  {
    icon: BarChart3,
    title: "Grounded in Data",
    description:
      "We diagnose before we intervene. Sequenced improvements are based on your team's actual execution patterns. Not a generic programme applied to every organisation.",
  },
];

const formats = [
  {
    title: "Leadership Team Diagnostic",
    duration: "Discovery Engagement",
    description:
      "A structured assessment of how your leadership team currently aligns, decides, and executes. Identifies the specific friction points that are limiting performance.",
    features: [
      "360-degree team assessment",
      "Execution pattern mapping",
      "Prioritised intervention plan",
      "Debrief with leadership team",
    ],
  },
  {
    title: "Sport of Business Programme",
    duration: "Structured Engagement",
    description:
      "A sequenced series of facilitated sessions that install alignment, decision quality, and execution discipline across your leadership team.",
    features: [
      "Facilitated working sessions",
      "Real-time application",
      "Accountability structures",
      "Progress measurement",
    ],
  },
  {
    title: "Enterprise Deployment",
    duration: "Custom Scope",
    description:
      "For organisations deploying The Sport of Business across multiple teams or divisions, scaled without losing the rigour.",
    features: [
      "Multi-team facilitation",
      "Internal champion development",
      "Cross-team alignment sessions",
      "Ongoing performance support",
    ],
  },
];

export default function SportOfBusiness() {
  return (
    <Layout>
      <SEO
        title="The Sport of Business"
        description="The Sport of Business is Galoras's flagship performance framework for leadership teams. Not a motivational programme — a structured methodology for alignment, decision-making, and execution."
        canonical="/business/sport-of-business"
      />
      <section className="relative pt-32 pb-20 overflow-hidden bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.10),transparent_55%)]" />
        <div className="container-wide relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">
              Galoras Flagship Framework
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tight text-white uppercase mb-6">
              The Sport of <span className="text-gradient">Business</span>
            </h1>
            <p className="text-zinc-300 text-lg md:text-xl max-w-2xl mx-auto mb-4">
              Business is a team sport. It demands alignment, fast decision-making, and execution under pressure — the same disciplines that separate elite sports teams from the rest.
            </p>
            <p className="text-zinc-400 text-base max-w-2xl mx-auto mb-10">
              The Sport of Business is not a motivational programme. A structured methodology for improving how teams align, decide, and execute in real conditions.
            </p>
            <Link to="/contact">
              <Button size="lg" className="bg-primary text-zinc-950 hover:bg-primary/90 font-bold">
                Start the Conversation
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* The Framework */}
      <section className="section-padding bg-zinc-900 border-y border-zinc-800">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-3">
              The <span className="text-gradient">Framework</span>
            </h2>
            <p className="text-zinc-400 text-base max-w-2xl mx-auto">
              Three disciplines. Every high-performing team has them. Most leadership teams are missing at least one.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 relative">
            {pillars.map((pillar, i) => (
              <div
                key={i}
                className="relative p-8 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-primary/40 transition-colors text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 mx-auto">
                  <pillar.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{pillar.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{pillar.description}</p>
                {i < 2 && (
                  <ArrowRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/40 z-10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why It's Different */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Why It's <span className="text-gradient">Different</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              The Sport of Business is not a leadership workshop. It is a performance intervention — designed for teams that are already operating, under real pressure, with real consequences.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {differentiators.map((item, i) => (
              <Card key={i} className="group hover:border-primary/50 transition-all card-hover">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About the Framework */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm text-primary font-semibold uppercase tracking-widest mb-4">
              Built from the inside
            </p>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-5">
              Designed by Someone Who's Been in the <span className="text-gradient">Arena</span>
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed mb-4 max-w-2xl mx-auto">
              The Sport of Business was not designed by consultants observing from the outside. It was built from experience leading $100M+ revenue businesses across Europe, the Caribbean, Latin America, and the United States, through growth, transformation, and disruption.
            </p>
            <p className="text-muted-foreground text-base leading-relaxed max-w-2xl mx-auto">
              The disciplines in this framework are not theoretical. They were stress-tested in real operating conditions, refined over two decades, and validated against what actually separates high-performing leadership teams from the rest.
            </p>
          </div>
        </div>
      </section>

      {/* Engagement Formats */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              How We <span className="text-gradient">Engage</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Every engagement starts with understanding your team's actual execution environment — then we design accordingly.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {formats.map((format, i) => (
              <Card key={i} className="relative overflow-hidden hover:border-primary/50 transition-all">
                <CardContent className="p-8">
                  <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">
                    {format.duration}
                  </p>
                  <h3 className="text-xl font-display font-bold mb-3">{format.title}</h3>
                  <p className="text-muted-foreground text-sm mb-6 leading-relaxed">{format.description}</p>
                  <ul className="space-y-2">
                    {format.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <Zap className="h-3 w-3 text-primary shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-zinc-950">
        <div className="container-wide text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Ready to Build a <span className="text-gradient">High-Performance</span> Team?
          </h2>
          <p className="text-zinc-400 text-lg mb-8 max-w-xl mx-auto">
            Start with a conversation about your team's specific execution challenges.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact">
              <Button size="lg" className="bg-primary text-zinc-950 hover:bg-primary/90 font-bold">
                Book a Business Consultation
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/labs">
              <Button size="lg" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                Explore Leadership Labs
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
