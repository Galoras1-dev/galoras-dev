import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Clock, FileText, Headphones, PlayCircle, Radio } from "lucide-react";
import {
  FORMATS,
  LABS_ITEMS,
  THEMES,
  formatLabel,
  themeLabel,
  type LabsFormat,
  type LabsThemeKey,
} from "@/data/labsContent";

// Leadership Labs — the Galoras content hub (17 Oct 2026).
// Articles, video conversations, podcast and webinars with leaders and athletes,
// organised by the four coaching pillars (for you) and Meta Team's inner and
// outer game (for your team). Content is added in src/data/labsContent.ts.

const FORMAT_ICON: Record<LabsFormat, typeof FileText> = {
  article: FileText,
  video: PlayCircle,
  podcast: Headphones,
  webinar: Radio,
};

export default function Labs() {
  const { toast } = useToast();
  const [format, setFormat] = useState<LabsFormat | "all">("all");
  const [theme, setTheme] = useState<LabsThemeKey | "all">("all");
  const [guest, setGuest] = useState({ name: "", email: "", story: "" });
  const [updatesEmail, setUpdatesEmail] = useState("");
  const [sending, setSending] = useState<"guest" | "updates" | null>(null);

  const items = useMemo(
    () => LABS_ITEMS.filter((i) => (format === "all" || i.format === format) && (theme === "all" || i.theme === theme)),
    [format, theme],
  );
  const countByFormat = (f: LabsFormat) => LABS_ITEMS.filter((i) => i.format === f).length;

  // Same channel as the contact page: emails conor@galoras.com, stores nothing.
  const send = async (kind: "guest" | "updates") => {
    setSending(kind);
    try {
      const body =
        kind === "guest"
          ? { alertType: "customer_request", name: guest.name, email: guest.email, coachName: "Leadership Labs", product: "Labs guest application", goal: guest.story, context: "", urgency: "low" }
          : { alertType: "customer_request", name: "Labs subscriber", email: updatesEmail, coachName: "Leadership Labs", product: "Labs updates sign-up", goal: "Send me new Leadership Labs conversations.", context: "", urgency: "low" };
      const { error } = await supabase.functions.invoke("send-admin-alert", { body });
      if (error) throw error;
      toast({ title: "Thanks, that's with us", description: kind === "guest" ? "We'll be in touch about a conversation." : "We'll let you know when new conversations go live." });
      if (kind === "guest") setGuest({ name: "", email: "", story: "" });
      else setUpdatesEmail("");
    } catch (err) {
      console.error("Labs form failed:", err);
      toast({ title: "That didn't send", description: "Please email conor@galoras.com and it will reach the right person.", variant: "destructive" });
    } finally {
      setSending(null);
    }
  };

  const chip = (active: boolean) =>
    `px-4 py-2 rounded-full text-sm font-semibold border transition-colors min-h-[40px] ${
      active ? "bg-primary text-zinc-950 border-primary" : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
    }`;

  return (
    <Layout>
      <SEO
        title="Leadership Labs"
        description="Conversations with people who have performed under real pressure: articles, video conversations, podcast and webinars with leaders and athletes, from Galoras."
        canonical="/labs"
      />

      {/* Hero */}
      <section className="relative pt-32 pb-16 bg-zinc-950">
        <div className="container-wide">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">Leadership Labs</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tight text-white max-w-4xl leading-[1.05] mb-6">
            Conversations with people who have performed under real pressure.
          </h1>
          <p className="text-zinc-300 text-lg md:text-xl max-w-2xl">
            Leaders, operators and athletes on what it actually takes to decide and then do. Articles, video conversations, a podcast and live webinars.
          </p>
        </div>
      </section>

      {/* Formats */}
      <section className="pb-12 bg-zinc-950">
        <div className="container-wide grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FORMATS.map((f) => {
            const Icon = FORMAT_ICON[f.key];
            const n = countByFormat(f.key);
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFormat(format === f.key ? "all" : f.key)}
                className={`text-left rounded-2xl border p-6 transition-colors ${
                  format === f.key ? "border-primary bg-zinc-900" : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600"
                }`}
              >
                <Icon className="h-6 w-6 text-primary mb-3" aria-hidden="true" />
                <p className="font-display font-bold text-white text-lg">{f.plural}</p>
                <p className="text-sm text-zinc-400 mt-1">{f.blurb}</p>
                <p className="text-xs text-zinc-500 mt-3">{n > 0 ? `${n} published` : "First episodes from January 2027"}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Library */}
      <section id="library" className="section-padding bg-zinc-900 border-y border-zinc-800">
        <div className="container-wide">
          <div className="flex flex-col gap-4 mb-10">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by format">
              <button type="button" className={chip(format === "all")} onClick={() => setFormat("all")}>All formats</button>
              {FORMATS.map((f) => (
                <button key={f.key} type="button" className={chip(format === f.key)} onClick={() => setFormat(f.key)}>{f.plural}</button>
              ))}
            </div>
            {(["For you", "For your team"] as const).map((group) => (
              <div key={group} className="flex flex-wrap items-center gap-2" role="group" aria-label={`Themes ${group.toLowerCase()}`}>
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 w-28">{group}</span>
                {THEMES.filter((t) => t.group === group).map((t) => (
                  <button key={t.key} type="button" title={t.blurb} className={chip(theme === t.key)} onClick={() => setTheme(theme === t.key ? "all" : t.key)}>
                    {t.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-700 p-12 text-center">
              <p className="text-white font-display font-bold text-xl">Nothing here yet.</p>
              <p className="text-zinc-400 mt-2">New conversations start in January 2027. Sign up below and we’ll tell you when they go live.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => {
                const Icon = FORMAT_ICON[item.format];
                return (
                  <Link
                    key={`${item.format}-${item.slug}`}
                    to={item.href}
                    className="group rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden hover:border-primary/60 transition-colors flex flex-col"
                  >
                    {item.thumbnail ? (
                      <div className="aspect-video bg-zinc-800 relative">
                        <img src={item.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                        {item.format !== "article" && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Icon className="h-14 w-14 text-white/90 drop-shadow" aria-hidden="true" />
                          </span>
                        )}
                      </div>
                    ) : null}
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
                        <span className="inline-flex items-center gap-1 text-primary">
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          {formatLabel(item.format)}
                        </span>
                        <span className="text-zinc-600">·</span>
                        <span className="text-zinc-400">{themeLabel(item.theme)}</span>
                      </div>
                      <h3 className="font-display font-bold text-xl text-white mt-3 group-hover:text-primary transition-colors">{item.title}</h3>
                      {item.guest && (
                        <p className="text-sm text-zinc-300 mt-1">
                          with {item.guest}
                          {item.guestRole ? <span className="text-zinc-500">, {item.guestRole}</span> : null}
                        </p>
                      )}
                      <p className="text-sm text-zinc-400 mt-3 flex-1">{item.summary}</p>
                      <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-800 pt-4 mt-5">
                        <span>{item.host ?? ""}</span>
                        <span className="flex items-center gap-3">
                          <span>{item.displayDate}</span>
                          {item.length && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" aria-hidden="true" />
                              {item.length}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Two lenses */}
      <section className="section-padding bg-zinc-950">
        <div className="container-wide grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest">For you</p>
            <h2 className="font-display font-black text-2xl text-white mt-3 mb-3">Leadership, performance, transition, mindset</h2>
            <p className="text-zinc-300 text-sm leading-relaxed mb-6">The four areas Galoras coaches work on with individual leaders. If a conversation lands, find a coach who has done it.</p>
            <Link to="/coaching" className="text-primary font-semibold text-sm hover:underline underline-offset-4">Find a coach →</Link>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest">For your team</p>
            <h2 className="font-display font-black text-2xl text-white mt-3 mb-3">The inner game and the outer game</h2>
            <p className="text-zinc-300 text-sm leading-relaxed mb-6">How a team works together, and the impact it has on everyone else: the eight habits measured in Galoras Enterprise, powered by Meta Team.</p>
            <Link to="/enterprise" className="text-primary font-semibold text-sm hover:underline underline-offset-4">See Galoras Enterprise →</Link>
          </div>
        </div>
      </section>

      {/* Be a guest + updates */}
      <section className="section-padding bg-zinc-100 text-zinc-900">
        <div className="container-wide grid lg:grid-cols-2 gap-12">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest">Be a guest</p>
            <h2 className="font-display font-black text-3xl mt-3 mb-3">Performed under real pressure? Tell the story properly.</h2>
            <p className="text-zinc-600 mb-6">
              Guests get a filmed conversation, the clips to keep for their own channels, and the chance to join Galoras Enterprise engagements as a speaker, so they’re paid as part of the work, with no vendor set-up.
            </p>
            <form
              onSubmit={(e) => { e.preventDefault(); send("guest"); }}
              className="grid sm:grid-cols-2 gap-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="g-name" className="font-semibold">Name *</Label>
                <Input id="g-name" required value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-email" className="font-semibold">Email *</Label>
                <Input id="g-email" type="email" required value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} className="bg-white" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="g-story" className="font-semibold">Your story, in a few lines *</Label>
                <Textarea id="g-story" required rows={3} value={guest.story} onChange={(e) => setGuest({ ...guest, story: e.target.value })} className="bg-white" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={sending === "guest"} className="bg-zinc-950 text-white hover:bg-zinc-800 font-bold">
                  {sending === "guest" ? "Sending…" : "Apply to be a guest"}
                </Button>
              </div>
            </form>
          </div>
          <div className="lg:border-l lg:border-zinc-300 lg:pl-12">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest">Stay in the loop</p>
            <h2 className="font-display font-black text-3xl mt-3 mb-3">Get new conversations first.</h2>
            <p className="text-zinc-600 mb-6">Webinars and new episodes start in January 2027. Leave your email and we’ll tell you when they go live.</p>
            <form onSubmit={(e) => { e.preventDefault(); send("updates"); }} className="flex flex-col sm:flex-row gap-3">
              <Label htmlFor="u-email" className="sr-only">Email</Label>
              <Input id="u-email" type="email" required placeholder="you@company.com" value={updatesEmail} onChange={(e) => setUpdatesEmail(e.target.value)} className="bg-white" />
              <Button type="submit" disabled={sending === "updates"} className="bg-primary text-zinc-950 hover:bg-primary/90 font-bold">
                {sending === "updates" ? "Sending…" : "Keep me posted"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </section>
    </Layout>
  );
}
