# Type-Safe-IPC

## 概要

`Type-Safe-IPC` は、Electron の IPC(Inter-Process Communication)を安全に行うための実装例です。
`ipcMain`と`ipcRenderer`のチャネル名の管理と型の整合性を自動化することで、開発中の実装ミスや型エラーを未然に防ぎます。

## 特徴

- **統一的な API 定義**: `src/main/api/index.ts` 内でエクスポートした関数群が、そのままレンダラープロセス（`window.api`）で利用可能
- **チャネル名の自動管理**: 各関数は自動的に `モジュール名.関数名` の形式で IPC チャネルにバインドされ、手動で管理する必要がない
- **型定義の自動生成**: API の型定義が自動生成されるため、レンダラープロセス側のコードで正確な型推論が行われる

## 仕組み

本プロジェクトは、以下の 3 つの主要コンポーネントにより、メインプロセスとレンダラープロセス間の型安全な通信を実現しています。

1. **メインプロセスの API 定義と登録**  
   - `src/main/api/` 内で各 API モジュール（例: `testApi`）を定義し、関数をエクスポートします。  
   - `src/main/api/index.ts` で各 API モジュールをまとめ、1 つのオブジェクトとしてエクスポートします。  
   - メインプロセスでは、この API オブジェクトをもとに、各関数を `ipcMain.handle` によって動的に登録し、各関数呼び出しが `モジュール名.関数名` のチャネルで識別されるようにします。

2. **Preload スクリプトと型情報の自動生成**  
   - Preload スクリプトでは、Electron の `contextBridge` を用いて、`window.api` にメインプロセスの API をバインドします。  
   - Vite プラグイン（dummy-api-transformer）は、メインプロセスの API 型定義ファイル（例: `src/main/api/index.ts`）を解析し、各 API モジュール内でエクスポートされている関数名を抽出します。  
   - 取得した情報をもとに、各 API モジュールのダミーオブジェクトを自動生成します。各ダミー関数は空の実装（`() => {}`）となっており、main 側の実際の依存関係を preload バンドルに持ち込まないようにしています。  
   - この仕組みにより、レンダラープロセスで利用される API は正確な型定義を保持しながら、不要な実装や依存関係を含まずに動作します。

3. **レンダラープロセスでの API 利用**  
   - レンダラープロセスでは、生成された `window.api` 経由で、メインプロセス側の API を `ipcRenderer.invoke` によって呼び出します。  
   - 自動生成された型定義により、各 API 関数の引数や戻り値が正確に推論され、IDE の補完機能や型チェックを利用した安全な開発が可能になります。

このような仕組みにより、メインプロセス側で API を追加・変更するだけで、レンダラープロセス側は自動的に最新の型情報を利用できるため、実装の保守性と安全性が大幅に向上します。

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

// すべての API を一つのオブジェクトにまとめて export
export default { testApi };
```
### 3. レンダラープロセスで API を呼び出す
```typescript
// src/renderer/main.tsx

// 型定義: 自動生成される ApiReturnTypes を利用
type HelloWorldReturnType = ApiReturnTypes["testApi"]["helloWorld"];
type ReturnObjectReturnType = ApiReturnTypes["testApi"]["returnObject"];

async function fetchData() {
  // メインプロセスの API を呼び出し
  const hello: HelloWorldReturnType = await window.api.testApi.helloWorld();
  const returnObj: ReturnObjectReturnType = await window.api.testApi.returnObject();
Ï
  console.log(hello); // "Hello World"
  console.log("ReturnObj.a", returnObj.a, "ReturnObj.b", returnObj.b); // ReturnObj.a 1 ReturnObj.b "test"

  // メインプロセスの printMessage を呼び出し（コンソール出力）
  await window.api.testApi.printMessage("Hello World");
}

fetchData();
```
