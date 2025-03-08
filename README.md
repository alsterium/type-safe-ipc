# Type-Safe-IPC

## 概要

`Type-Safe-IPC` は、Electron におけるプロセス間通信 (IPC) を安全に実現するための実装例です。メインプロセス（`ipcMain`）とレンダラープロセス（`ipcRenderer`）間で、チャネル名や型の整合性を自動管理することで、開発時の実装ミスや型エラーの発生を未然に防ぎます。

## コマンド

```bash
npm i
npm run dev
```

## 特徴

- **統一的な API 定義**: `src/main/api/index.ts` で定義した関数群が、レンダラープロセスの `window.api` 経由でそのまま利用できます。
- **チャネル名の自動管理**: 各関数は自動的に `モジュール名.関数名` の形式で IPC チャネルに割り当てられるため、個別にチャネル名を管理する必要がありません。
- **カスタム ESLint ルールによる静的解析**: API 関数の引数や戻り値が、Electron の IPC で扱える JSON 形式にシリアライズ可能な型であるかをチェックします。これにより、実装ミスや予期しないランタイムエラーの発生を抑制します。
- **型定義の自動生成**: 自動生成される型定義により、レンダラープロセス側で正確な型推論が可能となり、開発効率が向上します。

## レンダラープロセスへの API の公開方法

### 1. src/main/api 内で API を定義

```typescript
// src/main/api/test-api.ts
export function helloWorld(): string {
  return "Hello World";
}

export function returnObject(): { a: number; b: string } {
  return { a: 1, b: "test" };
}

export function printMessage(message: string): void {
  console.log(message);
}
```

### 2. src/main/api/index.ts で API を import/export

```typescript
// src/main/api/index.ts
import * as testApi from "./test-api";

// 全ての API を一つのオブジェクトにまとめてエクスポート
export default { testApi };
```

### 3. レンダラープロセスで API を呼び出す

```typescript
// src/renderer/main.tsx

// 自動生成された ApiReturnTypes を利用した型定義
type HelloWorldReturnType = ApiReturnTypes["testApi"]["helloWorld"];
type ReturnObjectReturnType = ApiReturnTypes["testApi"]["returnObject"];

async function fetchData() {
  // メインプロセスの API を呼び出し
  const hello: HelloWorldReturnType = await window.api.testApi.helloWorld();
  const returnObj: ReturnObjectReturnType =
    await window.api.testApi.returnObject();

  console.log(hello); // "Hello World"
  console.log("ReturnObj.a", returnObj.a, "ReturnObj.b", returnObj.b);

  // メインプロセスの printMessage を実行
  await window.api.testApi.printMessage("Hello World");
}

fetchData();
```

## 仕組み

本プロジェクトは、以下の 3 つの主要コンポーネントで構成されています。

1. **メインプロセスの API 定義と登録**

   - `src/main/api/` 内で各 API モジュール（例: `testApi`）を定義し、関数をエクスポートします。
   - `src/main/api/index.ts` でこれらの API モジュールを一つにまとめ、オブジェクトとしてエクスポートします。
   - メインプロセスでは、この API オブジェクトをもとに、各関数を `ipcMain.handle` を使って登録し、`モジュール名.関数名` のチャネルで呼び出せるようにしています。

2. **Preload スクリプトと型情報の自動生成**

   - Preload スクリプトでは、Electron の `contextBridge` を使用して、メインプロセスの API を `window.api` にバインドします。
   - Vite プラグイン（dummy-api-transformer）が、`src/main/api/index.ts` から API の型情報を抽出し、各モジュール内の関数名を取り出します。
   - この情報をもとに、各 API モジュールのダミーオブジェクトが自動生成されるため、レンダラープロセスでは正確な型定義のみが利用され、不要な実装や依存関係を排除できます。

3. **レンダラープロセスでの API 利用**

   - レンダラープロセスでは、生成された `window.api` を通じてメインプロセスの API を呼び出します。
   - 自動生成された型定義により、各 API 関数の引数や戻り値が正しく推論され、IDE の補完機能や型チェックを活用した安全な開発が可能となります。

4. **静的解析による型検証**

   - カスタム ESLint ルールを利用して、`src/main/api` 内で定義された API 関数の引数および戻り値が、IPC 経由で送受信可能な JSON 形式にシリアライズできる型であるかを静的に検証します。
   - `ts-morph` を用いて型情報を解析し、関数、シンボル、クラスインスタンスなど、シリアライズ不可能な型の使用を早期に検出することで、実装ミスやランタイムエラーを未然に防止します。
   - また、メモ化や解析対象の絞り込みなどの工夫により、解析処理のパフォーマンス向上にも配慮しています.
