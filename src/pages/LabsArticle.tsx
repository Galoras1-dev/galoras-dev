import { useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { getArticleBySlug, labsArticles } from "@/data/labsArticles";

export default function LabsArticle() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const article = slug ? getArticleBySlug(slug) : undefined;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [slug]);

  if (!article) {
    return (
      <Layout>
        <SEO title="Article Not Found" description="This article could not be found." />
        <section className="section-padding bg-background">
          <div className="container-wide text-center py-20">
            <h1 className="text-3xl font-display font-bold mb-4">Article not found</h1>
            <p className="text-muted-foreground mb-8">
              We couldn't find the piece you were looking for.
            </p>
            <Button onClick={() => navigate("/labs")} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Back to Leadership Labs
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  // Suggest up to two other articles
  const others = labsArticles.filter((a) => a.slug !== article.slug).slice(0, 2);

  return (
    <Layout>
      <SEO
        title={article.title}
        description={article.subtitle}
        canonical={`/labs/${article.slug}`}
      />

      {/* Header */}
      <article>
        <section className="relative pt-32 pb-12 bg-gradient-to-b from-muted/50 to-background">
          <div className="container-wide">
            <div className="max-w-2xl mx-auto">
              <Link
                to="/labs"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
              >
                <ArrowLeft className="h-4 w-4" />
                Leadership Labs
              </Link>
              <Badge className="bg-primary/90 text-primary-foreground hover:bg-primary mb-5">
                {article.tag}
              </Badge>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4 leading-tight">
                {article.title}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-6">
                {article.subtitle}
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground border-t border-border pt-5">
                <span className="font-medium text-foreground">{article.author}</span>
                <span>·</span>
                <span>{article.displayDate}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {article.readingTime}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="pb-20 bg-background">
          <div className="container-wide">
            <div className="max-w-2xl mx-auto">
              {article.body.map((block, i) => {
                if (block.startsWith("## ")) {
                  return (
                    <h2
                      key={i}
                      className="text-2xl md:text-3xl font-display font-bold mt-12 mb-4"
                    >
                      {block.replace(/^##\s+/, "")}
                    </h2>
                  );
                }
                if (block.startsWith("> ")) {
                  return (
                    <blockquote
                      key={i}
                      className="border-l-2 border-primary pl-5 my-8 text-xl font-display italic text-foreground"
                    >
                      {block.replace(/^>\s+/, "")}
                    </blockquote>
                  );
                }
                return (
                  <p
                    key={i}
                    className="text-base md:text-lg text-foreground/90 leading-relaxed mb-5"
                  >
                    {block}
                  </p>
                );
              })}
            </div>
          </div>
        </section>
      </article>

      {/* Keep reading */}
      {others.length > 0 && (
        <section className="section-padding bg-muted/30 border-t border-border">
          <div className="container-wide">
            <h2 className="text-2xl font-display font-bold mb-8 text-center">
              Keep Reading
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {others.map((a) => (
                <Link
                  key={a.slug}
                  to={`/labs/${a.slug}`}
                  className="group block bg-card rounded-2xl border border-border p-6 hover:border-primary/50 transition-all card-hover"
                >
                  <Badge className="bg-primary/90 text-primary-foreground hover:bg-primary mb-3">
                    {a.tag}
                  </Badge>
                  <h3 className="font-display font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                    {a.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">{a.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="section-padding hero-gradient">
        <div className="container-wide text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Bring the <span className="text-gradient">Sport of Business</span> to Your Team
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            A structured methodology for how leadership teams align, decide, and execute.
          </p>
          <Link to="/business/sport-of-business">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
              Explore the Framework
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
