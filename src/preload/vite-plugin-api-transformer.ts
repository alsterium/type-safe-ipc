// vite-plugin-dummy-api.ts
import { Plugin } from 'vite';
import path from 'path';
import { Project, SyntaxKind } from 'ts-morph'

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
export default function dummyApiTransformer(options: { apiTypesFile: string, tsconfigPath: string }): Plugin {
  const resolvedApiTypesBasePath = path.dirname(path.resolve(options.apiTypesFile))
  const resolvedApiTypesPath = path.resolve(options.apiTypesFile);
  const resolvedTsconfigPath = path.resolve(options.tsconfigPath);

  const project = new Project({ tsConfigFilePath: resolvedTsconfigPath });
  console.log('target:', resolvedApiTypesPath);

  return {
    name: 'dummy-api-transformer',
    enforce: 'pre',

    transform(code, id) {
      if (path.resolve(id) !== resolvedApiTypesPath) return;
      // TypeScript プロジェクトを作成し、型情報を取得できるようにする
      const sourceFile = project.createSourceFile(path.resolve(id), code, { overwrite: true });

      // `export default` のノードを取得
      const exportAssignment = sourceFile.getExportAssignment((ea) => !ea.isExportEquals());
      if (exportAssignment) {
        const expression = exportAssignment.getExpression();
        // `export default { someApi }` のオブジェクトリテラルか確認
        if (expression.isKind(SyntaxKind.ObjectLiteralExpression)) {
          const properties = expression.getProperties();
          for (const prop of properties) {
            if (prop.isKind(SyntaxKind.ShorthandPropertyAssignment)) {
              const shortHandProp = prop;
              const apiName = shortHandProp.getName();

              // `import * as someApi from "..."` のパスを取得
              const importDeclaration = sourceFile.getImportDeclarations().find((imp) => {
                return imp.getNamespaceImport()?.getText() === apiName;
              });

              if (importDeclaration) {
                const moduleSpecifier = importDeclaration.getModuleSpecifierValue();
                const importSourceFile = project.addSourceFileAtPathIfExists(path.resolve(resolvedApiTypesBasePath, moduleSpecifier + ".ts"));
                if (importSourceFile) {
                  // モジュールに含まれる関数を取得
                  const functions = importSourceFile.getFunctions().filter(func => func.isExported());
                  const expandedPropeties = functions.map((func) => {
                    return `${func.getName()} : () => {}`
                  })
                  // `someApi` を `{ someApi: { func1: () => {}, ... } }` の形に変換
                  shortHandProp.replaceWithText(`${apiName} : {${expandedPropeties.join(",\n")}}`)
                }
              }
            }
          }
        }
      }

      // 変換後のコードを返す
      return { code: sourceFile.getFullText(), map: null }

    }
  };
}
