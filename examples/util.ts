import { DEFAULT_LIMITS } from "../src/limits";

export function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.setAttribute("tabindex", "0");

  document.body.appendChild(canvas);
  return canvas;
}

export async function getRandomWords() {
  const storedWords = localStorage.getItem("random-words");

  if (storedWords) {
    return JSON.parse(storedWords);
  }

  const words = await getWordBatch(DEFAULT_LIMITS.instanceCount);
  localStorage.setItem("random-words", JSON.stringify(words));
  return words;
}

async function getWordBatch(size = 2048): Promise<string[]> {
  // API returns max 500 words per request, so we need multiple fetches
  const batchSize = 500;
  const numBatches = Math.ceil(size / batchSize);
  const batches = [] as any[];

  for (let i = 0; i < numBatches; i++) {
    const wordsToFetch = Math.min(batchSize, size - i * batchSize);
    const batch = await fetch(
      `https://random-word-api.vercel.app/api?words=${wordsToFetch}`,
    ).then((r) => r.json());
    batches.push(...batch);
  }

  return batches;
}

export const Palette = {
  AQUAMARINE: { r: 0.498039, g: 1, b: 0.831373, a: 1 },
  LIGHT_CORAL: { r: 1, g: 0.5, b: 0.313726, a: 1 },
  LIGHT_SALMON: { r: 1, g: 0.627451, b: 0.478431, a: 1 },
  LIGHT_SEA_GREEN: { r: 0.533333, g: 1, b: 0.980392, a: 1 },
  LIGHT_SKY_BLUE: { r: 0.529412, g: 0.807843, b: 0.980392, a: 1 },
  LIGHT_STEEL_BLUE: { r: 0.596078, g: 0.690196, b: 0.803922, a: 1 },
  CORNFLOWER_BLUE: { r: 0.392157, g: 0.584314, b: 0.929412, a: 1 },
  HOT_PINK: { r: 1, g: 0.411765, b: 0.705882, a: 1 },
  REBECCA_PURPLE: { r: 0.4, g: 0.2, b: 0.6, a: 1 },
  MAGENTA: { r: 1, g: 0, b: 1, a: 1 },
  CYAN: { r: 0, g: 1, b: 1, a: 1 },
  BLACK: { r: 0, g: 0, b: 0, a: 1 },
  WHITE: { r: 1, g: 1, b: 1, a: 1 },
};
