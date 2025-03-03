// vite-plugin-dummy-api.ts
import { Plugin } from 'vite';
import path from 'path';
import { Project, SyntaxKind } from 'ts-morph'
import { transformDummyApi } from './dummy-api-transformer-common'

/**
 * Vite プラグイン: API モジュールの型情報を解析し、ダミー API 実装を自動生成
 *
 * ## 概要
 * - TypeScript の型情報を取得し、API の関数を空の関数 `() => {}` に置き換える
 * - `export default { someApi }` の `someApi` を `{ someApi: { func1: () => {}, ... } }` に展開
 * - モジュールの型定義を元に、関数名を動的に取得
 *
 * ## 使用方法
 * ```ts
 * import dummyApiTransformer from './vite-plugin-api-transformer';
 *
 * export default defineConfig({
 *   plugins: [
 *     dummyApiTransformer({
 *       apiTypesFile: 'src/api-types.ts', // API 型定義ファイルの相対パス
 *       tsconfigPath: 'tsconfig.json'     // tsconfig.json への相対パス
 *     })
 *   ]
 * });
 * ```
 */
export default function dummyApiTransformer(options: {
  apiTypesFile: string;
  tsconfigPath: string;
}): Plugin {
  const resolvedApiTypesBasePath = path.dirname(
    path.resolve(options.apiTypesFile)
  );
  const resolvedApiTypesPath = path.resolve(options.apiTypesFile);
  const resolvedTsconfigPath = path.resolve(options.tsconfigPath);

  const project = new Project({ tsConfigFilePath: resolvedTsconfigPath });
  console.log("target:", resolvedApiTypesPath);

  return {
    name: "dummy-api-transformer",
    enforce: "pre",
    transform(code, id) {
      if (path.resolve(id) !== resolvedApiTypesPath) return;
      const transformedCode = transformDummyApi(
        code,
        path.resolve(id),
        project,
        resolvedApiTypesBasePath
      );
      return { code: transformedCode, map: null };
    },
  };
}
