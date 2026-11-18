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
- One reusable `<Camera>` wrapper: `({x, y, zoom, rotate}) => transform` applied to the whole scene's SVG.
- Every camera move uses `spring()` or eased `interpolate()` — never linear.
- A constant subtle drift on top of every move (slow sine wave, ±4 px, ±0.3°) so the camera never feels locked.
- The camera follows whatever is moving (the note, the packet), leading the motion slightly.

**Transitions:** no hard cuts. Push-ins, whip-pans, or match-cuts.

**Video settings:** 1920×1080, 30 fps.

---

## Project structure (built for parallel agents)

```
src/
  theme.ts                 # colors, fonts, outline width — shared, rarely edited
  components/
    Camera.tsx             # floating camera wrapper — shared
    Bubble.tsx             # speech bubble — shared
    Envelope.tsx           # the request packet with an address label — shared
    Person.tsx             # the person at the desk (used in S1 and S5) — shared
  scenes/
    S1Room.tsx
    S2Dive.tsx
    S3Question.tsx
    S4Note.tsx
    S5BackToRequest.tsx
    S6DNS.tsx
    S7HomeRouter.tsx
    S8Hops.tsx
    S9Arrival.tsx
  Main.tsx                 # the full video: <Series> of all scenes, in order
  Root.tsx                 # registers Main + every scene as its own composition
public/audio/              # one WAV per narration line: s1.wav, s3.wav, s4.wav ...
```

**Rules:**
- Each scene is self-contained: its own drawings, camera moves, and its own `<Audio>` for its narration. Timing starts at frame 0 inside each file.
- Each scene exports its length: `export const S1_DURATION = 270;` (frames at 30fps). `Main.tsx` uses these to sequence the scenes.
- `Root.tsx` registers every scene as its own composition so each can be previewed alone in Studio, plus `Main` for the full video.
- Shared files (`theme.ts`, `components/`) are built first, before parallel work starts. After that, changes to them go through one agent only.
- **One agent = one scene file.** Only one agent edits `Main.tsx` / `Root.tsx`.
- When committing, each agent stages only its own files (`git add src/scenes/S4Note.tsx public/audio/s4*.wav`), never `git add .`.

**Parallel prompt template:**
> Read SCRIPT.md (style guide + Scene N). You own only `src/scenes/SN….tsx` and `public/audio/sN*.wav`. Don't edit any other file. Build the next small step of Scene N, show it in Studio (composition `SN…`), and commit only your files.

---

## Scenes

Timings are targets, not rules. Total ≈ 60 seconds. A partial video is fine.

### Scene 1 — The room (0:00–0:09) · `S1Room.tsx`

**Visual:** A cozy room at evening. A person on an office chair at a desk with a laptop. Warm desk lamp.

**Camera:** Starts behind the person, floats around to a 3/4 side view facing the screen.

> Fake the orbit: back view with slow push-in (0:00–0:04) → whip-pan (~6 frames, horizontal smear) → 3/4 side view with slow push-in (0:04–0:09).

**Action:** In the side view, a browser **address bar**. `moodle.com` types itself letter by letter, then Enter (key squash + click flash).

**Narration:**
> Every day, we send countless requests across the internet — every click, every search, every page we open.

---

### Scene 2 — Into the screen (0:09–0:12) · `S2Dive.tsx`

**Visual + camera:** The camera pushes into the laptop screen, flashes white, fades to an empty cream canvas.

**Narration:** none.

---

### Scene 3 — The question (0:12–0:18) · `S3Question.tsx`

**Visual:** Empty canvas. A dotted line draws from the left, wanders, and ends in the middle with a hand-drawn "?".

**Camera:** slow drift, slight push-in on the "?".

**Narration:**
> But how does that request actually reach the destination server — the one that knows how to send back the answer we asked for?

---

### Scene 4 — The note (0:18–0:28) · `S4Note.tsx` — **short analogy, ~10 seconds**

**Visual:** A lecture hall, simple and quick. Rows numbered on the aisle side.

**Action (fast):**
1. Close on a student in the back row. She folds a small note and taps the student in front: bubble **"Row 3, seat 5!"** (0:18–0:21)
2. The note jumps forward hand to hand in quick arcs, a tiny **"→"** bubble over each hand. Camera follows the note. (0:21–0:26)
3. In row 3 it goes sideways and lands in seat 5's hands. (0:26–0:28)

**Narration:**
> Think of passing a note in a lecture hall. Nobody knows who's in row 3, seat 5 — each person just passes it one row closer.

---

### Scene 5 — Back to our request (0:28–0:31) · `S5BackToRequest.tsx`

**Visual:** A quick cartoon "rewind" (the note scene smears/spins away) and we're back at the person at the desk, side view, the moment Enter is pressed. A small envelope (`#FF7A59`) pops out of the laptop and hovers next to it. Its label reads only **`moodle.com`**.

