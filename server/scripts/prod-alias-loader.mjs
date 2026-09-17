/**
 * ESM loader for resolving @/ path alias in production.
 * Maps @/ to the current working directory (dist root).
 *
 * Usage: node --import ./prod-alias-loader.mjs index.js
 */
import { existsSync, statSync } from "fs";
import { pathToFileURL } from "url";
import { resolve as pathResolve } from "path";
import { register } from "node:module";

const baseDir = process.cwd();

// Resolve a @/ alias specifier to an absolute file path.
// Node ESM rejects directory imports, so a bare directory must be
// expanded to its index.js rather than returned as-is.
function resolveAliasPath(specifier) {
  const rel = specifier.slice(2); // strip "@/"
  const fullPath = pathResolve(baseDir, rel);

  // Path exists as a file (specifier already has an extension) -> use as-is
  if (existsSync(fullPath) && statSync(fullPath).isFile()) {
    return fullPath;
  }
  // Try with .js extension (extensionless file import)
  if (existsSync(fullPath + ".js")) {
    return fullPath + ".js";
  }
  // Try as directory with index.js (barrel import, e.g. "@/modules/ai/analysis")
  if (existsSync(fullPath + "/index.js")) {
    return fullPath + "/index.js";
  }
  // Fallback: return as-is and let Node handle the error
  return fullPath;
}

// Self-register when used with --import
register(
  // The resolve/load hooks are defined inline via data URL
  // to avoid needing a second file
  `data:text/javascript,${encodeURIComponent(`
    import { existsSync, statSync } from "fs";
    import { pathToFileURL } from "url";
    import { resolve as pathResolve } from "path";

    const baseDir = process.cwd();

    function resolveAliasPath(specifier) {
      const rel = specifier.slice(2);
      const fullPath = pathResolve(baseDir, rel);
      if (existsSync(fullPath) && statSync(fullPath).isFile()) return fullPath;
      if (existsSync(fullPath + ".js")) return fullPath + ".js";
      if (existsSync(fullPath + "/index.js")) return fullPath + "/index.js";
      return fullPath;
    }

    export function resolve(specifier, context, nextResolve) {
      if (specifier.startsWith("@/")) {
        const fullPath = resolveAliasPath(specifier);
        return nextResolve(pathToFileURL(fullPath).href);
      }
      return nextResolve(specifier);
    }
  `)}`,
  pathToFileURL(baseDir)
);
