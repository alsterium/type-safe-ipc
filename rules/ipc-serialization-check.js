// src/rules/ipc-serialization-check.js
import { Project } from "ts-morph";
import path from "path";

/**
 * ts-morph の型が JSON シリアライズ可能かどうかチェックする関数。
 * シリアライズ可能な型は、プリミティブ、配列、または純粋なオブジェクト（関数・クラスインスタンス等を含まないもの）とします。
 * @param {import("ts-morph").Type} type 
 * @returns {boolean}
 */
function isSerializableType(type) {
  // union 型の場合、すべての constituent type がシリアライズ可能である必要がある
  if (type.isUnion()) {
    return type.getUnionTypes().every(t => isSerializableType(t));
  }

  // 基本的なプリミティブ型（リテラルも含む）
  if (
    type.isString() ||
    type.isNumber() ||
    type.isBoolean() ||
    type.isNull() ||
    type.isStringLiteral() ||
    type.isNumberLiteral()
  ) {
    return true;
  }

  // undefined やシンボルはシリアライズできない
  if (type.getText() === "undefined" || type.getText() === "symbol") {
    return false;
  }

  // 関数型はNG
  if (type.getCallSignatures().length > 0) {
    return false;
  }

  // 配列の場合は、要素の型がシリアライズ可能かチェック
  if (type.isArray()) {
    const elementType = type.getArrayElementType();
    if (elementType) {
      return isSerializableType(elementType);
    }
    return false;
  }

  // オブジェクト型の場合、各プロパティがシリアライズ可能かチェックする
  if (type.isObject()) {
    const properties = type.getProperties();
    return properties.every(prop => {
      const declarations = prop.getDeclarations();
      if (declarations.length === 0) {
        return true;
      }
      const propType = prop.getTypeAtLocation(declarations[0]);
      return isSerializableType(propType);
    });
  }

  // 上記以外はシリアライズ不可とする
  return false;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "src/main/api 配下でエクスポートされる API 関数のパラメータおよび戻り値がシリアライズ可能な型かをチェックします。",
      category: "Possible Errors",
      recommended: false,
    },
    messages: {
      nonSerializableParam:
        "API 関数 '{{funcName}}' のパラメータ '{{paramName}}' はシリアライズ不可能な型です。",
      nonSerializableReturn:
        "API 関数 '{{funcName}}' の戻り値はシリアライズ不可能な型です。",
    },
    schema: [
      {
        type: "object",
        properties: {
          tsconfigPath: {
            type: "string",
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const filename = context.getFilename().replace(/\\/g, "/");

    // 対象は src/main/api 配下のファイルのみ
    if (!filename.includes("src/main/api/")) {
      return {};
    }

    const sourceCode = context.getSourceCode();

    // ルールオプションから tsconfig のパスを取得（指定がなければデフォルトを利用）
    const options = context.options[0] || {};
    const tsconfigPath = options.tsconfigPath || "tsconfig.json";

    // ts-morph プロジェクトを tsconfig を利用して初期化
    const project = new Project({
      tsConfigFilePath: path.resolve(tsconfigPath),
      compilerOptions: {
        allowJs: true,
        checkJs: true,
      },
    });

    // ESLint で処理中のファイル内容を取得する
    const fileText = sourceCode.getText();
    // ts-morph でファイルを読み込む（既に存在していれば上書き）
    const tsSourceFile =
      project.getSourceFile(filename) ||
      project.createSourceFile(filename, fileText, { overwrite: true });

    // tsSourceFile の getExportedDeclarations() を利用して、全エクスポート宣言を取得
    const exportedDeclarations = tsSourceFile.getExportedDeclarations();

    // 各エクスポートされた宣言（関数）に対して、パラメータと戻り値の型チェックを実施
    exportedDeclarations.forEach((declarations, exportName) => {
      declarations.forEach(decl => {
        // 関数型として扱えなければスキップ
        const funcType = decl.getType();
        const signatures = funcType.getCallSignatures();
        if (signatures.length === 0) return;
        const signature = signatures[0];

        // ESLint の報告用に、ts-morph のノードの開始位置を利用して loc を生成
        const startIndex = decl.getStart();
        const loc = sourceCode.getLocFromIndex(startIndex);

        // パラメータの型チェック
        signature.getParameters().forEach(param => {
          const paramName = param.getName();
          const paramDecls = param.getDeclarations();
          if (paramDecls.length === 0) return;
          const paramType = param.getTypeAtLocation(paramDecls[0]);
          if (!isSerializableType(paramType)) {
            context.report({
              loc,
              messageId: "nonSerializableParam",
              data: { funcName: exportName, paramName },
            });
          }
        });

        // 戻り値の型チェック
        const returnType = signature.getReturnType();
        if (!isSerializableType(returnType)) {
          context.report({
            loc,
            messageId: "nonSerializableReturn",
            data: { funcName: exportName },
          });
        }
      });
    });

    return {};
  },
};