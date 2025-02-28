import { ipcRenderer, contextBridge } from "electron";

/**
 * IpcRendererにApiを登録する
 * @param apis Apiのオブジェクト
 *
 * apisを元に、"apiName.methodName"のチャネル名でipcMain.invokeに登録&preload側に公開する
 * 例: window.api.testApi.greetings(...)
 */
export function registerApiToIpcRenderer<Modules extends Record<string, any>>(
  apis: Modules
) {
  // 入力されたAPIモジュールの型から、Promise化された戻り値の型を生成
  type PreloadBinds = {
    [ModuleName in keyof Modules]: {
      [FunctionName in keyof Modules[ModuleName]]: Modules[ModuleName][FunctionName] extends (
        ...args: infer Args
      ) => infer ResultType
      ? (...args: Args) => Promise<
        // ResultTypeがPromiseの場合はその型パラメータを、そうでなければResultTypeをそのまま使用
        ResultType extends Promise<infer ResolvedValue>
        ? ResolvedValue
        : ResultType
      >
      : never;
    };
  };

  // contextBridge.exposeInMainWorldで公開するためのオブジェクトを作成
  const result = {} as PreloadBinds;

  for (const moduleName in apis) {
    const typedModuleName = moduleName as keyof Modules;
    const moduleFunctions = apis[typedModuleName];
    // モジュール単位のラッパーオブジェクトを作成
    const wrapper: PreloadBinds[typeof typedModuleName] =
      {} as PreloadBinds[typeof typedModuleName];

    // モジュール内の各関数についてプロキシ関数を作成
    for (const functionName in moduleFunctions) {
      const typedFunctionName = functionName as keyof typeof moduleFunctions;
      // contextBridge.exposeInMainWorldで公開するための関数を作成
      wrapper[typedFunctionName] = ((...args: any[]) => {
        // チャネル名を "モジュール名.関数名" の形式で構築
        const channel = `${String(moduleName)}.${String(functionName)}`;
        return ipcRenderer.invoke(channel, ...args);
      }) as PreloadBinds[typeof typedModuleName][typeof typedFunctionName];
    }
    result[typedModuleName] = wrapper;
  }

  // 作成したAPIをwindow.apiとして公開
  contextBridge.exposeInMainWorld("api", result);
}
