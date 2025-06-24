import { Toodle } from "@vaguevoid/toodle";

const canvas = document.querySelector("canvas")!;
const toodle = await Toodle.attach(canvas, {
  filter: "nearest",
  limits: { textureArrayLayers: 5 },
});

const produceTextures = {
  ItemApple: new URL("img/ItemApple.png", "https://toodle.void.dev"),
  ItemBanana: new URL("img/ItemBanana.png", "https://toodle.void.dev"),
  ItemBroccoli: new URL("img/ItemBroccoli.png", "https://toodle.void.dev"),
  ItemCherry: new URL("img/ItemCherry.png", "https://toodle.void.dev"),
  ItemKiwi: new URL("img/ItemKiwi.png", "https://toodle.void.dev"),
  ItemLemon: new URL("img/ItemLemon.png", "https://toodle.void.dev"),
  ItemOnion: new URL("img/ItemOnion.png", "https://toodle.void.dev"),
  ItemPea: new URL("img/ItemPea.png", "https://toodle.void.dev"),
  ItemPeach: new URL("img/ItemPeach.png", "https://toodle.void.dev"),
  ItemPumpkin: new URL("img/ItemPumpkin.png", "https://toodle.void.dev"),
  ItemRadish: new URL("img/ItemRadish.png", "https://toodle.void.dev"),
  ItemSpinach: new URL("img/ItemSpinach.png", "https://toodle.void.dev"),
  ItemTomato: new URL("img/ItemTomato.png", "https://toodle.void.dev"),
};

const pantryTextures = {
  ItemBaguette: new URL("img/ItemBaguette.png", "https://toodle.void.dev"),
  ItemCheese: new URL("img/ItemCheese.png", "https://toodle.void.dev"),
  ItemCoffee: new URL("img/ItemCoffee.png", "https://toodle.void.dev"),
  ItemButterscotchCinnamonPie: new URL(
    "img/ItemButterscotchCinnamonPie.png",
    "https://toodle.void.dev",
  ),
  ItemChilidog: new URL("img/ItemChilidog.png", "https://toodle.void.dev"),
  ItemSeaSaltIceCream: new URL(
    "img/ItemSeaSaltIceCream.png",
    "https://toodle.void.dev",
  ),
  ItemTurkeyLeg: new URL("img/ItemTurkeyLeg.png", "https://toodle.void.dev"),
};

await toodle.assets.registerBundle("produce", { textures: produceTextures });
await toodle.assets.registerBundle("pantry", { textures: pantryTextures });

await toodle.assets.loadBundle("produce");
await toodle.assets.loadBundle("pantry");

{
  const usage = toodle.assets.extra.getAtlasUsage();
  console.log("used", usage.used, "available", usage.available);
}
await toodle.assets.unloadBundle("pantry");

{
  const usage = toodle.assets.extra.getAtlasUsage();
  console.log("used", usage.used, "available", usage.available);
}

await toodle.assets.loadBundle("pantry");

toodle.startFrame();
toodle.draw(
  toodle.Quad("ItemPumpkin", {
    idealSize: { width: 100, height: 100 },
    position: { x: -60, y: 0 },
  }),
);
toodle.draw(
  toodle.Quad("ItemTurkeyLeg", {
    idealSize: { width: 100, height: 100 },
    position: { x: 60, y: 0 },
  }),
);
toodle.endFrame();
