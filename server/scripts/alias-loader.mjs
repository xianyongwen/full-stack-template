/**
 * ESM loader for resolving @/ path alias in development (tsx) mode.
 * Replaces @/ with the absolute path to src/.
 */
import { readFileSync } from "fs";
import { dirname, join, resolve as pathResolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Read baseUrl and paths from tsconfig.json
const tsconfig = JSON.parse(readFileSync(join(root, "tsconfig.json"), "utf-8"));
const { baseUrl, paths } = tsconfig.compilerOptions;
const basePath = pathResolve(root, baseUrl || ".");

// Build alias map from tsconfig paths
const aliasMap = new Map();
for (const [pattern, targets] of Object.entries(paths || {})) {
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -2); // e.g. "@" from "@/*"
    const target = targets[0];
    if (target.endsWith("/*")) {
      aliasMap.set(prefix, pathResolve(basePath, target.slice(0, -2)));
    }
  }
}

export function resolve(specifier, context, nextResolve) {
  for (const [prefix, targetPath] of aliasMap) {
    if (specifier.startsWith(prefix + "/")) {
      const resolved = pathToFileURL(join(targetPath, specifier.slice(prefix.length + 1)));
      return nextResolve(resolved.href);
    }
    if (specifier === prefix) {
      const resolved = pathToFileURL(targetPath);
      return nextResolve(resolved.href);
    }
  }
  return nextResolve(specifier);
}
