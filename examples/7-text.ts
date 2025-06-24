import { Toodle } from "../src/Toodle";
import { Palette, createCanvas, getRandomWords } from "./util";

const canvas = createCanvas(window.innerWidth, window.innerHeight);
const toodle = await Toodle.attach(canvas, {
  limits: {
    maxTextLength: 512,
  },
});
const words = await getRandomWords();

const fontId = await toodle.assets.loadFont(
  "ComicNeue",
  // new URL("/fonts/ComicNeue-Regular-msdf.json", window.location.href),
  new URL("/fonts/RobotoMono-msdf.json", "https://toodle.void.dev"),
);

const fontSize = 20;
const em2px = fontSize / toodle.assets.getFont(fontId).font.lineHeight;
const quad = toodle.Node();

const text = toodle.Text(
  "ComicNeue",
  [
    "*** DEBUG INFO ***",
    "---",
    "*** Keyboard Shortcuts ***",
    "[~] toggle this popup",
    "[1] toggle framedata display",
    "---",
    "*** Build Info ***",
    "2025/04/30 14:49:21",
    "commit #76d049a",
    "dont change wheel, but make it easier to customize",
    "---",
    "*** Settings ***",
    "AssetType: png",
    "AssetRes: maxres",
    "EventMode: off",
    "---",
    "*** User Agent ***",
    navigator.userAgent,
  ].join("\n"),
  {
    fontSize,
    color: Palette.BLACK,
  },
);
quad.add(text);

let frameNumber = 0;
let then = performance.now();

const shouldAnimate =
  new URLSearchParams(window.location.search).get("shouldAnimate") !== null;

function frame() {
  const now = performance.now();
  const delta = now - then;
  then = now;

  toodle.startFrame();
  if (shouldAnimate) {
    text.rotation += delta * 0.1;
  }
  toodle.draw(quad);
  toodle.endFrame();

  frameNumber++;
  if (shouldAnimate) {
    requestAnimationFrame(frame);
  }
}

frame();
