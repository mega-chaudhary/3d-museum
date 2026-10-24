# Character generator

Rebuilds `him.glb` and `her.glb` with a different look: hair, hair colour, skin, eyes, clothes,
clothing colours, body shape and face shape. It produces the same kind of file the museum already
uses (realistic rigged human, Mixamo skeleton, 15 animations), so nothing else needs to change.

## Run it

```bash
cd tools/character-generator
npm install
npm run dev
```

A page opens at http://localhost:5190.

1. Click **1. Build both characters** (the first time it downloads about 30 MB of CC0 MakeHuman assets).
2. Click **2. Add animations** (retargets idle/walk/run/dance and adds the interaction clips).
3. Click **Download him.glb** and **Download her.glb**.
4. Copy both files into the museum's `public/models/` folder, replacing the old ones.

It needs an internet connection: the MakeHuman assets come from jsDelivr and the Mixamo source
clips come from the three.js repository on GitHub.

## What you can change (`characters.js`)

| Setting | Examples |
| --- | --- |
| `hair` | `culturalibre_hair_02` (swept side part), `short01`, `short02`, `short03`, `short04`, `long01`, `culturalibre_hair_01` (long sleek), `sonntag78_junglebook_hair` (shoulder layers), `ponytail01`, `bob01`, `bob02`, `braid01`, `afro01` |
| `hairColor` | any hex colour, e.g. `'#1a1412'` black, `'#3d2618'` dark brown |
| `skin` | `young_caucasian_male`, `young_asian_female`, `young_african_male`, … |
| `skinTint` | multiplies the skin colour, e.g. `'#f3dccb'` warmer |
| `eyes` | `brown`, `brownlight`, `green`, `blue`, `grey`, … |
| `clothes` | outfit + shoes, e.g. `['male_casualsuit05', 'shoes05']`. Other outfits: `male_casualsuit01`–`06`, `female_casualsuit01`–`02`, `female_sportsuit01`, `male_elegantsuit01`, `dress_knee01`, … Shoes: `shoes01`–`06` (`shoes05` = white sneakers) |
| `jacketColor`, `shirtColor` (Him) / `topColor` (Her) | RGB arrays, e.g. `[60, 44, 35]`. Only used with the default outfits, which are recoloured by region. |
| body | `height`, `weight`, `muscle`, `proportions` (0..1), `age` (0 = 18 years, 1 = 90) |
| `detail` | face and body sliders from -1 to 1: `jaw`, `chinWidth`, `noseWidth`, `noseLength`, `upperLip`, `lowerLip`, `browHeight`, `faceFat`, `shoulders`, `waist`, `hips`, … |
| `HIM_EXPRESSION` / `HER_EXPRESSION` | resting expression, e.g. `mouthSmileLeft: 0.4` |

If you change the height a lot, also update `scale` and `nativeSpeed` for that character in the
museum's `src/config/characters.js` (`nativeSpeed` is how fast the walk/run clips move the feet;
the current values are 1.49/2.59 m/s for Him and 1.19/2.16 m/s for Her).

## Licences

- MakeHuman / MPFB2 bodies, skins, hair and clothes: CC0 1.0, via
  [humanforge](https://github.com/abdulrehman043/humanforge) (MIT).
- Idle, walk, run and samba clips: Mixamo motion capture from the three.js examples (Mixamo/Adobe terms:
  free to use in your projects).
- Interaction clips (`poses.js`) and the retargeting code (`retarget.js`): written for this project, CC0.

The files built by the generator are not compressed, so they are about 4–6 MB each. The bundled
models in `public/models/` were additionally compressed (textures converted to WebP) to about 2.5 MB.
