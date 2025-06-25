import { Toodle } from "../src/Toodle";
import { createCanvas } from "./util";

const canvas = createCanvas(window.innerWidth, window.innerHeight);
const toodle = await Toodle.attach(canvas, { filter: "nearest" });

const baseUrl = "http://localhost:3000";
const basePath = "/tmp-dist";
await toodle.assets.registerBundle("haaalp", {
  atlases: [
    {
      json: new URL(`${basePath}/core.json`, baseUrl),
      png: new URL(`${basePath}/core.png`, baseUrl),
    },
    {
      json: new URL(`${basePath}/character_book_bench-0.json`, baseUrl),
      png: new URL(`${basePath}/character_book_bench-0.png`, baseUrl),
    },
  ],
  autoLoad: true,
});

let i = 0;

function frame() {
  toodle.startFrame();
  if (toodle.frameCount % 12 === 0) {
    i++;
    i %= 4;
  }

  toodle.draw(
    toodle.Quad(`character/book/rough/Book_Hurt_Crouch_0${i + 1}.png`),
  );

  toodle.endFrame();
  requestAnimationFrame(frame);
}

frame();
