# machine-wilds

A Claude Code skill (this repository's root is the skill: `SKILL.md`) and its engine: give it a place and it builds a
walkable, ruined, overgrown world in the browser where giant walking machines keep their rounds in the mist.
`lib/` is the engine (a deferred WebGL 2 renderer, forked from motion-skills' `scanned-realm`), `scripts/` the tools,
`starter/` and `examples/iron-valley/` two realms, `references/` the notes, `docs/` the site on GitHub Pages: the example itself, playable at the root
(pushes to `main` deploy it), served at <https://wilds.num2323.com/> (`docs/CNAME`; the name is a DNS-only CNAME to `jungrok5.github.io` on
Cloudflare). The `--cdn` build adds Cloudflare Web Analytics from `realm.json` `analytics` (the site's public beacon token). Moved here with its history from <https://github.com/jungrok5/motion-skills>.

- **Read `references/FEEDBACK.md` before any change**: the owner's notes, kept as standing rules. Every new note from
  the owner goes into it in the same PR that acts on it (a rule, its date, the words it came from); its trap, if any,
  into `references/LESSONS.md`; a rule a machine can check into `gym.mjs` or `check.mjs`. A tool written to do the job
  (a render loop, a probe, a check) goes into `scripts/`, not a scratch folder: nothing the next session needs stays
  on this machine.
- Replies to the owner in Korean; everything on screen, in the repository and in commits in English.
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
- Props, set dressing and surface textures may be made with **Varco 3D** (an image → a mesh; images for textures) and
  finished in **Blender** (`pip install bpy`: decimate, bake, export GLB) — the owner's call (2026-11-26). Prefer a Poly
  Haven CC0 model where one fits; use Varco for what Poly Haven does not have. A generated model or texture the page uses
  is committed under `examples/<realm>/models/` (GLB ≤ 2 MB, textures ≤ 1k) with its line in `references/SOURCE.md`
  (Varco, the date, the prompt). The machines' skeletons, numbers and ways stay code (gym and check read them).
  Finish with `scripts/finish-model.py`; name it in `assets.json` as `{ "id", "local": "models/<id>/<id>.gltf" }`. Before
  building the site, push the commit that adds it and run `fetch-assets.mjs <realm> --ref <that commit>`: the `--cdn`
  page then reads it from jsDelivr's copy of that commit (it works before the PR is merged, and after).
- Generated video and voice are a reference, never a committed asset. **ElevenLabs (any tool) only after the
  owner says yes for that request** — say what, which model, how many takes, rough cost, then wait. Films are drawn by
  the engine (`examples/iron-valley/trailer.mjs`); their frames, sound and MP4s are never committed.
- Never put MP4s (or other large media) in `docs/`. The share image (`docs/og.jpg`: the README's picture, the link
  preview and GitHub's social preview) is 1280×640, ≤ 200 KB.
- Before finishing any site change, run `node scripts/site-check.mjs` (it serves `docs/` and checks the page at 1280 px and
  390 px: no console errors or 404s, the walk and `?film=1` load, `demo/iron-valley/` forwards; `--shots <dir>` to look).
- A film for social media is `node scripts/cut.mjs <realm> --ranges <cut.json>` (checks, parallel render, silent join with
  the card only at the end, an MP4 under X's 2:20 and 512 MB). A camera on a moving giant is written in its own frame
  with `node scripts/shot-at.mjs` and drawn with `render.mjs`; `?fault=4` shows every machine's faults often, live.
- Every link a piece of work was made from is its source: keep `references/SOURCE.md` and the README in step (Poly Haven; AnyMachine as a reference; the three motion-skills skills it grew from).
- Work on a branch and **always finish with a PR to `main`**. Never push to `main`, never merge a PR (or enable
  auto-merge): the owner reviews and merges. Only an explicit "merge it" from the owner for that PR changes this.