**Camera:** settles on the laptop and the envelope.

**Narration:**
> Back to our request.

---

### Scene 6 — Name to address: DNS (0:31–0:38) · `S6DNS.tsx`

**Visual:**
1. The envelope hovers; its label `moodle.com` gets a small "?" next to it.
2. A small question card flies from the laptop off to a **DNS server** (cartoon server with a phone-book / address-book icon and the label "DNS"): **"Where is moodle.com?"**
3. The DNS server flips through its book and sends back a card with a number.
4. The label on the envelope flips over: `moodle.com` → the IP address.

> Use `203.0.113.7` on the label everywhere in the video. It's from a range reserved for documentation and examples, so it's an obviously illustrative address and doesn't belong to anyone.

**Camera:** follows the question card out and back, then returns to the envelope for the label flip.

**Narration:**
> But unlike the note, "moodle.com" isn't an address — it's just a name. So first, your computer asks a DNS server to translate it into a number: an IP address.

---

### Scene 7 — The home router (0:38–0:43) · `S7HomeRouter.tsx`

**Visual:** The envelope flies to a small home router (box with antennas, blinking lights) on a shelf in the same room. Router bubble:
**"Not for this house… → internet provider!"**
The envelope shoots out through a cable in the wall.

**Narration:**
> First stop: your home router. It knows almost nothing — just that anything outside your home goes to your internet provider.

---

### Scene 8 — Hop by hop (0:43–0:55) · `S8Hops.tsx`

**Visual:** Camera pulls out to a wide map-like view: clusters of routers (rack boxes) connected by lines — first your provider's network, then other networks. Most lines dim, the chosen line glows.

**Action:** The envelope jumps router to router. Over each router a bubble pops: **"Don't know where that is — but this way's closer →"**. The first two hops are slow and readable, then it speeds up. Camera follows the envelope.

**Narration:**
> Your provider's routers don't know where moodle.com is either. Each one just knows which neighbor gets it closer — and passes it on. Hop by hop, just like the note.

---

### Scene 9 — Arrival and return (0:55–1:03) · `S9Arrival.tsx`

**Visual:** The last router's bubble: **"That's mine! →"** and it hands the envelope to the server (a cartoon server rack with the Moodle-style label "moodle.com" in plain text — no logo). The server sends back a reply envelope in a different color. Pull back: both paths glow on the map. Final text on screen: the takeaway sentence.

**Narration:**
> Only the last router knows exactly where it goes. Then the page travels back the same way — no map, no master plan, just one step closer at a time.

---

## Narration voices (Kokoro)

| Role | Voice | Notes |
|---|---|---|
| Narrator | `am_michael` | calm, speed 1.0 |

Generate one WAV per scene line (`public/audio/s1.wav`, `s3.wav`, `s4.wav`, `s5.wav`, `s6.wav`, `s7.wav`, `s8.wav`, `s9.wav`) with `tts.py`, and place each with `<Audio>` inside its own scene. If a WAV is longer than its scene, lengthen the scene (update its exported duration) rather than speeding up the voice.

---

## Fact check — claims the video makes

Every narrated claim must stay inside this list:

- [x] Routers work with numeric IP addresses, not names; a DNS server translates a name like moodle.com into an IP address before the request is sent.
- [x] The request travels as packets carrying a destination address that stays the same along the way.
- [x] A home router sends anything not addressed to the home network to the internet provider (its default route).
- [x] Each router decides only the next hop; no router knows the whole path.
- [x] The request may cross several networks (the provider's, then others) before reaching the destination's network.
- [x] Only the router connected to the destination's network delivers it directly to the server.
- [x] The reply travels back the same way (hop by hop), not necessarily on the same path.

Wording rule: routers **forward** (pass on) the packet — they don't "refer" the user to someone else. Intermediate machines are **routers**, not servers; the **server** is only the destination.

Visual caveat for Scene 6: keep the DNS question's trip abstract (it flies off-screen and back). Don't show it skipping the home router or claim it goes there directly — in reality the DNS question travels over the network too.

Deliberately left out: how DNS lookups are resolved (resolvers, root/TLD servers, caching), MAC addresses, TTL, NAT, TCP/TLS, CDNs.

---

## Build order (small steps, commit after each)

1. Shared: `theme.ts`, `<Camera>` with drift, `Bubble`, `Envelope`, `Person`.
2. S1 back view → push-in → side view → whip-pan → typing + Enter → narration.
3. S2 dive. S3 question.
4. S4 note (can run in parallel with S1–S3 once shared files exist).
5. S5 back to request. S6 DNS. S7 home router.
6. S8 hops (the most work — start early in a parallel window).
7. S9 arrival.
8. `Main.tsx` sequencing → render `render-01.mp4`. Then iterate.

**Rules:** one scene or one change per step · check the live preview, not full renders · never overwrite a render (`render-01.mp4`, `render-02.mp4`, …).
