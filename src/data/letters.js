// ─────────────────────────────────────────────────────────────
// Letter Room content.
// `audio` is optional. Put an .mp3 at public/audio/voice-message.mp3
// (or change the path). If the file is missing, the player is hidden.
// ─────────────────────────────────────────────────────────────
export const DESK_LETTER = {
  id: 'desk-letter',
  title: 'A Letter For You',
  salutation: 'My love,',
  paragraphs: [
    'If you are reading this, you have walked through every frame of the Memory Hall. I hope you smiled at least once.',
    'I wanted to make you something that you could walk around in, because the way you make me feel is not something that fits on a card. It needs rooms. It needs light. It needs space to breathe.',
    'Thank you for every ordinary day you made extraordinary, for every time you listened, and for every time you stayed.',
    'There is more ahead. Keep walking.',
  ],
  closing: 'Forever yours,',
  signature: 'Me',
  audio: 'audio/voice-message.mp3',
}

export const FRAMED_NOTE = {
  id: 'framed-note',
  image: 'memories/framed-note.jpg',
  title: 'The First Note',
  date: 'March 2023',
  caption: 'The first note I ever wrote you',
  message:
    'I wrote this on a napkin and was too shy to give it to you for a week. I kept it all this time.',
}

export const FLOWERS = {
  id: 'rose-vase',
  title: 'Red roses',
  pickedMessage: 'You picked a rose. Maybe it belongs somewhere special…',
}
