import { Bell, Home, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface PortalTopBarProps {
  displayName: string;
  tier: string | null;
  fitScore: number | null;
  avatarUrl: string | null;
  /** Public profile slug. Absent until the coach is approved and published. */
  slug?: string | null;
}

function getTierLabel(tier: string | null): string {
  if (!tier) return 'Pro';
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function PortalTopBar({ displayName, tier, fitScore, avatarUrl, slug }: PortalTopBarProps) {
  const tierLabel = getTierLabel(tier);

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
      {/* Left side.
          Was a "New Feed" button and a "Work | 3 RE" counter, neither of which
          did anything. Replaced with the two things a coach in here actually
          wants: out to the site, and a look at their own public page. */}
      <div className="flex items-center gap-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
        >
          <Home className="h-3.5 w-3.5" />
          Galoras
        </Link>

        {slug && (
          <a
            href={`/coach/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View my page
          </a>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Tier badge */}
        <Badge className="bg-accent/15 text-accent border border-accent/30 font-display font-semibold text-xs px-3 py-1">
          {tierLabel}
        </Badge>

        {/* Fit score */}
        <div className="flex items-center gap-1.5">
          <span className="text-accent font-display font-bold text-lg">{fitScore ?? "\u2014"}</span>
          <span className="text-muted-foreground text-xs">/100</span>
        </div>

        {/* Notification bell */}
        <button className="relative p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />
        </button>

        {/* Avatar */}
        <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-medium text-primary">
              {displayName?.charAt(0)?.toUpperCase() || 'C'}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
