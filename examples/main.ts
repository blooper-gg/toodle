/// <reference types="vite/client" />

const params = new URLSearchParams(location.search);
const exampleId = params.get("example");

if (!exampleId) {
  const exampleImports = import.meta.glob(["./*.ts"]);
  const exampleNames = Object.keys(exampleImports)
    .filter((p) => !p.match(/(main|util)\.ts/))
    .map((path) => path.split("/").pop()?.replace(".ts", ""))
    .sort((a, b) => {
      const aNum = Number.parseInt(a?.match(/^\d+/)?.[0] || "0");
      const bNum = Number.parseInt(b?.match(/^\d+/)?.[0] || "0");
      return aNum - bNum;
    });

  document.body.innerHTML = `
  <dl style="padding: 5vh 5vw">
    ${exampleNames.map((name) => `<dt><a href="?example=${name}">${name}</a></dt>`).join("")}
  </dl>
  `;
} else {
  const module = await import(/*@vite-ignore*/ `./${exampleId}.ts`);
  if (!module) {
    throw new Error(`Example not found: ${exampleId}`);
  }
}
