// Appearance of the two characters, matched to the reference image.
// All assets are CC0 MakeHuman/MPFB2 assets via humanforge.
export const HIM = {
  gender: 1, age: 0.07, muscle: 0.58, weight: 0.42, height: 0.62, proportions: 0.7,
  african: 0.05, asian: 0.15, caucasian: 0.8,
  detail: { jaw: 0.35, chinProminence: 0.25, browDepth: 0.15, faceFat: -0.25, mouthWidth: 0.1, noseBridge: 0.2,
    shoulders: 0.35, chest: 0.2, vShape: 0.35, waist: -0.15, neckWidth: 0.1 },
  skin: 'young_caucasian_male', skinTint: '#fbebe0', eyes: 'brown',
  eyebrows: 'eyebrow006', eyebrowColor: '#1d1512', eyelashes: 'eyelashes01',
  hair: 'culturalibre_hair_02', hairColor: '#1a1412',
  clothes: ['male_casualsuit05', 'shoes05'],
}
export const HER = {
  gender: 0, age: 0.05, muscle: 0.45, weight: 0.38, height: 0.42, proportions: 0.72, cupSize: 0.45, firmness: 0.6,
  african: 0.03, asian: 0.3, caucasian: 0.67,
  detail: { faceFat: 0.15, jaw: -0.4, chinWidth: -0.25, noseWidth: -0.3, noseLength: -0.15, noseTip: 0.15,
    upperLip: 0.3, lowerLip: 0.35, cupidsBow: 0.3, browHeight: 0.1, neckLength: 0.2, waist: -0.3, hips: 0.2 },
  skin: 'young_caucasian_female', skinTint: '#fff0e8', eyes: 'brown',
  eyebrows: 'eyebrow001', eyebrowColor: '#241815', eyelashes: 'eyelashes03',
  hair: 'culturalibre_hair_01', hairColor: '#24170f',
  clothes: ['female_casualsuit01', 'shoes05'],
}

// Gentle smiles like the reference (ARKit-style expression names).
export const HIM_EXPRESSION = { mouthSmileLeft: 0.25, mouthSmileRight: 0.25 }
export const HER_EXPRESSION = { mouthSmileLeft: 0.4, mouthSmileRight: 0.4, cheekSquintLeft: 0.15, cheekSquintRight: 0.15 }

// Where the CC0 MakeHuman asset package is loaded from (about 30 MB, loaded on demand).
// Offline: clone https://github.com/abdulrehman043/humanforge and point this at assets/human.
export const ASSETS = 'https://cdn.jsdelivr.net/gh/abdulrehman043/humanforge@main/assets/human'

// Mixamo motion-capture clips used for retargeting (from the three.js examples).
export const ANIMATION_SOURCES = {
  locomotion: 'https://raw.githubusercontent.com/mrdoob/three.js/r169/examples/models/gltf/Xbot.glb',
  dance: 'https://raw.githubusercontent.com/mrdoob/three.js/r169/examples/models/gltf/Michelle.glb',
}
