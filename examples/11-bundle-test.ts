import { Toodle } from "../src/Toodle";
import type { AtlasCoords } from "../src/textures/types";
import { createCanvas } from "./util";

async function main() {
  const toodle = await Toodle.attach(
    createCanvas(window.innerWidth, window.innerHeight),
    {
      filter: "nearest",
    },
  );

  const ourTextures = {
    ItemApple: new URL("img/ItemApple.png", "https://toodle.gg"),
    ItemBanana: new URL("img/ItemBanana.png", "https://toodle.gg"),
    ItemBroccoli: new URL("img/ItemBroccoli.png", "https://toodle.gg"),
  };

  await toodle.assets.registerBundle("bundleA", { textures: ourTextures });
  await toodle.assets.registerBundle("bundleB", { textures: ourTextures });

  await toodle.assets.loadBundle("bundleA");
  await toodle.assets.loadBundle("bundleB");

  const shader = toodle.QuadShader(
    "texture atlas viewer",
    toodle.limits.instanceCount,
    /*wgsl*/ `
  @vertex
  fn vert(
	@builtin(vertex_index) VertexIndex: u32,
	@builtin(instance_index) InstanceIndex: u32,
	instance: InstanceData,
  ) -> VertexOutput {
	var output = default_vertex_shader(VertexIndex, InstanceIndex, instance);
	//
	output.engine_uv.x = output.engine_uv.z;
	output.engine_uv.y = output.engine_uv.w;

	output.engine_atlasIndex = InstanceIndex;
	return output;
  }

  @fragment
  fn fragment(vertex: VertexOutput) -> @location(0) vec4<f32> {
	let color = default_fragment_shader(vertex, nearestSampler);
	if (color.a == 0.0) {
		return vec4f(1.0, 0.0, 1.0, 1.0);
	}
	return color;
	// return color;
  }
  `,
  );

  toodle.clearColor = { r: 0.5, g: 0.5, b: 0.5, a: 1 };

  await toodle.assets.loadFont(
    "ComicNeue",
    new URL("https://toodle.gg/fonts/ComicNeue-Regular-msdf.json"),
  );
  printAssets(toodle);
  function frame() {
    toodle.startFrame();

    toodle.draw(toodle.Text("ComicNeue", "Please see the console :)"));
    toodle.endFrame();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "r":
        toodle.assets.unloadBundle("bundleB");
        printAssets(toodle);
        break;
      case "e":
        toodle.assets.unloadBundle("bundleA");
        printAssets(toodle);
    }
  });
}

function printAssets(toodle: Toodle) {
  const loadedAssets = toodle.assets.textures;
  let assetsLoaded = " R = Delete BundleA || E = Delete BundleB\n";
  if (!loadedAssets.size) {
    assetsLoaded = "OH NO WHERE DID OUR BUNDLES GO?!?! :(";
  } else {
    loadedAssets.forEach(
      (value: AtlasCoords[], key: string, _map: Map<string, AtlasCoords[]>) => {
        assetsLoaded += `\\nnID:${key}`;
        value.forEach(
          (value: AtlasCoords, index: number, _array: AtlasCoords[]) => {
            assetsLoaded += `\n\tAtlas Index: ${value.atlasIndex} \n\t\tUV Offsets:${value.uvOffset.x},${value.uvOffset.y}) \n\t\tUV Scale:${value.uvScale}`;
          },
        );
      },
    );
  }
  console.log(`#################\n${assetsLoaded}\n#################\n`);
}
main();
