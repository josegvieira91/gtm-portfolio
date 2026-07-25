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

## Pre-publish gate

Before a recording is considered ready to ship on a case page, confirm all of the following:

- [ ] Poster frame exists and was generated from the final encoded clip
- [ ] Aspect ratio is reserved in the page markup so nothing shifts on load
- [ ] File plays from a cold cache (not just from a warm browser cache during testing)
- [ ] The 2x review pass in the After section was actually done on this specific take, not
      assumed carried over from a previous one
