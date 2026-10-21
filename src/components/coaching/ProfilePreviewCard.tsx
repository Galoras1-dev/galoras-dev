import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User } from "lucide-react";

// A compact, read-only view of a coach's drafted page, read from the same
// `coaches` row the public profile renders. Used in two places where someone
// must read the profile before saying yes to it:
//   - the coach, before submitting it for review (onboarding)
//   - the admin, before approving it (Applicants)
// It always offers the full page too, because the full page is the real thing.

type Row = {
  display_name: string | null;
  avatar_url: string | null;
  profile_image_url: string | null;
  current_role: string | null;
  headline: string | null;
  positioning_statement: string | null;
  methodology: string | null;
  bio: string | null;
};

export function ProfilePreviewCard({
  coachId,
  title = "Their page, as visitors will see it",
  tone = "dark",
}: {
  coachId: string;
  title?: string;
  tone?: "dark" | "admin";
}) {
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    supabase
      .from("coaches")
      .select("display_name, avatar_url, profile_image_url, current_role, headline, positioning_statement, methodology, bio")
      .eq("id", coachId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) setFailed(true);
        else setRow(data as Row);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [coachId]);

  const box = tone === "admin"
    ? "rounded-xl border border-violet-700/50 bg-[#0d1f35] p-5"
    : "rounded-lg border border-primary/40 bg-zinc-900/80 p-5";
  const muted = tone === "admin" ? "text-slate-400" : "text-zinc-400";
  const photo = row?.avatar_url || row?.profile_image_url;

  return (
    <div className={box}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm font-bold text-white uppercase tracking-wide">{title}</p>
        <a
          href={`/coaching/preview/${coachId}?preview=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg border border-primary/60 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
        >
          Open the full page &#8599;
        </a>
      </div>

      {loading ? (
        <div className={`flex items-center gap-2 text-sm ${muted}`}>
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the profile…
        </div>
      ) : failed || !row ? (
        <p className={`text-sm ${muted}`}>
          The summary couldn't load here. Use "Open the full page" to read it.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {photo ? (
              <img src={photo} alt="" className="h-16 w-16 rounded-xl object-cover border border-zinc-700" />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <User className="h-6 w-6 text-zinc-500" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-white">{row.display_name || "Name not set"}</p>
              {row.current_role && <p className={`text-xs ${muted}`}>{row.current_role}</p>}
              {row.headline && <p className="text-sm text-zinc-200 mt-1">{row.headline}</p>}
            </div>
          </div>
          {[
            { label: "Positioning", text: row.positioning_statement },
            { label: "How they work", text: row.methodology },
            { label: "Bio", text: row.bio },
          ].filter(s => s.text).map(s => (
            <div key={s.label}>
              <p className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>{s.label}</p>
              <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line mt-1 line-clamp-6">{s.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
