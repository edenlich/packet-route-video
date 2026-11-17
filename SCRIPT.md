# SCRIPT.md — How a Request Finds Its Way

## One-minute takeaway

> No machine on the internet knows the whole path. Each router only knows which way gets your request one step closer — and only the last one knows exactly where it goes.

## Stack

- **Animation:** Remotion (React + SVG), one scene per file
- **Narration:** Kokoro (`kokoro-onnx`), English only
- **Mixing / compression:** ffmpeg
- **Agent:** Claude Code (Opus 5.5)

---

## Style guide (applies to every scene)

**Look: classic 2D cartoon.**
- Flat shapes, thick dark outlines (3–4 px, `#2B2B2B`), soft cel shading (one shadow tone per color, no gradients except the sky/background).
- Warm palette: cream background `#FFF4E0`, wood `#C68B59`, wall `#F2D7B6`, accent for the note/packet `#FF7A59`, router/network accent `#3FA7D6`.
- Characters: simple rounded bodies, dot eyes, no detailed faces. Rounded rectangles + circles only. Seen mostly from behind or the side to keep drawing simple.
- Everything is drawn in code (SVG). **No AI-generated images.** Screenshots are allowed.
- Font for on-screen text: a rounded hand-drawn-ish font (e.g. "Fredoka" or "Baloo 2" via `@remotion/google-fonts`).

**Camera: always floating, always following motion.**
- Build one reusable `<Camera>` wrapper: `({x, y, zoom, rotate}) => transform` applied to the whole scene's SVG.
- Every camera move uses `spring()` or eased `interpolate()` — never linear.
- Add a constant subtle drift on top of every move (a slow sine wave, ±4 px, ±0.3°) so the camera never feels locked.
- The camera follows whatever is moving (the note, the packet). Lead the motion slightly: the camera starts moving a few frames before the object does.

**Transitions:** no hard cuts. Use push-ins, whip-pans, or match-cuts (one shape becomes another).

**Video settings:** 1920×1080, 30 fps.

---

## Scenes

Timings are targets, not rules. A partial video is fine.

### Scene 1 — The room (0:00–0:09) · `src/scenes/S1Room.tsx`

**Visual:**
A cozy room at evening. A person sits on an office chair at a desk with a laptop. Warm desk lamp.

**Camera:**
Starts behind the person (we see the chair back, shoulders, laptop glow). Floats around to a 3/4 side view facing the screen.

> Implementation note: a true 3D orbit is expensive to draw in 2D. Fake it:
> 1. Back view: slow push-in with drift (0:00–0:04).
> 2. Whip-pan to the side (motion blur via a quick horizontal smear, ~6 frames).
> 3. 3/4 side view: slow push-in toward the screen (0:04–0:09).
> Two drawings + one whip-pan reads as a camera orbit.

**Action:**
In the side view we see the screen: a browser **address bar**. The text `moodle.com` types itself letter by letter, then a key press on Enter (small key squash + click flash).

**Narration (narrator voice):**
> Every day, we send countless requests across the internet — every click, every search, every page we open.

---

### Scene 2 — Into the screen (0:09–0:12) · `src/scenes/S2Dive.tsx`

**Visual + camera:**
After Enter, the camera pushes straight into the laptop screen. The screen fills the frame, flashes white, and fades to an empty cream canvas.

**Narration:** none (let the narration from Scene 1 finish; small "whoosh" is optional).

---

### Scene 3 — The question (0:12–0:18) · `src/scenes/S3Question.tsx`

**Visual:**
Empty canvas. A small dotted line starts drawing from the left edge, wanders, and stops in the middle with a hand-drawn "?" at its end.

**Camera:** slow drift, very slight push-in on the "?".

**Narration:**
> But how does that request actually find its way — all the way to the right place, and back with the page we asked for?

---

### Scene 4 — The lecture hall (0:18–0:40) · `src/scenes/S4LectureHall.tsx`

**Visual:**
A big lecture hall, drawn from a slightly elevated side angle. Rows of seats going toward a board at the front. Rows are numbered on the aisle side (1 at the front, ~9 at the back).

