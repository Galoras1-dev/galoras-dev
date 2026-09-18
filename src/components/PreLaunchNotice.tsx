import { Link } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────────────────
// Pre-launch notice.
//
// Galoras is live and being tested in public while coaches are invited and
// onboarded. Visitors arriving from LinkedIn, Substack or a direct link will
// meet rough edges, and the honest thing is to say so before they find one
// rather than after.
//
// Deliberately not dismissible. Somebody who closes it and then hits a bug is
// exactly the person it was written for.
//
// DELETE THIS COMPONENT AND ITS TWO LINES IN Index.tsx AT PUBLIC LAUNCH.
// Nothing else imports it.
// ─────────────────────────────────────────────────────────────────────────────

export function PreLaunchNotice() {
  return (
    <div className="bg-primary/10 border-b border-primary/25">
      <div className="container-wide py-3">
        <p className="text-sm text-center text-muted-foreground leading-relaxed">
          <span className="font-semibold text-primary uppercase tracking-wider text-xs mr-2">
            Pre-launch
          </span>
          Galoras opens to the public in{" "}
          <span className="text-foreground font-medium">January 2027</span>. What
          you&rsquo;re seeing is real and still being built, so some of it will be
          rough. You&rsquo;re very welcome to look around &mdash;{" "}
          <Link
            to="/contact"
            className="text-primary underline underline-offset-4 hover:text-primary/80 whitespace-nowrap"
          >
            Tell us what breaks
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
