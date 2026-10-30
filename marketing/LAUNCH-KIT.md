# win98-run — Launch Kit (Phase E)

Everything needed to announce win98-run. Post from your own accounts;
review each text before posting (this kit is a draft, not an auto-post).

## Positioning

**One-liner:** Windows 98 in your browser that runs *your own* retro
software — DOS games in windows on the desktop, and a real x86 PC for your
own Windows disk images.

**Elevator pitch:** Most "Windows in the browser" sites are screenshots
with buttons. win98-run boots a faithful Windows 98 desktop, then goes
further: drop in your own DOS games and they run (DOSBox), or import your
own Windows disk image / installer ISO and run an actual PC (v86) — save
the whole machine mid-install, close the tab, resume later, optionally
sync that state to the cloud. Nothing is distributed and nothing is
uploaded unless you ask: we ship the computer, you bring the discs.

**Proof points (all true today):**
- Boots to a working 98 desktop in ~1s; Digger demo playable instantly.
- DOS import verified with .zip/.jsdos/.EXE/.COM/.BAT; per-game settings.
- XP SP3 installer ISO (user-provided) verified to Windows Setup.
- Whole-machine save states resume mid-install; cloud download→resume
  verified byte-for-byte across two browsers.
- Live billing: free local forever; Plus $6/mo or $60/yr.

