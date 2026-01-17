import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { VERSIONS } from "../constants.js";
import type { ProjectConfig } from "../types.js";
import { writeJson } from "../utils.js";

export async function generatePackageShared(config: ProjectConfig) {
  const { projectPath, scopedName } = config;
  const pkgDir = join(projectPath, "packages/shared");

  await writeJson(join(pkgDir, "package.json"), {
    name: `${scopedName}/shared`,
    version: "0.1.0",
    private: true,
    type: "module",
    main: "./src/index.ts",
    types: "./src/index.ts",
    scripts: {
      build: "tsc",
    },
    devDependencies: {
      typescript: VERSIONS.typescript,
    },
  });

  await writeJson(join(pkgDir, "tsconfig.json"), {
    extends: "../../tsconfig.base.json",
    include: ["src"],
  });

  await writeFile(
    join(pkgDir, "src/index.ts"),
    `export const VERSION = '0.1.0';\n`
  );
}
