import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { LABS_ITEMS, formatLabel, getMediaBySlug, themeLabel } from "@/data/labsContent";

// Leadership Labs — one video, podcast episode or webinar recording.
// The player is embedded so it plays on Galoras (North Star: nothing routes off the platform).

const FOR_TEAM = new Set(["inner-game", "outer-game"]);

export default function LabsWatch() {
  const { slug } = useParams<{ slug: string }>();
  const item = slug ? getMediaBySlug(slug) : undefined;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [slug]);

  if (!item) {
    return (
      <Layout>
        <SEO title="Not found" description="This Leadership Labs item could not be found." />
        <section className="section-padding bg-zinc-950">
          <div className="container-wide text-center py-20">
            <h1 className="text-3xl font-display font-bold text-white mb-4">We couldn’t find that one</h1>
            <Link to="/labs"><Button className="bg-primary text-zinc-950 hover:bg-primary/90">Back to Leadership Labs</Button></Link>
          </div>
        </section>
      </Layout>
    );
  }

  const isAudio = item.format === "podcast";
  const related = LABS_ITEMS.filter((i) => i.slug !== item.slug && i.theme === item.theme).slice(0, 3);
  const forTeam = FOR_TEAM.has(item.theme);

  return (
    <Layout>
      <SEO
        title={`${item.title}${item.guest ? ` with ${item.guest}` : ""} | Leadership Labs`}
        description={item.summary}
        canonical={`/labs/watch/${item.slug}`}
      />
      <section className="pt-28 pb-12 bg-zinc-950">
        <div className="container-wide max-w-5xl">
          <Link to="/labs" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-8">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Leadership Labs
          </Link>
          <p className="text-xs font-semibold uppercase tracking-widest">
            <span className="text-primary">{formatLabel(item.format)}</span>
            <span className="text-zinc-600"> · </span>
            <span className="text-zinc-400">{themeLabel(item.theme)}</span>
          </p>
          <h1 className="text-3xl md:text-5xl font-display font-black text-white mt-3 mb-3 leading-tight">{item.title}</h1>
          {item.guest && (
            <p className="text-zinc-300 text-lg">
              with {item.guest}
              {item.guestRole ? <span className="text-zinc-500">, {item.guestRole}</span> : null}
            </p>
          )}
          <p className="text-sm text-zinc-500 mt-2">
            {item.displayDate}
            {item.length ? ` · ${item.length}` : ""}
            {item.host ? ` · Hosted by ${item.host}` : ""}
          </p>

          {item.embedUrl && (
            <div className={`mt-8 rounded-2xl overflow-hidden border border-zinc-800 bg-black ${isAudio ? "" : "aspect-video"}`}>
              <iframe
                src={item.embedUrl}
                title={item.title}
                className={isAudio ? "w-full h-[232px]" : "w-full h-full"}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          )}

          <p className="text-zinc-300 text-lg leading-relaxed mt-8 max-w-3xl">{item.summary}</p>
        </div>
      </section>

      <section className="py-14 bg-zinc-900 border-y border-zinc-800">
        <div className="container-wide max-w-5xl flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="font-display font-black text-2xl text-white">
              {forTeam ? "Want this for your leadership team?" : "Want to work on this yourself?"}
            </h2>
            <p className="text-zinc-400 mt-1">
              {forTeam ? "Galoras Enterprise, powered by Meta Team." : "Find a Galoras coach who has done it."}
            </p>
          </div>
          <Link to={forTeam ? "/enterprise" : "/coaching"}>
            <Button size="lg" className="bg-primary text-zinc-950 hover:bg-primary/90 font-bold">
              {forTeam ? "See Galoras Enterprise" : "Find a coach"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section-padding bg-zinc-950">
          <div className="container-wide max-w-5xl">
            <h2 className="font-display font-bold text-xl text-white mb-6">More on {themeLabel(item.theme)}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {related.map((r) => (
                <Link key={`${r.format}-${r.slug}`} to={r.href} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 hover:border-primary/60 transition-colors">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary">{formatLabel(r.format)}</p>
                  <p className="font-display font-bold text-white mt-2">{r.title}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}
