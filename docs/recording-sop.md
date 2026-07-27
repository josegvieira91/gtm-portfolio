# Recording SOP

A checklist run before, during, and after every capture session. There will be roughly ten to
fourteen of these across the ten cases, so this is a repeatable procedure, not a one-time
setup note.

## Before

- Use a dedicated browser profile reserved only for portfolio recording. No extensions beyond
  what the specific case actually needs.
- Disable autofill and password-manager autofill in that profile. A dropdown showing a real
  saved email or card number is a leak the moment it appears on screen.
- Keep the bookmarks bar empty or hidden.
- Close every tab except the lab tool tabs this recording needs. Nothing from unrelated work
  stays open in the same window.
- Turn on OS-level Do Not Disturb before starting, not just the browser's notification
  settings. A Slack or email toast from an unrelated conversation is exactly the kind of thing
  that ends up permanently published.
- Close every terminal, editor, and DevTools pane holding unrelated work. If DevTools is
  needed for the recording itself, confirm no other tab's network panel or console history is
  visible.
- Confirm every visible label is in English: workflow names, CRM property names, Slack channel
  names, form labels. The recording is the proof artifact, so anything in the wrong language on
  screen undermines it.
- Confirm the data on screen comes from the synthetic seed dataset. No real record, real name,
  or real email should be visible anywhere in frame.

## During

- Capture the browser window only, never the full screen. Dock, desktop, and other open apps
  must never be able to appear in frame.
- If a full-screen capture is genuinely unavoidable for a specific case, hide desktop icons
  first.
- Keep the address bar out of frame where possible.
- Never type into a field that will show an autocomplete dropdown of real values while
  recording is active.

Five specific in-frame risks to watch for on every take:

1. Autofill dropdowns (form fields suggesting real saved values)
2. Address-bar autocomplete (browser history/suggestions surfacing real URLs)
3. Toast notifications (Slack, email, OS-level alerts)
4. Tab titles (a background tab title can leak a project or client name)
5. DevTools network panels showing tokens (if DevTools is open for any reason during capture)

## After

Review the raw capture at 2x speed before it goes anywhere else, watching specifically for
anything outside the intended tool UI: a stray notification, an autocomplete dropdown that
flashed briefly, a tab title, anything from the list above. This review happens before
encoding, not after — encoding does not fix a leak, it just compresses it.

Then encode.

## Encode recipe

Primary output, H.264 mp4:

```
ffmpeg -i raw-capture.mov \
  -vf "scale=1920:-2" \
  -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p \
  -movflags +faststart \
  -an \
  case-<NN>-<slug>.mp4
```

Scale to 1920 wide with even height (`-2` keeps the height a multiple of 2, required by
`yuv420p`). CRF 23 with `preset slow` gives a reasonable quality/size trade-off for screen
capture content. `-pix_fmt yuv420p` maximizes browser compatibility. `-movflags +faststart`
moves the moov atom to the front of the file so the browser can start playback before the full
file has downloaded — this matters for a page with several of these embedded.

Use `-an` for silent captures. If the case has narration, replace `-an` with `-c:a aac -b:a
128k`.

Poster frame, a single-frame grab a couple of seconds into the clip:

```
ffmpeg -i case-<NN>-<slug>.mp4 -ss 00:00:02 -vframes 1 case-<NN>-<slug>-poster.jpg
```

Optional second source, VP9 webm, for browsers that prefer it:

```
ffmpeg -i raw-capture.mov \
  -vf "scale=1920:-2" \
  -c:v libvpx-vp9 -crf 32 -b:v 0 \
  -an \
  case-<NN>-<slug>.webm
```

## Naming convention

- Video: `case-<NN>-<slug>.mp4` (and `.webm` if the optional second source is built)
- Poster: `case-<NN>-<slug>-poster.jpg`

`<NN>` is the two-digit case number, `<slug>` matches the case page slug.

## Placement

Encoded files go into the local, gitignored `videos/` directory and reach production by
rsync to the server's videos directory. This document does not name the server path or
hostname — see the local deploy runbook (gitignored, created by plan 01-06) for the concrete
destination.

Video files are never committed and never placed under `public/` or `dist/`. Even though git
ignores the `videos/` directory, placing a file under `public/` or `dist/` would bake it into
the Docker build output regardless of what git tracks.

## Phase 3 style layer (D-04/05/06)

This section sits on top of the Before/During/After discipline above, which is unchanged. It
covers how a case recording is captioned, timed, and honestly compressed before it ships on a
case page.

### Style rules

- **No narration (D-04).** Every case recording stays silent. `-an` stays in the Encode recipe
  above for every case; there is no case where the standard command changes to add an audio
  track.
- **Step captions (D-04).** Short on-screen captions mark each stage of the flow, phrased in the
  flow's own vocabulary rather than generic labels: "form submitted", "n8n fires", "Slack alert",
  not "Step 1", "Step 2". The recording should be fully watchable muted — the page prose does the
  explaining, the captions just anchor what's on screen to what stage it represents.
