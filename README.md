# machine-wilds

A Claude Code skill and the engine behind it. Give it a place and it builds a 3D world you can walk through in the
browser: a ruined, overgrown landscape where giant walking machines keep their rounds in the mist. The machines are
put together from code, part by part, and their feet land on the real height and slope of the ground.

![쇠울림 골짜기: a relay station on eight legs walking the valley rim at dusk](docs/poster.jpg)

- Samples, stills and the live demos: https://jungrok5.github.io/machine-wilds/
- The worked example, walkable: https://jungrok5.github.io/machine-wilds/demo/iron-valley/
- The same valley playing its own film (2 min 47 s, dawn to night): https://jungrok5.github.io/machine-wilds/demo/iron-valley/?film=1

A personal project by [Jeongrok Oh](https://jungrok5.github.io/resume/), an MMO server architect. Two habits from
server work run through it: every machine's state is recomputed from the clock, and nothing is rendered until
automated checks on the bodies pass.

## How it works

### Machines

Each leg is a planar chain of segments solved in closed form. Every powered joint has a
two-part hydraulic cylinder, and a search places its two anchors so the rod stays at least 15 % inside the barrel over
the joint's whole range of motion. Fittings (pipes, hoses, rivets, hatches, ladders, rails) are laid on afterwards, and
each kind has an age that puts rust streaks, grime and moss where water would run.

### Pose as a function of time

Given the world clock `t`, the gait computes where every foot is, from
the machine's closed way and the phase of each leg, with no state carried between frames. The page, a still, a frame
of the film and the Node checks all get the same pose for the same `t`, so film frames can be drawn in any order and a
stopped render picks up where it left off. The walker's own two-legged machine is the exception: it follows the keys,
so it steps from state.

### Footfalls on real ground

Each foot reads the height and slope where it will land; a planted foot is
fixed in the world (measured slip 0.00 mm against a 4 mm limit); the body's height and lean come from the feet that
carry it, and steps shorten on a grade.

### Checks before rendering

`scripts/gym.mjs` runs the same gait code in Node, without a
browser, and judges every machine over a whole lap against 27 limits: slip, reach, joints folding past their stops,
the cylinders' stroke, clearance under the belly, determinism (the same `t` twice must agree to 1e-9), a breathing
idle, and anticipation and recovery around each big move. Every kind must also cross a test course with a 14° ramp, a
1.2 m drop, a 12° side slope, a ditch and a mound. A kind that fails is fixed in its own numbers or in the line of its
way, never by loosening a limit.

### Renderer

A deferred WebGL 2 renderer on three.js r170, forked from the `scanned-realm` skill. Surfaces, models
and leaf atlases are Poly Haven CC0 scans, fetched when a realm is built (not committed) and reduced to levels of
detail with meshoptimizer at load. Machine lamps are marched through the fog as beams with halos. The weather
runs through clear, rain, snow, mist and haze, and the hour through a full day.

### A film the page plays

`lib/89_cine.js` plays a list of shots with free cameras while the walker's machine
is driven by keys. `?film=1` plays it live; `examples/iron-valley/trailer.mjs` steps the same shots to draw frames
(3,857 for the example) and joins them with sound synthesized from the machines' footfalls. On a machine with no GPU,
timing one quality setting at a time showed the shadow maps were half of each frame: at half their resolution a frame
went from 8.7 s to 4.1 s with no difference visible at 960 × 540.

## The example: 쇠울림 골짜기

A pass where a maintenance yard was left forty years ago. The land is 640 m across, from −3 m at the brook to 47 m
on the north ridge, with a broken viaduct, a hall, pylons, a container yard. Nineteen machines of eight kinds: two long-necked watchers, three
six-legged carriers, a relay station 73 m tall that weighs 5,200 t and walks the rim, five flying kites, two turtles,
a crayfish, four woodlice, and the walker's own body. Sources are in `examples/iron-valley/src/`, the design in its
`BRIEF.md`.

## Quick start

Requirements: Node 18+ with Playwright's Chromium, `curl` and ffmpeg. `gym.mjs` needs Node alone. The page needs
WebGL 2 and a real GPU.

```bash
cp -r starter my-realm                              # the starter: a flooded quarry and two wardens
node scripts/gym.mjs my-realm --course --sheet      # the machine on the test course, no browser (out/gym-course.png)
node scripts/gym.mjs my-realm --map --sheet         # on its own way, on the realm's land (out/map.png)
node scripts/fetch-assets.mjs my-realm              # the scans: 28 MB from Poly Haven, CC0
node scripts/build.mjs my-realm                     # writes my-realm/index.html
node scripts/render.mjs my-realm --cast             # each kind turned in a studio (out/cast-<kind>.jpg)
node scripts/check.mjs my-realm                     # must print "check OK"
cd my-realm && python3 -m http.server 8000          # walk it at http://localhost:8000/
```

The example works the same way with `examples/iron-valley` (101 MB of scans). Without the scans a realm still builds
and walks with `?scan=0`, on surfaces baked from code. `SKILL.md` has the whole workflow, from a topic to a finished
realm; `references/` holds the notes behind each step.

Controls: W A S D or the arrows to walk, the mouse to look, Shift to run, Space to hop, V to switch the camera
(first person, behind, above), the wheel or + and − to zoom, B for the lamp. On a phone, two thumbs; a gamepad works
too. `1` to `4` set the hour, `5` to `8` the weather, `T` runs the automatic round, `M` toggles sound, `P` shows numbers.

## Where it comes from

Made in [motion-skills](https://github.com/jungrok5/motion-skills) from three of its skills:
[`scanned-realm`](https://github.com/jungrok5/motion-skills/tree/main/scanned-realm) for the engine and the scans,
[`walking-colossus`](https://github.com/jungrok5/motion-skills/tree/main/walking-colossus) for the stateless gait, and
[`machine-build-reel`](https://github.com/jungrok5/motion-skills/tree/main/machine-build-reel) for machines as
mechanisms and their checks. It moved here with its history. Scans from <https://polyhaven.com> (CC0).
[AnyMachine](https://github.com/apekshik/anymachine) (MIT) is a reference: `machine-build-reel` follows its method of
building a machine as a parts list and checking it by script, and its shelled machines prompted the example's shelled
kinds. No code, design or asset of it is used, and none of any game's. `references/SOURCE.md` has the details.

## Licence

- Code: [PolyForm Noncommercial 1.0.0](LICENSE.md). Use it, change it and share it for personal and other
  noncommercial purposes. Commercial use (paid courses, client work, products) needs a licence from the owner.
- Films, stills and other pictures: © 2026 jungrok5, all rights reserved ([MEDIA-LICENSE.md](MEDIA-LICENSE.md)).
  Watch and share the original posts; no re-uploads, edits, or use in lectures, courses or ads without permission.
- Parts by others keep their own licences: three.js and meshoptimizer (MIT, in `vendor/`), the Poly Haven scans (CC0,
  not committed). See [CREDITS.md](CREDITS.md).
