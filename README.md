# usss — A Museum of Us

A walkable 3D memory museum with **two realistic, fully animated human characters**. You control one of
them in third person; the other walks beside you, follows you through five connected rooms, and joins in:
holding hands, dancing, hugging, sitting together, looking at memories together, and exchanging a rose and a gift.

Built with **React 18 · Vite 5 · Three.js · React Three Fiber · @react-three/drei · Zustand**.

---

## 1. Requirements

- **Node.js 18 or newer** (20 or 22 recommended). Check with `node -v`.
  Download: https://nodejs.org (choose the LTS version).
- A browser with WebGL 2: Chrome, Edge, Firefox or Safari (desktop or phone).

## 2. Install and run

Open a terminal **in this folder** (the one that contains `package.json`) and run:

```bash
npm install
npm run dev
```

Vite prints two addresses, for example:

```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.20:5173/
```

- Open the **Local** address on this computer.
- To test on your **phone**, connect it to the same Wi‑Fi and open the **Network** address.

To make a production build (for hosting):

```bash
npm run build      # outputs the finished site to dist/
npm run preview    # serves dist/ locally to check it
```

The `dist/` folder can be uploaded to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages).

Everything needed is included: the character model, fonts and placeholder photos all ship with the
project, so it works offline after `npm install`.

## 3. Controls

| Action | Desktop | Phone / tablet |
| --- | --- | --- |
| Walk | `W A S D` or arrow keys | Left joystick |
| Run | hold `Shift` | Push the joystick all the way |
| Look around | Drag with the mouse | Drag anywhere on the right side |
| Zoom | Mouse wheel | — |
| Interact | `E` (when a prompt appears) | Round button (lights up when something is in reach) |
| Wave (they wave back) | `Q` | Wave button |
| Hold hands / let go | `1` | Together bar → Hold hands |
| Dance together | `2` | Together bar → Dance |
| Hug | `3` | Together bar → Hug |
| Give the rose / the gift | `4` | Together bar → Give rose / Give gift |
| Close a memory / letter | `Esc`, `E`, or the × button | × button |

The camera follows behind the character, settles behind you as you walk forward, and pulls in
automatically so it never goes through walls. The **Together bar** appears when the two characters are
standing close; moving cancels a dance.

## 4. The two characters

On the start screen, choose **Who are you? Him / Her**. You control that character; the other one is the
partner.

- **Him** — dark swept hair, dark brown jacket over a white tee, blue jeans, white sneakers (1.77 m).
- **Her** — long dark hair, cream top, blue jeans, white sneakers (1.60 m).

Both are realistic rigged 3D humans (GLB, 52-bone Mixamo-compatible skeleton, skin, hair, eyes,
clothing, facial blendshapes) styled after your reference image, with 15 skeletal animations each.

**What the partner does on its own**

- Walks at your right side, matching your pace (walks when you walk, runs to catch up), finds its way
  through doorways, and steps around obstacles if it gets stuck.
- Stops when you stop and turns toward you, or toward the photo you are looking at.
- Waves back when you wave.
- When you open a memory, a letter or the dedication, comes to stand beside you and looks at it too.
- When you sit on a bench, walks to the other seat and sits down beside you; stands up when you do.

**Together actions (when you are close)**

| Action | What happens |
| --- | --- |
| Hold hands | The partner steps to your side, both play a hand-holding arm pose and IK joins the hands. You can walk together while holding hands (running is disabled). Press again to let go. |
| Dance | The partner faces you about a metre away and you both dance the same samba in sync. Move to stop. |
| Hug | The partner comes close, you face each other and both play the hug. Hearts appear. |
| Give rose | After picking a rose in the Letter Room: you hold it out, they reach to receive it, and the rose moves from your hand to theirs. |
| Give gift | After picking up the gift box in the Grand Entrance: same exchange, then the gift's message opens. |

Paired actions automatically pick a spot with free floor (never inside a wall or furniture).

## 5. The walkthrough

1. **The Grand Entrance** — Title *USSS — A Museum of Us*, a dedication wall (press `E` to read it),
   a floor plan, a wrapped gift on a plinth (press `E` to pick it up), and the museum doors. Walk up to the doors and press `E`; they swing open and you walk
   through into the hall.
2. **The Memory Hall** — Eight framed photographs on both walls with dates and captions. Approaching a
   frame makes it glow and a spotlight glides onto it. Press `E` to open the memory (large photo, title,
   date, message). Benches in the middle: press `E` to sit, move to stand up.
3. **The Letter Room** — A writing desk with a handwritten letter (press `E` to read; an optional voice
   message plays inside it), a framed first note on the wall, bookshelves, a candle, and a vase of roses.
   Press `E` at the vase to **pick a rose** — the character bends down, picks it up and carries it, and can
   then give it to the partner (`4`).
