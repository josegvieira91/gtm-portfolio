# GTM Engineering Portfolio

A portfolio site showing ten GTM (go-to-market) automation systems built for
real, in live tool accounts, and recorded running. Each case includes a
diagram of the flow, an explanation of how it works, and a recording of the
real system in action.

## Stack

- [Astro](https://astro.build) (static site output)
- [Tailwind CSS](https://tailwindcss.com) v4
- [GSAP](https://gsap.com) for scroll-driven motion
- Self-hosted deploy: Docker, served behind a reverse proxy

## Repo layout

- `src/` — Astro pages, components, and styles
- `public/` — static assets served as-is
- `workflows/` — sanitized exports of the automation workflows shown in each
  case. These are cleaned copies with no client names, no credentials, and no
  real data. They exist so a technical reviewer can see the actual
  configuration, not just a screenshot of it.

## Status

This site is under active construction. The current build is a placeholder
proving the build pipeline works end to end.