**Beat 4a — The note (0:18–0:24)**
- Camera starts zoomed in on a student in the **back row**. She writes on a small paper, folds it (2–3 frame fold animation), and taps the shoulder of the student in front of her.
- Speech bubble + character voice:
  > Pass this to row 3, seat 5.

**Beat 4b — Hand to hand (0:24–0:35)**
- The note passes forward, hand to hand, one row at a time.
- Above each person who passes it, a tiny bubble pops: **"Not me — forward ↑"**
- **The camera travels with the note**, staying close. Each pass is a small arc (note follows a curve, camera follows with slight lag).
- Rhythm speeds up: the first two passes are slow and clear, then faster.

**Beat 4c — Delivery (0:35–0:40)**
- Note reaches **row 3**. That student looks along the row (head turn), then passes it sideways to **seat 5**.
- Bubble: **"Row 3? That's my row — seat 5 is right here."**
- Seat 5 opens the note. Small happy reaction.

**Narration (over 4b–4c):**
> Nobody in between knows who's sitting in row 3, seat 5. Each person only knows one thing: row 3 is ahead of them — so they pass it forward. Only someone in row 3 needs to look for seat 5.

---

### Scene 5 — The hall becomes the internet (0:40–0:46) · `src/scenes/S5Transform.tsx`

**Visual (match-cut):**
Camera pulls back from the hall. The seats morph into router nodes (circles with the network accent color), the aisles become connecting lines, and the folded note becomes a small envelope labeled with a destination address.

> Use the real address for moodle.com: run `dig +short moodle.com` during the lab and put the first result on the label. Do not invent an address.

**Narration:**
> The internet works the same way.

---

### Scenes 6+ — Routing (to build after Scenes 1–5 work)

Rough plan, refine in the lab:

- **S6 Hops:** the envelope moves router to router. Each router shows a bubble: *"I don't know where that is — but this way gets you closer."* The chosen link glows; the rest stay dim. Camera follows the envelope.
- **S7 A link fails (optional):** one link turns red and breaks; the router picks another link; the envelope goes around.
- **S8 Arrival and reply:** the last router: *"That's mine!"* The server sends a reply envelope (different color) back, possibly by a different path. Pull back to show both paths.

**Narration draft:**
> At every router, the same answer: "I don't know where that is — but I know which way gets you closer." No router sees the whole route. Only the last one says: "That's mine." And the reply finds its way back the same way — no map, no master plan, just one local decision at a time.

---

## Narration voices (Kokoro)

| Role | Voice | Notes |
|---|---|---|
| Narrator | `am_michael` (or `af_sarah`) | calm, speed 1.0 |
| Student in Scene 4 | `af_bella` | slightly faster, speed 1.1 |

Generate one WAV per line (`audio/s1.wav`, `audio/s3.wav`, `audio/s4-student.wav`, …) and place each with Remotion's `<Audio>` inside its scene's `<Sequence>`, so timing lives with the scene.

---

## Fact check — claims the video makes

Every narrated claim must stay inside this list:

- [x] A request travels as packets carrying a destination address that stays the same along the way.
- [x] Each router decides only the next hop; no router knows the whole path.
- [x] Only the router connected to the destination's network delivers it directly.
- [x] If a link fails, routers can choose a different next hop.
- [x] The reply can come back by a different path.

Deliberately left out (true but out of scope): DNS details, MAC addresses, TTL, NAT, TCP/TLS.

---

## Build order (small steps, commit after each)

1. `<Camera>` wrapper with drift + a test rectangle. Preview in Studio.
2. S1 back view (static drawing). Then camera push-in.
3. S1 side view + typing `moodle.com` + Enter.
4. Whip-pan between the two S1 views.
5. S2 dive into screen.
6. S3 question.
7. S4 hall drawing (static).
8. S4a note + bubble. 9. S4b passing with camera follow. 10. S4c delivery.
11. Narration WAVs + `<Audio>` per scene.
12. S5 morph.
13. Render `render-01.mp4`. Then S6+ if time allows.

**Rules:** one scene or one change per step · check the live preview, not full renders · never overwrite a render (`render-01.mp4`, `render-02.mp4`, …).
