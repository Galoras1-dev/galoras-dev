-- Block 1 · The transcript reaches the platform · 6 October 2026
--
-- Whereby Session Transcription writes a transcript from the live session (no
-- recording). When it is ready Whereby calls the whereby-webhook function, which
-- downloads it, stores it here against the session, and deletes Whereby's copy.
--
-- Run PREFLIGHT first. This file is safe to re-run.
-- Admin = a row in public.user_roles with role 'admin' (has_role() does not
-- exist in production, despite older migration files defining it).

-- 1. The webhook identifies a room only by its name (last path segment of the
--    room URL). Store it on the session so the transcript can be matched.
alter table public.sessions
  add column if not exists whereby_room_name text;

update public.sessions
set whereby_room_name = regexp_replace(whereby_room_url, '^https?://[^/]+/([^/?#]+).*$', '\1')
where whereby_room_url is not null
  and whereby_room_name is null;

create index if not exists sessions_whereby_room_name_idx
  on public.sessions (whereby_room_name);

-- 2. Transcripts.
create table if not exists public.session_transcripts (
  id                        uuid primary key default gen_random_uuid(),
  session_id                uuid references public.sessions(id) on delete cascade,
  whereby_transcription_id  text not null unique,
  whereby_room_name         text not null,
  whereby_room_session_id   text,
  status                    text not null default 'in_progress'
                            check (status in ('in_progress', 'ready', 'failed')),
  content                   text,
  filename                  text,
  duration_seconds          integer,
  error                     text,
  whereby_deleted_at        timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists session_transcripts_session_id_idx
  on public.session_transcripts (session_id);

-- 3. Access. Writes happen only through edge functions (service role), so there
--    are no insert/update/delete policies. Reads: the two people in the session,
--    and admins. A transcript that matched no session (session_id null) is
--    visible to admins only.
alter table public.session_transcripts enable row level security;

drop policy if exists "Participants read their session transcripts" on public.session_transcripts;
create policy "Participants read their session transcripts"
  on public.session_transcripts for select
  to authenticated
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_transcripts.session_id
        and (
          s.client_id = auth.uid()
          or s.coach_id in (select c.id from public.coaches c where c.user_id = auth.uid())
        )
    )
  );

drop policy if exists "Admins read all session transcripts" on public.session_transcripts;
create policy "Admins read all session transcripts"
  on public.session_transcripts for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid() and r.role = 'admin'
    )
  );
