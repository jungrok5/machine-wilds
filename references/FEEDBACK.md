# The owner's feedback, kept

Every note the owner has given on this work, as a standing rule with the reason it was given. **Read this before any
change** (CLAUDE.md says so). When the owner gives a new note, add it here in the same PR that acts on it — as a rule
(what to do, what not to do) with its date and the words it came from, not as a log of what was done. The trap behind it,
if there was one, also goes in `references/LESSONS.md`; a rule a machine can check goes in `scripts/gym.mjs` or
`scripts/check.mjs` as well. Nothing the owner says is left in a chat that ends.

## How to work

- **Replies in Korean; everything on screen, in the repository and in commits in English.** The page, the HUD, the
  title card, machine and place names, README, comments. (2026-11, "한글로된것들 영어로바꿔주고"; a Korean subtitle was
  once put back to English: "부제영어그대로둬 왜 한글로바꾼거야".)
- **Merge only on the owner's word for that PR**, and when the word comes, merge everything it covers ("작업한거 다머지").
  Always finish with a PR; never push to `main`.
- **Do not wait idle on a render**: a render runs in the background while the rest is done ("렌더링 기다리는동안
  나머지하면 되잖아"). Long jobs: check the scripts that start them (a list read with `while read` drops its last line
  when the file has no newline at the end — that cost two hours once; `scripts/cut.mjs` splits its lists itself).
- **Make, judge, improve on your own** ("만들고 평가하고 스스로개선해"): render key frames, look at them beside the
  previous version, fix what is weak, and only then show the owner. Show a short MP4 when effects or motion change
  ("이펙트 확인할 영상줘").
- **Spend the tokens a job needs** to get it right ("토큰 더 써"); bring in a specialist agent for a specialist job (an
  effects pass, a sound pass), but judge its result yourself.
- **Use the tools the owner has connected** — Varco 3D for props and textures, Blender (`pip install bpy`) to finish them —
  with Poly Haven first and generation only for what it lacks ("폴리헤븐에있으면 그거쓰고 없으면 만들면되지"). Do not
  argue against using them.
- **X posts are read through the mirror** (`api.fxtwitter.com/2/thread/<id>`, the clip from `video.twimg.com`), as
  motion-skills' CONTRIBUTING.md says; do not give up on an X link ("미러사이트로 접근해").