**Honest limits (say them before commenters do):** no 3D acceleration,
XP is Pentium-slow, sound is best-effort, standalone Windows .EXE files
need the v86 PC (they don't run in DOS mode). Private relay: do not claim
it is live until `https://relay.win98run.app/healthz` returns `ok` —
until then say "private relay included with Plus, rolling out now."

**Assets:** `assets/screenshot.png` (hero), `assets/demo.gif` (Digger),
`assets/og-image.png` (social card). Record one 30–45s clip (script below)
— motion outsells screenshots everywhere.

## Link discipline

Use UTM links so Vercel Analytics shows what worked:
- Product Hunt: `https://win98run.app/?utm_source=producthunt&utm_medium=launch`
- Hacker News: `https://win98run.app/?utm_source=hackernews&utm_medium=launch`
- Reddit: `https://win98run.app/?utm_source=reddit&utm_medium=launch&utm_campaign=<subreddit>`
- X: `https://win98run.app/?utm_source=x&utm_medium=launch`

## Launch sequence (recommended)

Do not blast everything the same hour; stagger so you can answer comments.

1. **Day 0, 12:01am PT — Product Hunt** (schedule the night before).
2. **Day 0, ~8–9am ET — Show HN.**
3. **Day 1–2 — Reddit**, one subreddit per day max, tailored posts below.
4. **Day 2–3 — X thread** + the 30s clip; pin it.
5. Ongoing: reply to every comment the first 48h; log requests in GitHub
   Issues; ship one fix/improvement from feedback within the week and
   post the follow-up.

Best days: Tue–Thu. Avoid launching the same day as a big Apple/Nintendo
event.

## Product Hunt

- **Name:** win98-run
- **Tagline (60 chars):** Windows 98 in your browser — bring your own retro PC
- **Topics:** pick up to 3 available, best fits first: "Retro",
  "Emulation", "Web App", "Games".
- **Description:**
  > win98-run boots a full Windows 98 desktop in your browser — then lets
  > you actually use it. Run your own DOS games (drag in a .zip/.EXE, they
  > play in a window via DOSBox), or open the built-in x86 PC, import your
  > own Windows disk image or installer ISO, and install/run real Windows
  > with save-state snapshots you can resume later — even synced to the
  > cloud. We distribute no Microsoft software and no games: like a PC you
  > bring your own discs to. Local use is free forever; Plus ($6/mo) adds
  > multi-state cloud sync (25 GB) and a private network relay.
- **First comment (post immediately):**
  > Hi PH — maker here. This started as "what if win32.run, but 98?" and
  > turned into two emulators in a trench coat: DOSBox for your DOS games,
  > and a real x86 PC (v86) that installs Windows XP from your own ISO and
  > resumes mid-setup from a saved snapshot. Everything runs locally in
  > your browser; accounts/cloud are optional. I'd love feedback on what
  > to build next — Boxedwine for standalone Win32 .exe files is the big
  > one on my list. Happy to answer anything, including the limits (no 3D
  > acceleration, XP is authentically slow).
- **Gallery order:** screenshot.png → demo.gif → XP Setup screenshot →
  cloud Account window → OG image.

## Hacker News (Show HN)

- **Title:** Show HN: Win98-run – Windows 98 in the browser that runs your own DOS/Windows software
- **Text:**
  > I built a Windows 98 desktop simulation with two real engines inside:
  > js-dos/DOSBox for user-supplied DOS programs (zip/jsdos/single EXE),
  > and v86 for user-supplied Windows disk images and installer ISOs.
  > Whole-machine save states persist in IndexedDB and optionally sync
  > (Supabase) so a Windows install can be resumed on another machine.
  > Networking is a NE2000 card via Wisp relays. Everything client-side;
  > no Microsoft binaries or games are distributed — users bring their
  > own images. Free locally; a paid tier funds cloud storage/relay.
  > Stack: vanilla JS static site, v86 + js-dos from CDN, Supabase auth/
  > storage, Stripe via small serverless functions. Write-up of the
  > save-state and relay-token design is in the repo README. Feedback
  > welcome — especially from people who get their own 98/XP images
  > booting; guest-prep notes are in the README.
- Post the bare `https://win98run.app` link (HN style), be in the thread
  all day, answer technically, never argue.

## X / Twitter thread

1. I built Windows 98 in the browser — and it actually runs your old
   software. Boot it: [link] [attach demo.gif]
2. Drop in your own DOS games (.zip, .EXE…) and they play in a window.
   There's also a real x86 PC inside: import your Windows disk image or
   install XP from your own ISO.
3. My favorite part: hit Save State mid–Windows-install, close the tab,
   come back tomorrow and it resumes exactly there. With an account it
   syncs to the cloud too.
4. We ship zero Microsoft software and zero games — it's a PC you bring
   your own discs to. Local use is free forever. Plus ($6/mo) funds cloud
   sync + a private relay.
5. The code's all on GitHub. What should I build next — standalone
   Win32 .exe support (Boxedwine) is top of my list. [repo link]

Hashtags (max 2, on post 1 only): #retrogaming #emulation

## Reddit

Rules first: every subreddit below restricts self-promotion. Always
disclose "I made this," post as a genuine contribution (a clip + what you
learned beats a bare link), one subreddit per day, and be active in the
comments. Check each sub's rules/wiki the day you post; use the UTM link
with `utm_campaign=<sub>`.

**r/retrogaming** — Title: "I built a Windows 98 desktop in the browser
that runs your own DOS games — and a real x86 PC for your Windows images"
Body: lead with the demo.gif story (boot → Digger in 10 seconds), then the
BYO-software model, then ask what games people try first. Expect the
"why not just use DOSBox" question (playbook below).

**r/emulation** — stricter: lead technical. Title: "win98-run: DOSBox +
v86 save-state sync inside a Windows 98 desktop (source on GitHub)" Body:
engines, save-state design, Wisp networking, guest-prep gotchas (Standard
PC HAL for XP), honest performance numbers. Link the repo first, site
second.

**r/windows98 / r/windowsxp** — nostalgia angle: a screenshot of the
desktop/XP Setup, "installing XP in a browser tab from my own ISO,"
invite people to try their images and report what boots. Smaller subs,
friendlier to project posts.

**r/InternetIsBeautiful** — only if rules allow (single-purpose, no
paywall-first sites; our free core qualifies): Title: "Windows 98 in your
browser — and it runs your own DOS games and Windows images." Keep Plus
out of the post entirely.

**Skip:** r/gaming, r/pcgaming (self-promo will be removed), any sub that
requires mod pre-approval you haven't gotten.

## 30–45 second launch clip (record this)

Screen-record (OBS or Xbox Game Bar) at 1080p, mouse deliberate:
1. (0–5s) win98run.app boot sequence → desktop. Caption: "Windows 98. In
   a browser tab."
2. (5–15s) DOS Programs → Digger demo playing. Caption: "Your own DOS
   games just… run."
3. (15–25s) Drag a real game .zip onto the desktop → library → launches.
   Caption: "Bring your own software. It never leaves your browser."
4. (25–35s) Win98 Image → XP Setup screen → press Save State. Caption:
   "A real x86 PC. Install Windows from your own ISO…"
5. (35–45s) Reload page → resumes at the same screen. Caption: "…and
   resume mid-install tomorrow. win98run.app — free locally, forever."
Upload natively to X/YouTube Shorts/TikTok; reuse as the PH gallery #2.

## Comment playbook

- **"Is this legal?"** → We distribute no Microsoft code and no games —
  it's an emulator + simulation; users supply their own images, same as
  VirtualBox. FreeDOS/Digger demo are freely redistributable.
- **"Why not just DOSBox / PCem?"** → Those are great; this is for zero
  install: a link you can open anywhere, with your library and machine
  states in the browser and optional cloud resume.
- **"XP must be unusable."** → It's Pentium-slow and we say so. Setup,
  casual apps, and 2D-era software are the target; no 3D acceleration.
- **"Can it run <specific 3D game>?"** → Not accelerated — if it needs a
  GPU, no. 2D/DOS-era: try it and tell us.
- **"Privacy?"** → Everything runs locally; files stay in IndexedDB.
  Upload happens only when you sign in and press Upload.
- **"Why charge?"** → Local is free forever. Plus pays for object storage
  and the relay server; it's how the lights stay on without ads/trackers
  for sale. (Analytics is Vercel's cookieless counter.)
- **Feature requests** → thank, log in GitHub Issues, never promise dates.

## Launch-day checklist

- [ ] Relay health check `curl https://relay.win98run.app/healthz` = ok
      (or use the "rolling out" wording everywhere)
- [ ] Fresh-browser pass: Digger demo plays, a DOS .zip imports, XP ISO
      flow opens, Save State → reload resumes
- [ ] Account pass: sign up, upload, second browser download → resume
- [ ] Plus pass: test purchase flips to Plus; portal cancel works
- [ ] Vercel Analytics receiving events (visit with each UTM link once)
- [ ] GitHub Issues enabled (yes); README matches the live feature set
- [ ] License decision: repo is public but has no LICENSE, so don't call
      it "open source" until you add one (MIT is the usual pick) —
      the copy above already avoids the claim
- [ ] You are free for 3 hours after each post to answer comments

## Success metrics (first week)

- Visits per channel (Vercel Analytics + UTM), demo-start rate
- DOS imports per visitor, save-state usage (qualitative via feedback)
- Signups, Plus conversions, relay connections (`journalctl -u
  win98-relay`)
- GitHub stars/issues filed; top 3 requested features → next sprint
