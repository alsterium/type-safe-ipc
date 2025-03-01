import { UserConfig } from "vite";
import { builtinModules } from "module";
import dummyApiTransformer from "../../plugin/vite-plugin-api-transformer";

const config: UserConfig = {
  mode: "production",
  root: __dirname,
  envDir: process.cwd(),
  plugins: [
    dummyApiTransformer({ apiTypesFile: '../main/api/index.ts', tsconfigPath: '../../tsconfig.json' })
  ],
  build: {
    outDir: "dist",
    lib: {
      entry: {
        preload: "./preload.ts",
      },
      formats: ["cjs"],
    },
    rollupOptions: {
      external: [
        "electron",
        "electron/main",
        ...builtinModules.flatMap((p) => [p, `node:${p}`]),
      ],
      output: {
        entryFileNames: "[name].cjs",
      },
    },
  },
};

export default config;