4. **Our Timeline** — A brass‑edged path leads past six display panels in chronological order. Press `E`
   at a panel to open its memory card.
5. **The Final Surprise** — Dark until you physically walk in. Then a veil lifts from the artwork,
   spotlights rise, petals fall and the heading appears. Press `E` at the pedestal to open the secret
   message (if either of you carries the rose, it is placed on the pedestal first). From there you can **Replay from
   the beginning** or **Return to the entrance**.

All rooms are one continuous 3D space joined by real doorways with collision — no scene switching.

## 6. Personalise it

### The easy way: the in-page editor

Click **Edit museum** (top right) to change every photo, title, date and message, both names, the
letter and the final surprise. Where your changes go depends on how you opened the museum:

| How you opened it | Where Edit museum appears | What Save does |
| --- | --- | --- |
| On your computer with `npm run dev` | Always | Writes everything to `public/museum.json` in your project. Commit and push it to GitHub; Vercel/Netlify rebuild your site. |
| Your hosted site (Vercel, Netlify…) | Only if you add `?edit` to the address, e.g. `usss.vercel.app/?edit` (visitors never see it) | Downloads `museum.json`. Upload it to your repository's `public/` folder (Add file → Upload files) and commit. |
| The museum link in Claude | Only for you (the owner) | Saves straight into that link; then use the page's Share menu to send it. |

Your photos are resized and stored inside `museum.json`, so it is the only file you need to commit.
To go back to the defaults, delete `public/museum.json`.

### By editing the data files

All text and photos live in `src/data/`. You never need to touch the 3D code.

| File | What it controls |
| --- | --- |
| `src/data/museum.js` | Title, subtitle, dedication wall text, the two names (`himName`, `herName`) |
| `src/data/memories.js` | The 8 Memory Hall frames (image, title, date, caption, message) |
| `src/data/letters.js` | The desk letter, voice message path, framed note, rose text |
| `src/data/timeline.js` | The 6 timeline panels |
| `src/data/finale.js` | The final artwork, wall heading and secret message |
| `src/data/gifts.js` | The gift box message and the rose thank-you line |

### Replace the photos

1. Copy your photos into `public/memories/` (JPG or PNG; around 1600 px on the long side is plenty).
2. In the data file, change `image` to match, e.g. `image: 'memories/our-first-date.jpg'`.
3. Save. The browser reloads automatically while `npm run dev` is running.

Frames resize to the photo's shape, so portrait and landscape both work. If a path is wrong, the frame
shows "Photo coming soon" instead of breaking, and the browser console names the missing file.

### Add a voice message

Put an audio file at `public/audio/voice-message.mp3`. A player appears inside the letter. Without the
file, the player stays hidden.

### What the character can do

All of these are real skeletal animations from the model, blended with 0.2–0.25 s crossfades:

| State | Clip | Notes |
| --- | --- | --- |
| Idle | `Idle` | |
| Walk / Run | `Walking_A` / `Running_A` | Playback rate is synced to the actual ground speed, so the feet don't slide. Walking into a wall drops back to idle. |
| Turn | — | Smooth rotation toward the movement direction while the gait keeps playing. |
| Interact | `Interact` | The character turns to face the exhibit first. |
| Wave | `Cheer` | `Q` / Wave button |
| Pick up the rose | `PickUp` | The rose is then attached to the hand bone and carried everywhere. |
| Sit on a bench | `Sit_Chair_Down` → `Sit_Chair_Idle` → `Sit_Chair_StandUp` | |

There is no dance animation in this free pack. If you switch to a Mixamo character (below), you can add
one (for example *Samba Dancing*) and map it in `src/config/character.js`.

## 7. Changing the characters

The models live in `public/models/` (`him.glb`, `her.glb`); see `public/models/README.md` for where
every part comes from and the licences (bodies, hair, clothes: CC0; idle/walk/run/dance: Mixamo motion
capture retargeted; the interaction clips: made for this project, CC0).

### Change their look (hair, clothes, colours, face)

1. `cd tools/character-generator`
2. `npm install`
3. Edit `characters.js` — for example `hair: 'long01'`, `hairColor: '#3d2618'`, `jacketColor: [40, 40, 44]`,
   or face sliders in `detail` (`jaw`, `noseWidth`, `upperLip`, … from -1 to 1).
4. `npm run dev` — a page opens. Click **1. Build both characters**, then **2. Add animations**, then download
   both files.
5. Copy `him.glb` and `her.glb` into `public/models/` of the museum (replace the old ones).

The generator needs internet the first time (it loads the CC0 MakeHuman assets from jsDelivr and the
Mixamo source clips from the three.js repository).

### Use completely different models

