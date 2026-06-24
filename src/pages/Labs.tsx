import { Link } from "react-router-dom";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  FlaskConical,
  Calendar,
  Clock,
} from "lucide-react";
import { labsArticles } from "@/data/labsArticles";

export default function Labs() {
  return (
    <Layout>
      <SEO
        title="Leadership Labs"
        description="Leadership Labs is the Galoras content hub: essays on performance, mindset, and leadership from the people building the Sport of Business. Live workshops and events from October 2026."
        canonical="/labs"
      />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-b from-muted/50 to-background">
        <div className="container-wide relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <FlaskConical className="h-4 w-4" />
              IDEAS &amp; INSIGHT
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-4">
              <span className="text-gradient">LEADERSHIP LABS</span>
            </h1>
            <p className="text-lg text-foreground font-medium mb-4 max-w-xl mx-auto">
              The thinking behind the Sport of Business — essays on performance, mindset, and what actually separates high-performing leaders and teams from the rest.
            </p>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">
              Written by the operators and coaches inside the Galoras network. New pieces published regularly.
            </p>
          </div>
        </div>
      </section>

      {/* Articles */}
      <section id="articles" className="section-padding bg-background">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Latest <span className="text-gradient">Writing</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Long-form thinking on leadership, performance psychology, and the discipline behind high performance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {labsArticles.map((article) => (
              <Link
                key={article.slug}
                to={`/labs/${article.slug}`}
                className="group block bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/50 transition-all card-hover"
              >
                <div className="p-6 flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-primary/90 text-primary-foreground hover:bg-primary">
                      {article.tag}
                    </Badge>
                  </div>
                  <h3 className="font-display font-semibold text-xl mb-3 line-clamp-3 group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-6 line-clamp-3 flex-1">
                    {article.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-4">
                    <span>{article.author}</span>
                    <span className="flex items-center gap-3">
                      <span>{article.displayDate}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {article.readingTime}
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Live Labs — coming soon (honest forward state, no fabricated events) */}
      <section id="events" className="section-padding bg-muted/30 border-y border-border">
        <div className="container-wide">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Calendar className="h-4 w-4" />
              LIVE LABS &amp; WORKSHOPS
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              In-Person &amp; Virtual Labs <span className="text-gradient">from October 2026</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              We're building a calendar of facilitated Leadership Labs — immersive sessions where teams practise the Sport of Business in real time, alongside guest speakers and workshops. Register your interest and we'll let you know when dates open.
            </p>
            <Link to="/contact">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
                Register Your Interest
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding hero-gradient">
        <div className="container-wide text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Looking for a <span className="text-gradient">Coach?</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Explore the Galoras network of vetted executive and performance coaches.
          </p>
          <Link to="/coaching">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
              Browse Coaches
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
