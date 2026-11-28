# Sound

All of it is made by the engine — noise, sines, a few seeded buffers — on one WebAudio graph that runs live in the page and
offline for a film (no files, no generated audio). The mood is a game's open world, not a trailer: wind, forest, distance,
weight; the drama comes from the machines. The owner's words on the first try (generated, rejected): the effects did not fit
the machines or could not be heard, the bed only added tension, the timing was off. So: **every sound is something on
screen, on its frame**.

## The three files

| file | what it does |
| --- | --- |
| `lib/85_audio.js` | the graph and the beds: wind (stronger with height), birds by the hour, insects and an owl at night, rain (on leaves, on a roof when sheltered), snow's hush, the world's sources (streams, fire, forge, mill, bell, frogs, …), thunder; the ducking bus; `renderOffline` (a scenario) and `renderFilm` (a film, shot by shot) |
| `lib/86_sfx.js` | the voices of events and loops (below), the valley reverb, the wind singing in the ruins, the forest's far wash, drips in mist |
| `lib/87_ear.js` | the ear: every frame (`frame` hook, order 95) it reads the world as drawn and turns what happened since the last frame into events placed at the moment the picture shows them, and names the loops that sound this frame. The camera is the listener |

## Events

Every event has `p` (where), `d` (m from the camera), `side` (−1 … 1), and its time: live, `ago` (s since it happened,
negative for later); in a film, `at` (s into its shot).

| kind | from | carries | heard as |
| --- | --- | --- | --- |
| `footfall` | `LR.mech.impacts` (the clock time each foot came down — the same as its dust) | `tonnes`, `wet`, `loose` (the ground's give, as the dust reads it), `surf` | by weight: a falling sine you feel and the earth's thud; a clank on a porter, a long dull ring on the relic; a crunch; on loose earth the stones it threw falling back; in water a splash |
| `sparks` | a knee that grinds (lib/62_vfx's hash), a lift's rail | `size`, `grind` | a hot scrape and tings |
| `hiss` | a heavy knee's steam as its foot lifts (lib/62_vfx's hash), a steam burst, a big move settling | `size` | a valve letting go |
| `servo` | a big move: each stretch of its main channel's keys that moves | `tonnes`, `len`, `amt`, `dir` | pumps whining up (or down), oil in the lines, the frame groaning |
| `call` | a move's `sound: [at, f, len, gain]`; a flyer's `cry`; the moment a machine first sees the walker (`glance`) | `f`, `len`, `gain`, `cry` | reeds a fifth and an octave apart over a sine, swelling like a horn, much of it the valley's tail; a cry is a falling whistle |
| `crackle` | `LR.vfx.faultAt` (a burst) — its envelope from `LR.vfx.faultEnv`, the same one the arcs are drawn to | `env` (200 a second), `power`, `hue`, `own` | a buzz to the envelope, the envelope torn into grains of crackle, a snap at every pop |
| `thunder` | `LR.vfx.boltAt` — the strike where lib/63_glow draws it (380–760 m) | — | at the flash + `d`/343 s: near, a crack then the roll; far, only the roll |
| `step` | `avatarstep` (lib/48_mech_avatar: a foot planted) | `surface` (`metal` on a machine), `run` | the ground's recipe and a steel sole's tick |
| `land` | `landed` | `speed`, `surface`, `wings` | both feet, the weight, the plates settling |
| `wingopen` / `wingclose` | `LR.player.wings.tw` going back to 0 | `clicks`: [when, level, pitch, joint?] from `lib/48_mech_wings`' own timing | the arm latching, then a click for every vane hitting its stop, shoulder to the last primary (0.27–0.70 s), a rising whoosh, the fan ringing once; folding the other way, softer |
| `wingbeat` | the beat's phase passing a whole turn (the top of the stroke) | `amp`, `len` (the downstroke) | the air pushed down, a soft thump of pressure, the vanes closing; their slotting open on the way up |
| `clank` | a realm (the lift's cage on the ground, locking home) | `size`, `lock` | iron on iron and the chain's rattle |

Sound and picture stay together up to 120 m (a film keeps them so); past that a sound is late by the extra distance over
343 m/s. Thunder is always late by all of it — that is the point of it. Distance takes the top off (air), adds the valley's
tail, and the beds duck under what is close and loud.

## Loops

Named every frame they sound (`{ id, kind, d, side, … }`); a loop not named for 2.5 s is taken down.

| kind | from | carries |
| --- | --- | --- |
| `hum` | the three nearest machines of 80 t and more | `tonnes`, `moving` |
| `air` | the walker flying (`speed`, `flutter`), the camera flying | `speed`, `flutter`, `lv` |
| `ironrain` | rain on the nearest machine, on the walker's head | `size`, `rain` |
| `winch` | a realm (the lift) | `rate`, `dir` |
| `drone` | a kind with `sound: { drone }` (below) | `size`, `f`, `blades`, `gain` |

## A realm adds its own

- **Sources** with a place: `LR.world.sounds.push({ x, y, z, kind, r, gain })` — kinds `stream`, `fountain`, `waterwheel`,
  `mill`, `fire`, `forge`, `bell`, `chimes`, `frogs`, `tube`.
- **Events and loops**: `LR.ear.add((h) => { … })`, called every frame with `h = { time, dt, cam, listener, st, first, hear,
  emit(event, agoClock), emitF(event, agoFilm), loop(loop) }` (`st` is the realm's own state, cleared with each shot).
  The example's `src/28_sound.js` does the lift (a `winch` loop while the cage moves, a `clank` on the ground and locking home).
- **Shelter**: `LR.ear.shelter = (x, y, z) → 0 … 1` (under a roof: the rain drums on it, the wind is kept off).

## The sky machine's drone (the hook)

A kind is heard as a drone when its spec says so:

```js
M.define('airship', { …, sound: { drone: { f: 30, blades: 4.2, gain: 1 } } })   // f: the engines' low note (Hz), blades: the
                                                                                 // propellers' chop (a second), gain
```

(`spec.drift` is taken as a drone too, with the defaults, until the kind says `sound`.) The ear names a `drone` loop at its
body every frame, whatever the distance: a chord of slow engines a fifth and an octave apart, beating, the chop of the
propellers, the hull creaking — from the ground the air leaves only the low rumble; up close it roars. Its lightning is the
weather's (`thunder` above).

## A film's sound

`node trailer.mjs . --sound [--ranges cut.json --out name] [--lufs -16]` steps every shot dry while the ear records
(`LR.ear.record()`, `LR.ear.after(filmTime, rate, keep, from)` after each frame, `LR.ear.stop()`), then
`LR.audio.renderFilm` renders each shot on its own — its own hour, weather, listener (frame by frame) and a 2.5 s run-up so
its beds are settled and its birds already singing — and lays them end to end: a shot starts on its cut; the one before
rings on 0.32 s under it. A call or a pump begun before the shot is heard from where it had got to. A strike seen late in a
shot is heard in the next when that one is in the rain too. ffmpeg then brings it to −16 LUFS integrated with its true peak
under −1 dBTP (`out/<name>/cine.wav`; `cine-raw.wav` before). `--join` muxes it.

Judge it with `node scripts/sound-check.mjs <realm>/out/<name>`: the events (`--kind`, `--near`, `--shot`), `--loud`
(each shot's loudness), `--spec <png>` (a spectrogram, the cuts marked), `--strip <png> --frames <dir>` (each event's frame
and the two before and after it, to see it land).
