// Card art lookup for Side Effects — same drop-in pattern as
// src/utils/cardArt.js's Love Letter lookup. No art files ship yet; paths
// point at the expected location (see public/card-art/side-effects/
// README.md) so dropping the real PNGs in later needs zero code changes.
const BACK_IMAGE_URL = '/card-art/side-effects/back.png';

const CARD_ART = {
  anxiety: '/card-art/side-effects/anxiety-front.png',
  anorexia: '/card-art/side-effects/anorexia-front.png',
  depression: '/card-art/side-effects/depression-front.png',
  gamblingAddiction: '/card-art/side-effects/gamblingAddiction-front.png',
  impotence: '/card-art/side-effects/impotence-front.png',
  madness: '/card-art/side-effects/madness-front.png',
  suicidalThoughts: '/card-art/side-effects/suicidalThoughts-front.png',
  tremors: '/card-art/side-effects/tremors-front.png',

  anxietyTreatment: '/card-art/side-effects/anxietyTreatment-front.png',
  depressionTreatment: '/card-art/side-effects/depressionTreatment-front.png',
  gamblingAddictionTreatment: '/card-art/side-effects/gamblingAddictionTreatment-front.png',
  impotenceTreatment: '/card-art/side-effects/impotenceTreatment-front.png',
  madnessTreatment: '/card-art/side-effects/madnessTreatment-front.png',
  suicidalThoughtsTreatment: '/card-art/side-effects/suicidalThoughtsTreatment-front.png',
  tremorsTreatment: '/card-art/side-effects/tremorsTreatment-front.png',

  episode: '/card-art/side-effects/episode-front.png',
  therapy: '/card-art/side-effects/therapy-front.png',

  misdiagnosis: '/card-art/side-effects/misdiagnosis-front.png',
  highTolerance: '/card-art/side-effects/highTolerance-front.png',
};

export function frontImageFor(cardId) {
  return CARD_ART[cardId];
}

export function backImageFor() {
  return BACK_IMAGE_URL;
}
