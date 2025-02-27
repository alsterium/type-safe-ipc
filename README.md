# Type-Safe-IPC

# 概要

Type-Safe-IPC は、Electron の IPC(Inter-Process Communication)を安全に行うための実装例です。
管理が煩雑になりがちな ipcMain と ipcRenderer のチャンネル名の対応管理を不要にし、
preload スクリプト内で exposeInMainWorld した API の型定義を API の戻り値を含め自動で生成します。

# 特徴

- src/main/api/index.ts 内で export した関数を自動でレンダラープロセス側に公開
- ipcMain と ipcRenderer のチャンネル名の対応管理が不要
- preload スクリプト内で exposeInMainWorld した API の型定義を自動で生成
- expose した API の戻り値の型定義も自動で生成
- レンダラープロセス側コードからメインプロセスコードへのコードジャンプが可能

# レンダラープロセスへの API の公開方法

1. src/main/api 内で API を定義

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

2. src/main/api/index.ts で API を import/export

```typescript
// src/main/api/index.ts
import * as testApi from "./test-api";

export const allApis = { testApi,.../*他のAPIもexport*/ };
```

これでレンダラープロセスのコードから以下のように API を呼び出すことができます。

```typescript
// src/renderer/main.tsx

// 省略

function App() {
  type HelloWorldReturnType = ApiReturnTypes["testApi"]["helloWorld"];
  type ReturnObjectReturnType = ApiReturnTypes["testApi"]["returnObject"];

  // これらのコードはメインプロセスの実装にコードジャンプ可能です。
  const hello: HelloWorldReturnType = await window.api.testApi.helloWorld();
  const returnObj: ReturnObjectReturnType = await window.api.testApi.returnObject();
  console.log(hello);
  console.log("ReturnObj.a", returnObj.a, "ReturnObj.b", returnObj.b);// ReturnObj.a 1 ReturnObj.b はType-Safe
  await window.api.testApi.printMessage("Hello World");// レンダラープロセス側で引数に渡したメッセージをコンソール出力
  //...残りのコード
```
