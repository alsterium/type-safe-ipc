// dummyApiTransformerCommon.ts
import path from "path";
import { Project, SyntaxKind } from "ts-morph";

/**
 * ダミー API 変換処理の共通部分
 *
 * @param code 変換対象のソースコード
 * @param filePath 対象ファイルのパス
 * @param project ts-morph の Project インスタンス
 * @param resolvedApiTypesBasePath API 型定義ファイルのベースディレクトリのパス
 * @returns 変換後のコード
 */
export function transformDummyApi(
  code: string,
  filePath: string,
  project: Project,
  resolvedApiTypesBasePath: string
): string {
  const sourceFile = project.createSourceFile(filePath, code, {
    overwrite: true,
  });

  // export default のノードを取得
  const exportAssignment = sourceFile.getExportAssignment(
    (ea) => !ea.isExportEquals()
  );
  if (exportAssignment) {
    const expression = exportAssignment.getExpression();
    // オブジェクトリテラルであるかを確認
    if (expression.isKind(SyntaxKind.ObjectLiteralExpression)) {
      const properties = expression.getProperties();
      for (const prop of properties) {
        if (prop.isKind(SyntaxKind.ShorthandPropertyAssignment)) {
          const shortHandProp = prop;
          const apiName = shortHandProp.getName();
          // 対応する import 宣言を取得
          const importDeclaration = sourceFile
            .getImportDeclarations()
            .find((imp) => imp.getNamespaceImport()?.getText() === apiName);
          if (importDeclaration) {
            const moduleSpecifier =
              importDeclaration.getModuleSpecifierValue();
            const importSourceFile = project.addSourceFileAtPathIfExists(
              path.resolve(resolvedApiTypesBasePath, moduleSpecifier + ".ts")
            );
            if (importSourceFile) {
              // 対象モジュールからエクスポートされた関数一覧を取得
              const functions = importSourceFile
                .getFunctions()
                .filter((func) => func.isExported());
              const expandedProperties = functions.map((func) => {
                return `${func.getName()} : () => {}`;
              });
              // ショートハンド記法を展開した形に変換
              shortHandProp.replaceWithText(
                `${apiName} : {${expandedProperties.join(",\n")}}`
              );
            }
          }
        }
      }
    }
  }

  return sourceFile.getFullText();
}