- **Length (D-05).** Finished length is 60 to 120 seconds, showing trigger → key steps → outcome.
  Trim waiting periods rather than padding the final cut to hit a target length. A hiring manager
  should be able to finish watching without skipping ahead.

### Honest-compression rules (D-06)

These are hard constraints, not style preferences:

- Cuts and speed-ups are permitted **only** over waiting periods (a queue delay, a scheduled poll
  interval, an inbox wait). Never cut or speed up a proof moment.
- Every time skip carries an on-screen caption label in the `+2 min` style, placed at the moment
  the skip happens, so the viewer always knows a compression occurred and by how much.
- Proof moments — form submit through alert arrival, the n8n/Make/Zapier execution view, any
  visible timestamp — run at real time with a visible clock in frame. These are the moments that
  make the claim verifiable, so they are never sped up, cut, or skipped.
- Step order is never rearranged for pacing. The recording shows the flow in the order it
  actually ran.

**Why this matters:** every case page carries the fixed line "Measured from the recorded lab run"
under its metrics grid (D-02). That line is only true if the recording is an honest
representation of the run. A reordered step or a silently sped-up proof moment makes the D-02
caption false, even if no individual number on the page is wrong.

### Caption burn-in recipe

Caption capability was verified on this machine using `ffmpeg-full`
(`brew install ffmpeg-full`), which — unlike the standard `ffmpeg` formula already in the Encode
recipe above — is built with `libfreetype`/`libass` and provides the `drawtext` and `subtitles`
filters. `ffmpeg-full` is keg-only, so it does not overwrite or relink the standard `ffmpeg`
other tooling in this repo expects. Resolve its binary path with `brew --prefix ffmpeg-full`
(stable across upgrades) rather than hardcoding a Cellar version path, and invoke that binary
directly for the caption pass instead of running `brew link --overwrite`.

Proven working command (burned one caption onto a 3-second `testsrc` throwaway clip generated
with ffmpeg's own test source, inspected the resulting frame, then deleted the clip):

```
FFMPEG_FULL="$(brew --prefix ffmpeg-full)/bin/ffmpeg"

"$FFMPEG_FULL" -i raw-capture.mov \
  -vf "scale=1920:-2,drawtext=fontfile=node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2:text='form submitted':enable='between(t,2,5)':x=40:y=h-80:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=10" \
  -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p \
  -movflags +faststart \
  -an \
  case-<NN>-<slug>.mp4
```

- The font file is the repo's own self-hosted `@fontsource-variable/jetbrains-mono` variable
  woff2 — no separate `.ttf`/`.otf` conversion is needed; `ffmpeg-full`'s libfreetype build reads
  it directly via `drawtext`'s `fontfile` argument.
- Position is bottom-left (`x=40:y=h-80`), matching the rest of the site's blueprint aesthetic.
- `box=1:boxcolor=black@0.6:boxborderw=10` gives the dark translucent caption box so the text
  reads over any background.
- `enable='between(t,START,END)'` scopes each caption to the seconds it should be visible;
  chain multiple `drawtext` filters (comma-separated in the same `-vf`) for a multi-caption clip,
  one `drawtext=...:enable='between(t,START,END)'` per caption.
- A time-skip caption uses the same `drawtext` shape with `text='+2 min'` at the moment the skip
  happens in the timeline.

### Poster path correction

The existing Encode recipe above produces a poster named `case-<NN>-<slug>-poster.jpg` in the
gitignored `videos/` directory. `src/pages/cases/[slug].astro` does not read that file — it reads
`public/posters/<diagramId>.webp` (where `<diagramId>` is the case's `case-<NN>` id, e.g.
`case-01`), and falls back to a "Recording coming soon" placeholder state when that exact file is
missing.

Convert the jpg poster to the path and format the template actually reads:

```
FFMPEG_FULL="$(brew --prefix ffmpeg-full)/bin/ffmpeg"

"$FFMPEG_FULL" -i case-<NN>-<slug>-poster.jpg public/posters/case-<NN>.webp
```

Unlike the mp4/webm video, the poster **is** committed to the public repo — it is a small static
webp image, not a video, and `public/` is not gitignored. The mp4/webm itself never goes under
`public/` or into git, per the Placement section above.

## Pre-publish gate

Before a recording is considered ready to ship on a case page, confirm all of the following:

- [ ] Poster frame exists and was generated from the final encoded clip
- [ ] Aspect ratio is reserved in the page markup so nothing shifts on load
- [ ] File plays from a cold cache (not just from a warm browser cache during testing)
- [ ] The 2x review pass in the After section was actually done on this specific take, not
      assumed carried over from a previous one
- [ ] Captions are burned in per the Phase 3 style layer recipe above: no narration, step
      captions in the flow's own vocabulary, and a `+2 min`-style label on every time skip
- [ ] Finished length is 60 to 120 seconds and every proof moment runs at real time with a
      visible clock, per the D-06 honest-compression rules
- [ ] Poster has been converted and placed at `public/posters/case-<NN>.webp` (not left at the
      `videos/case-<NN>-<slug>-poster.jpg` path the Encode recipe produces) and is staged for
      commit to the public repo
