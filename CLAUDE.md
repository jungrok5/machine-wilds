# machine-wilds

A Claude Code skill (this repository's root is the skill: `SKILL.md`) and its engine: give it a place and it builds a
walkable, ruined, overgrown world in the browser where giant walking machines keep their rounds in the mist.
`lib/` is the engine (a deferred WebGL 2 renderer, forked from motion-skills' `scanned-realm`), `scripts/` the tools,
`starter/` and `examples/iron-valley/` two realms, `references/` the notes, `docs/` the site on GitHub Pages: the example itself, playable at the root
(pushes to `main` deploy it). Moved here with its history from <https://github.com/jungrok5/motion-skills>.

- A skill takes a topic and designs a new realm in its style — not a re-render of the example. A new realm designs its
  own machines, the walker's own two-legged body included (`avatar: true`; `lib/48_mech_avatar.js`).
- Machines are built and moved by code only. Before any render run `node scripts/gym.mjs <realm> --course` and
  `node scripts/gym.mjs <realm>`; a kind or a way that fails there is fixed in its numbers or its line on the land,
  never by loosening a limit. Then `node scripts/check.mjs <realm>` must print `check OK` (read the result from a log
  written by that run, not an older one).
- Bodies that move follow `references/MOTION-QUALITY.md`: weight sets timing, anticipation and recovery round big
  moves, every idle breathes, planted feet never slide.
- Scans are Poly Haven CC0, listed per realm in `assets.json` and fetched with `scripts/fetch-assets.mjs`. Never commit
  a realm's `assets/`, `out/` or built `index.html`, and never put scans in `docs/`; the site is the example built with
  `node scripts/build.mjs examples/iron-valley --cdn --out docs/index.html` (the page reads the scans from Poly Haven;
  `docs/demo/iron-valley/` only forwards old links to the root). No samples page: the README carries the words
  and the pictures (stills and sheets in `media/`, 640 px JPEGs, each linking to the live page or to its source).
- Generated video / image / voice is a reference, never a committed asset. **ElevenLabs (any tool) only after the
  owner says yes for that request** — say what, which model, how many takes, rough cost, then wait. Films are drawn by
  the engine (`examples/iron-valley/trailer.mjs`); their frames, sound and MP4s are never committed.
- Never put MP4s (or other large media) in `docs/`. The poster (`docs/poster.jpg`, the README's picture and the
  link preview) ~1200×675, ≤ 200 KB.
- Before finishing any site change, serve `docs/` (`python3 -m http.server`) and check the page at 1280 px and 390 px:
  no console errors or 404s, the walk and `?film=1` load, `demo/iron-valley/` forwards.
- Every link a piece of work was made from is its source: keep `references/SOURCE.md` and the README in step (Poly Haven; AnyMachine as a reference; the three motion-skills skills it grew from).
- Work on a branch and **always finish with a PR to `main`**. Never push to `main`, never merge a PR (or enable
  auto-merge): the owner reviews and merges. Only an explicit "merge it" from the owner for that PR changes this.