- **Varco 3D has 100,000 points a month, refilled monthly: use it freely where it helps** (2026-11-28, "필요하면
  마음껏써"). Varco has no sound tool (text, image, mesh, remesh, PBR, rig, animate only).
- **ElevenLabs only after the owner says yes for that request** (CLAUDE.md). For the YouTube film the owner chose the
  **engine's own sound** (footfalls, wings, machines, weather, drawn by `trailer.mjs --sound`), not ElevenLabs (2026-11-28).
- **A file too big to send goes to a GitHub release** of the repository (an MP4 is never committed); give the owner
  the release link (2026-11-28, "용량때문에 내가 받을수없게되면 릴리즈에 올려줘").

## The look of the world

- **Effects at AAA console-game quality**, the way an Unreal or console game draws them — not photographs of real
  electricity (Tesla coils read as hair: "털 같아보이는데 / 게임 vfx가 정확하지").
- **Faults (arcs):** thin, crisp, bright blue-white — bluer and thinner than a first try ("더 푸른빛에 더 얄상하고
  또렷하게", "더 얇게는?"); crawling over the machine's own body at random places, not shooting out of it from one spot
  ("특정위치에 케릭터 밖으로 튀는 느낌"); on every machine, not only the walker ("다른기기들도 넣자"); and **never one
  pattern**: different kinds, shapes, moments and rhythms per arc and a character per machine ("너무 단조롭네 … 다
  비슷한 패턴이라 심심"). None across the lens in first person.
- **Dust:** a high-end look (a lit, billowing volume, not flat sprites: "훨씬 더 고급기술"), but **only where a foot
  would really raise it** — loose earth, a heavy foot — and never more than the moment asks ("너무 과해 … 이 정도
  발생할것 같지 않은 순간에도"). It never pops or changes in steps between frames ("프레임이 뚝뚝 끊어지듯").
- **Light:** no milky haze in front of the walker from its own lamp ("캐릭터 앞에 후레시 … 뿌옇게"); a lamp beam is
  judged on a PC screen at play, not only in a still.
- **Films look sharp**: the soft look of a CPU render is the engine's to fix (render size, sharpening, no haze), not an
  excuse ("영상은 좀 뿌옇다").

## Motion

- **Giants move in films** — standing machines in a trailer read as dead ("왜 가만히 있어? 움직이고 있음 더 좋겠어").
- **Feet never snap**: no jump in a foot's angle or speed between two frames ("발 부분이 전반적으로 뚝뚝 움직여
  휙휙"). `gym.mjs` fails a foot that turns more than 15° in one frame at 24 fps (`footTurn`).
- **The giants notice the walker**: a slow glance while walking, a moment of being seen ("걷다가 쓰윽 본다던지").

## Play

- **It plays like a game**: a console-style HUD, keyboard shortcuts, and a prompt when something can be used, shown as
  one comes near ("가까이가면 인터렉션할수 있다는거 알려주고"). Touch gets the same.
- **Interactions with the giants**: the biggest one lets down a lift (or a ladder) the walker rides up ("엘레베이터나
  사다리가 내려와서 내가 올라타거나"). What carries the walker has to fit what it passes through: the cage comes up
  through a real hatch and stops flush with the deck ("구멍이 … 엘베가 딱 거기에 맞아야").
- **A cut has a reason**: a shot never ends on the walker bumping a wall before the next scene ("벽에 부딪히고
  다음씬넘어가는건 뭐야 의도가머야").

## Asked for next (2026-11-28)

- **A giant machine in the sky**, a balloon-like airship inside a cloud: faint through the haze in clear weather; in a
  storm the lightning around it lights it up from inside the cloud, so you feel something huge is in there ("오~ 안에
  뭔가 있네 거대한게"). The walker can fly to it and board it.
- **Wings for the walker**: they snap open ("촤락") on a double tap of Space (the owner's choice, 2026-11-28; a pad's A twice, touch the jump button twice) and it flies freely. They
  must read as **real mechanical feathers** — every vane swaying naturally in the wind, rising and falling as it
  glides, and a true wingbeat when it is steered or climbs; build them with the utmost care (code, Blender, Varco —
  whatever makes the feathers best). The wings' skeleton, numbers and ways stay code (gym and check read them).
- **A film for YouTube, not X**: no time limit — as long as it takes for the project to show at its best ("시간
  고려하지말고 충분히 이 프로젝트가 잘나오도록").

## Films for social media

- **Silent MP4, high quality, 2:00–2:20 for X** (X's limit is 2:20 and 512 MB; the same file goes to Threads and
  Facebook): `node scripts/cut.mjs <realm> --ranges <cut.json>`. Phone-watchable first ("휴대폰에서 볼만하면됨").
- **The title card only at the end**, not at the start ("타이틀카드 끝에도 나오잖아 처음은 빼자"); the repository's
  address on every frame (people repost others' work as their own); © and no-reuse line on the card (MEDIA-LICENSE.md).
- **Show the range of what was made**: morning mist to night, weathers, far giants passing, a camera that flies with a
  bird and comes down to the walker, like a game's trailer ("영화연출 트레일러 영상들처럼 게임소개하듯").
- **Post copy**: one text for every platform; current, not dated ("3d 세계라니 … 구닥다리"): research what is posted on
  X now, here and abroad, before writing; "made with AI" is the hook, not a technical breakdown.

## The repository's page and README

- **The page is the game, full screen** — the share link; README carries the words and pictures (sheets, rigs, stills)
  ("페이지에는 플레이되는 페이지만 전체화면으로"). A button to the owner's GitHub on the page.
- **No AI tone**: short, plain, technical terms are fine, no padding or explaining the obvious ("쓸데없는 설명 장황한
  설명은 빼줘"); run the owner's de-AI-tone skill (motion-skills / ai-design) over new copy.
- **Words that mislead are out**: "assets", not "scans", for what is downloaded ("애셋이라고 하는게맞지"); no "CC0" on
  the page where it reads as the page's own licence ("오해할만한데"); "made with AI", not "made by hand" ("직접만든이
  아니고 AI로 만든").
- **Its sources are listed** (Poly Haven; AnyMachine as a reference; the motion-skills skills it grew from).

## The portfolio

- The résumé entry is written for a game developer: what was built and how, its limits, how it was optimised, the
  result, and the AI-driven way it was made — with silent GIFs or MP4s like the other projects ("기술적으로 무엇을
  어떻게 구현했고 어떤한계점이있고 최적화를 어떻게했거 결과는 …").
