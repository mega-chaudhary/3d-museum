# Character models

| File | Who | Height | Size |
| --- | --- | --- | --- |
| `him.glb` | Character "Him" (dark swept hair, dark brown jacket, white tee, blue jeans, white sneakers) | 1.77 m | 2.5 MB |
| `her.glb` | Character "Her" (long dark hair, cream top, blue jeans, white sneakers) | 1.51 m model, shown at 1.60 m | 2.6 MB |

Both are realistic, fully rigged human characters built for this project and styled after the
reference image you provided. Each GLB contains the mesh, skin, hair, eyes, clothing, a 52-bone
Mixamo-compatible skeleton, facial blendshapes, and 15 skeletal animations.

## Where they come from (and the licences)

**Bodies, faces, skins, eyes, hair and clothes: CC0 1.0 (public domain).**
Generated with [humanforge](https://github.com/abdulrehman043/humanforge) (MIT) from
[MakeHuman / MPFB2](https://github.com/makehumancommunity/mpfb2) assets, which are CC0.
Items used:

- Him: `male_casualsuit05` outfit (recoloured: dark brown overshirt, plain white tee, original denim),
  `culturalibre_hair_02` hair (by culturalibre, CC0), `shoes05` white sneakers, `young_caucasian_male` skin.
- Her: `female_casualsuit01` outfit (recoloured: cream ribbed top, original denim),
  `culturalibre_hair_01` long hair (by culturalibre, CC0), `shoes05` white sneakers, `young_caucasian_female` skin.

The recolouring and face shaping (jaw, nose, lips, smile) were done for this project to match the
reference. You may use, change and share these models freely.

**Animations (15 per character):**

| Clip | Source | Licence |
| --- | --- | --- |
| Idle, Walk, Run | Mixamo motion capture, from the three.js examples (`Xbot.glb`), retargeted onto these skeletons | Mixamo / Adobe terms: free to use in your own projects; the raw Mixamo files may not be redistributed on their own |
| Dance (samba) | Mixamo motion capture, from the three.js examples (`Michelle.glb`), retargeted | same as above |
| Wave, Hug, HoldHandLeft, HoldHandRight, Give, Receive, PickUp, SitDown, SitIdle, StandUp, Admire | Keyframed for this project directly on these skeletons | CC0 |

Retargeting converts the motion from the T-pose source rig to these A-pose characters by matching
bone directions and transferring world-space rotations, with hip motion scaled to the character's
leg length (`tools/character-generator/retarget.js`).

## Changing how they look

See `tools/character-generator/README.md`: edit `characters.js` (hair, skin, clothes, face sliders,
colours), run the generator, and replace these two files.

## Using your own models instead

Any rigged humanoid GLB with **Mixamo bone names** (`mixamorigHips`, `mixamorigRightHand`, …) and
clips named as in `src/config/characters.js` (`Idle`, `Walk`, `Run`, `Dance`, `Hug`, …) will work:
replace the file and update `scale` and `nativeSpeed` in that config.
