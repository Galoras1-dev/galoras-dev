// Leadership Labs — everything that appears on /labs.
//
// Four formats: articles, video conversations, podcast episodes, webinars.
// Articles live in labsArticles.ts (they have full text). Everything else is
// added here, in MEDIA below, newest first. See "HOW TO ADD AN ITEM" at the bottom.
//
// Every item carries one THEME. Themes come in two groups:
//   - "For you"       the four Galoras Coaching pillars (individual leaders)
//   - "For your team" Meta Team's inner and outer game (Galoras Enterprise)
// Rule: nothing goes on the page that isn't published. No "coming soon" cards.

import { labsArticles } from "./labsArticles";

export type LabsFormat = "article" | "video" | "podcast" | "webinar";

export type LabsThemeKey =
  | "leadership"
  | "performance"
  | "transition"
  | "mindset"
  | "inner-game"
  | "outer-game";

export const FORMATS: { key: LabsFormat; label: string; plural: string; blurb: string }[] = [
  { key: "article", label: "Article", plural: "Articles", blurb: "Long-form thinking from operators and coaches." },
  { key: "video", label: "Video", plural: "Video conversations", blurb: "Filmed conversations with leaders and athletes." },
  { key: "podcast", label: "Podcast", plural: "Podcast", blurb: "The same conversations, for the car or the gym." },
  { key: "webinar", label: "Webinar", plural: "Webinars", blurb: "Live sessions with guests, open to everyone." },
];

export const THEMES: { key: LabsThemeKey; label: string; group: "For you" | "For your team"; blurb: string }[] = [
  { key: "leadership", label: "Leadership", group: "For you", blurb: "Leading people, and leading yourself." },
  { key: "performance", label: "Performance", group: "For you", blurb: "Doing your best work under pressure." },
  { key: "transition", label: "Transition", group: "For you", blurb: "New roles, new chapters, hard moves." },
  { key: "mindset", label: "Mindset & Alignment", group: "For you", blurb: "Purpose, confidence and resilience." },
  { key: "inner-game", label: "Inner game", group: "For your team", blurb: "Trust, resilience, purpose and focus inside a team." },
  { key: "outer-game", label: "Outer game", group: "For your team", blurb: "Taking action, influencing, agility and adapting." },
];

export interface LabsItem {
  slug: string;
  format: LabsFormat;
  title: string;
  summary: string;           // one or two sentences for the card
  theme: LabsThemeKey;
  date: string;              // ISO yyyy-mm-dd
  displayDate: string;       // e.g. "14 January 2027"
  length?: string;           // "7 min read", "42 min"
  guest?: string;            // "Colin Judge"
  guestRole?: string;        // "Paralympian, table tennis"
  host?: string;             // "Conor McGowan Smyth"
  thumbnail?: string;        // image URL (Supabase storage), 16:9
  embedUrl?: string;         // YouTube / Vimeo / Spotify EMBED url — plays on Galoras
  href: string;              // where the card goes
}

// Old article tags → themes.
const TAG_TO_THEME: Record<string, LabsThemeKey> = {
  "Leadership Development": "leadership",
  "Mindset & Mental Performance": "mindset",
};

const ARTICLES: LabsItem[] = labsArticles.map((a) => ({
  slug: a.slug,
  format: "article",
  title: a.title,
  summary: a.excerpt,
  theme: TAG_TO_THEME[a.tag] ?? "leadership",
  date: a.date,
  displayDate: a.displayDate,
  length: a.readingTime,
  host: a.author,
  href: `/labs/${a.slug}`,
}));

// ── VIDEO, PODCAST AND WEBINAR ITEMS ─────────────────────────────────────────
// Newest first. Copy the example below, remove the // marks, fill it in.
const MEDIA: LabsItem[] = [
  // {
  //   slug: "colin-judge-resilience",
  //   format: "video",
  //   title: "What table tennis taught me about pressure",
  //   summary: "Colin Judge on qualifying for the Worlds, and what leaders can take from it.",
  //   theme: "performance",
  //   date: "2027-01-14",
  //   displayDate: "14 January 2027",
  //   length: "38 min",
  //   guest: "Colin Judge",
  //   guestRole: "Paralympian, table tennis",
  //   host: "Conor McGowan Smyth",
  //   thumbnail: "https://qbjuomsmnrclsjhdsjcz.supabase.co/storage/v1/object/public/labs/colin-judge.jpg",
  //   embedUrl: "https://www.youtube-nocookie.com/embed/VIDEO_ID",
  //   href: "/labs/watch/colin-judge-resilience",
  // },
];

export const LABS_ITEMS: LabsItem[] = [...MEDIA, ...ARTICLES].sort((a, b) => b.date.localeCompare(a.date));

export function getMediaBySlug(slug: string): LabsItem | undefined {
  return MEDIA.find((m) => m.slug === slug);
}

export function themeLabel(key: LabsThemeKey): string {
  return THEMES.find((t) => t.key === key)?.label ?? key;
}

export function formatLabel(key: LabsFormat): string {
  return FORMATS.find((f) => f.key === key)?.label ?? key;
}

/*
HOW TO ADD AN ITEM
1. Upload the video to YouTube (or Vimeo), or the episode to your podcast host.
2. Get the EMBED link:
   - YouTube: Share → Embed → copy the src, e.g. https://www.youtube-nocookie.com/embed/abc123
   - Spotify: Share → Embed episode → copy the src, e.g. https://open.spotify.com/embed/episode/xyz
3. Upload a 16:9 thumbnail to Supabase Storage, bucket "labs" (public), and copy its URL.
4. Copy the example in MEDIA, fill it in, set href to /labs/watch/<slug>.
5. Articles: add to labsArticles.ts as before — they appear here automatically.
*/
