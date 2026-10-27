import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

function getVisitorId(): string {
  let vid = sessionStorage.getItem("galoras_visitor_id");
  if (!vid) {
    const raw = [
      navigator.userAgent,
      screen.width,
      screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ].join("|");
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
    }
    vid = "v_" + Math.abs(hash).toString(36);
    sessionStorage.setItem("galoras_visitor_id", vid);
  }
  return vid;
}

function getSessionId(): string {
  let sid = sessionStorage.getItem("galoras_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("galoras_session_id", sid);
  }
  return sid;
}

export function usePageTracker() {
  const location = useLocation();

  useEffect(() => {
    const consent = localStorage.getItem("galoras_cookie_consent");
    if (!consent) return;

    const track = async () => {
      // Only needs to know whether someone is logged in, so read the local
      // session. getUser() went to the Auth server and held up the page.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      await supabase.from("site_visits").insert({
        visitor_id: getVisitorId(),
        session_id: getSessionId(),
        page_path: location.pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        is_authenticated: !!user,
      });
    };

    track();
  }, [location.pathname]);
}
