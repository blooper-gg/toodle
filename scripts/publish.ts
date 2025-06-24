import { $ } from "bun"
import packageJson from "../package.json"

const status = await $`git status -s`.arrayBuffer()
if (status.byteLength !== 0) {
  throw new Error("git status is not empty, please commit or stash changes before publishing")
}

if (!process.env.NPM_TOKEN) {
  throw new Error("NPM_TOKEN is not set in the environment, publish will fail.")
}


const remoteVersion = await tryP(() => $`npm view ${packageJson.name} version`.text(), "0.0.0")
const npmVersion = remoteVersion.split(".").map((str) => Number.parseInt(str))
const packageJsonVersion = packageJson.version.split(".").map((str) => Number.parseInt(str))

let version = npmVersion
if (packageJsonVersion[0] > npmVersion[0]) {
  version = packageJsonVersion
} else if (packageJsonVersion[1] > npmVersion[1]) {
  version[1] = packageJsonVersion[1]
  version[2] = packageJsonVersion[2]
} else if (packageJsonVersion[2] > npmVersion[2]) {
  version[2] = packageJsonVersion[2]
}

version[2]++
packageJson.version = version.join(".")

for (const [key, value] of Object.entries(packageJson.exports)) {
  (packageJson.exports as Record<string, unknown>)[key] = {
    import: value.import.replace("src", "dist").replace(".ts", ".js"),
    types: value.types.replace("src", "dist").replace(".ts", ".d.ts"),
  }
}

await $`echo ${JSON.stringify(packageJson, null, 2)} > package.json`
await $`bun run build`
await $`git tag "${packageJson.version}"`
await $`git push --tags`
await Bun.write(".npmrc", `//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}`)
await $`npm publish --no-git-checks`

async function tryP<T>(fn: () => Promise<T>, fallback: T) {
  try {
    return await fn()
  } catch(err) {
    console.error(err)
    return fallback
  }
}