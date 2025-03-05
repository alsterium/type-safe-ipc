import { UserConfig } from "vite";
import { builtinModules } from "module";

const config: UserConfig = {
  mode: "production",
  root: __dirname,
  envDir: process.cwd(),
  build: {
    outDir: "dist",
    lib: {
      entry: {
        main: "./index.ts",
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