Any rigged humanoid GLB with **Mixamo bone names** (`mixamorigHips`, `mixamorigRightHand`, …) works if
it has clips named like those in `src/config/characters.js` (`Idle`, `Walk`, `Run`, `Dance`, `Hug`,
`HoldHandLeft`, …). Replace the file and update `scale` and `nativeSpeed` (the walk/run ground speed used
to keep the feet from sliding) in `src/config/characters.js`.

If a model fails to load, that character is replaced by a simple stand-in and the museum stays playable.

## 8. Performance

- Quality is picked automatically: phones and small screens use the **low** profile (no reflections,
  no real‑time shadows, lower resolution). Desktops use **high** (polished reflective floor, soft
  character shadow).
- Force a profile with the URL: `http://localhost:5173/?quality=low` or `?quality=high`.
- Lights are kept to a small fixed budget; gallery "spotlight" pools on walls are cheap light textures.

## 9. Project structure

```
usss/
├─ index.html · package.json · vite.config.js · vite.single.config.js
├─ public/
│  ├─ models/him.glb · her.glb    ← the two realistic animated characters (+ README with licences)
│  ├─ memories/*.jpg              ← placeholder photos (replace with yours)
│  └─ audio/                      ← optional voice-message.mp3
├─ scripts/build-single.mjs       ← builds the one-file version (npm run build:single)
├─ tools/character-generator/     ← rebuild the characters with a different look
└─ src/
   ├─ main.jsx · App.jsx · styles.css
   ├─ config/characters.js        ← model paths, clip names, speeds, scales
   ├─ data/                       ← ALL editable content
   │  ├─ museum.js · memories.js · letters.js · timeline.js · finale.js · gifts.js
   ├─ store/useGame.js            ← game state (focus, overlays, doors, rose, gift, couple, replay)
   ├─ systems/
   │  ├─ runtime.js               ← shared per-frame state (player, partner, couple), input, interactables
   │  ├─ colliders.js             ← 2D collision, camera ray test, free-spot test
   │  ├─ hooks.js · assets.js
   ├─ world/
   │  ├─ layout.js · Architecture.jsx · Lighting.jsx · textures.js · Museum.jsx (the <Canvas>)
   ├─ rooms/
   │  ├─ Entrance.jsx · MemoryHall.jsx · LetterRoom.jsx · TimelineRoom.jsx · FinalRoom.jsx
   ├─ components/
   │  ├─ Exhibits.jsx · Props.jsx (rose, gift box) · CanvasLabel.jsx · Spot.jsx · useLoadedTexture.js
   ├─ player/
   │  ├─ Humanoid.jsx             ← loads a character GLB, AnimationMixer, crossfades, arm masking, hand props
   │  ├─ Player.jsx               ← Character 1 (you)
   │  ├─ usePlayerController.js   ← movement, gait sync, collision, interactions, sitting, directed poses
   │  ├─ Partner.jsx              ← Character 2
   │  ├─ usePartnerController.js  ← follow AI, pathing, sitting/viewing together, paired choreography
   │  ├─ Director.jsx             ← fixed update order, hand-holding IK, hearts
   │  └─ FollowCamera.jsx         ← third-person camera with wall avoidance
   └─ ui/
      ├─ LoadingScreen.jsx (who are you?) · HUD.jsx · Controls.jsx (keys, joystick, Together bar) · Overlays.jsx
```

### Adding a new interactive object

Any component can become interactive with one hook:

```jsx
const focused = useInteractable('my-gift', {
  position: [x, 1, z],        // where it is
  radius: 2,                  // how close the character must be
  verb: 'Open', label: 'the gift',
  facePoint: [x, z],          // character turns to face this
  anim: 'pickup',             // optional: which animation to play
  onInteract: () => useGame.getState().openOverlay('memory', { id: 'gift', title: 'A gift', message: '…' }),
})
```

`focused` is `true` while the prompt is showing, so you can make the object glow.

## 10. Troubleshooting

- **Blank page / "WebGL" error** — update your browser or enable hardware acceleration
  (Chrome: Settings → System → *Use graphics acceleration when available*).
- **`npm` is not recognised** — install Node.js (step 1) and reopen the terminal.
- **Port already in use** — run `npm run dev -- --port 5174`.
- **Phone can't open the Network address** — make sure both devices are on the same Wi‑Fi, and allow
  Node through your computer's firewall when asked.
- **Photo shows "Photo coming soon"** — the file name in `src/data/…` doesn't match the file in
  `public/memories/` (names are case‑sensitive).

## Credits

- Characters: built from MakeHuman / MPFB2 assets (CC0) with humanforge (MIT); hair by culturalibre (CC0)
- Idle / walk / run / dance motion: Mixamo motion capture (via the three.js examples), retargeted
- Interaction animations (hold hands, hug, give, receive, wave, sit, pick up, admire): made for this project (CC0)
- Fonts: Cormorant Garamond, Jost, Caveat — SIL Open Font License (bundled via Fontsource)
- Everything else (architecture, textures, props) is generated in code.
