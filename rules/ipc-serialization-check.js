import { Project } from "ts-morph";
import path from "path";

// モジュールレベルで ts-morph の型チェック結果をキャッシュする WeakMap
const typeCache = new WeakMap();

// モジュールレベルでプロジェクトインスタンスのキャッシュ（tsconfigPath 毎に1つ）
const projectCache = new Map();

/**
 * ts-morph の型が JSON シリアライズ可能かどうかチェックする関数。
 * シリアライズ可能な型は、プリミティブ、配列、または純粋なオブジェクト（関数・クラスインスタンス等を含まないもの）とします。
 * キャッシュを利用して再計算を防ぎます。
 * @param {import("ts-morph").Type} type 
 * @returns {boolean}
 */
function isSerializableType(type) {
  if (typeCache.has(type)) {
    return typeCache.get(type);
  }

  let result = false;

  if (type.isUnion()) {
    result = type.getUnionTypes().every(t => isSerializableType(t));
  } else if (
    type.isString() ||
    type.isNumber() ||
    type.isBoolean() ||
    type.isNull() ||
    type.isStringLiteral() ||
    type.isNumberLiteral()
  ) {
    result = true;
  } else if (type.getText() === "undefined" || type.getText() === "symbol") {
    result = false;
  } else if (type.getCallSignatures().length > 0) {
    result = false;
  } else if (type.isArray()) {
    const elementType = type.getArrayElementType();
    result = elementType ? isSerializableType(elementType) : false;
  } else if (type.isObject()) {
    const properties = type.getProperties();
    result = properties.every(prop => {
      const declarations = prop.getDeclarations();
      if (declarations.length === 0) return true;
      const propType = prop.getTypeAtLocation(declarations[0]);
      return isSerializableType(propType);
    });
  } else {
    result = false;
  }

  typeCache.set(type, result);
  return result;
}

/**
 * tsconfigPath に対応する ts-morph Project インスタンスを取得（キャッシュ利用）
 * @param {string} tsconfigPath 
 * @returns {Project}
 */
function getProject(tsconfigPath) {
  const resolvedPath = path.resolve(tsconfigPath);
  if (projectCache.has(resolvedPath)) {
    return projectCache.get(resolvedPath);
  }
  const project = new Project({
    tsConfigFilePath: resolvedPath,
    compilerOptions: {
      allowJs: true,
      checkJs: true,
    },
  });
  projectCache.set(resolvedPath, project);
  return project;
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

    // まず ESLint の AST を利用して、エクスポート宣言があるかを判定（絞り込み）
    let fileHasExports = false;
    return {
      ExportNamedDeclaration() {
        fileHasExports = true;
      },
      ExportDefaultDeclaration() {
        fileHasExports = true;
      },
      "Program:exit"() {
        if (!fileHasExports) {
          // エクスポートがなければ、ts-morph による重い解析はスキップ
          return;
        }

        // ルールオプションから tsconfig のパスを取得（指定がなければデフォルト）
        const options = context.options[0] || {};
        const tsconfigPath = options.tsconfigPath || "tsconfig.json";

        // ts-morph プロジェクトをキャッシュから取得
        const project = getProject(tsconfigPath);

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
            const funcType = decl.getType();
            const signatures = funcType.getCallSignatures();
            if (signatures.length === 0) return;
            const signature = signatures[0];

            // ESLint の報告用に、ts-morph のノードの開始位置から loc を生成
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
      },
    };
  },
};