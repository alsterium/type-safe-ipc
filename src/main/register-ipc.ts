import { ipcMain } from "electron";

/**
 * allApis を元に、 "apiName.methodName" のチャネル名で ipcMain.handle 登録する
 * 例: "testApi.greetings", "licenseApi.greetings", ...
 */
export function registerApiToIpcMain<Modules extends Record<string, any>>(apis: Modules) {
  // apis: { testApi: { greetings:()=>... }, licenseApi: { greetings:()=>... }, ... }
  for (const [apiName, apiModule] of Object.entries(apis)) {
    for (const [funcName, func] of Object.entries(apiModule)) {
      // func が関数かどうかをチェック
      if (typeof func === "function") {
        const channelName = `${apiName}.${funcName}`;
        ipcMain.handle(channelName, async (_event, ...args: any[]) => {
          return func(...args);
        });
      }
    }
  }
}
