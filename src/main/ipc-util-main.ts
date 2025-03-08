/* eslint @typescript-eslint/no-explicit-any: 0 */
import { ipcMain } from "electron";

/**
 * IpcMainにApiを登録する
 * @param apis Apiのオブジェクト
 *
 * apisを元に、"apiName.methodName"のチャネル名でipcMain.handleに登録する
 *
 * 例: "testApi.greetings", "licenseApi.greetings", ...
 */
export function registerApiToIpcMain<Modules extends Record<string, any>>(
  apis: Modules,
) {
  // apis: { testApi: { greetings:()=>... }, licenseApi: { greetings:()=>... }, ... }
  for (const [apiName, apiModule] of Object.entries(apis)) {
    for (const [funcName, func] of Object.entries(apiModule)) {
      if (typeof func === "function") {
        // チャネル名を "apiName.methodName" の形式で生成
        const channelName = `${apiName}.${funcName}`;
        // IpcMainにハンドラーを登録
        // レンダラープロセスからの呼び出しを受け付け、対応するAPI関数を実行
        ipcMain.handle(channelName, async (_event, ...args: any[]) => {
          return func(...args);
        });
      }
    }
  }
}
