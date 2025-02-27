import { ipcRenderer, contextBridge } from "electron";

/**
 * allApis を元に、"apiName.methodName" のチャネル名で ipcRenderer.invoke 登録する
 * また、contextBridge.exposeInMainWorldでレンダラー＝プロセスにAPIを公開する。
 * 例: window.api.testApi.greetings(...)
 */
export function registerApiToIpcRenderer<Modules extends Record<string, any>>(apiKey: string, apis: Modules) {
  // Modules の型を元に「(args) => Promise<戻り値>」に変換したオブジェクトの型を作成する
  type PreloadBindsType = {
    [ModuleName in keyof Modules]: {
      [FunctionName in keyof Modules[ModuleName]]:
      Modules[ModuleName][FunctionName] extends (...args: infer Args) => infer ResultType
      ? (...args: Args) => Promise<
        ResultType extends Promise<infer ResolvedValue> ? ResolvedValue : ResultType
      >
      : never;
    };
  };

  const result = {} as PreloadBindsType;

  for (const [moduleName, moduleFunctions] of Object.entries(apis) as [
    keyof Modules,
    Modules[keyof Modules]
  ][]) {
    const wrapper: any = {};
    for (const functionName of Object.keys(moduleFunctions)) {
      wrapper[functionName] = (...args: any[]) => {
        const channel = `${String(moduleName)}.${String(functionName)}`;
        return ipcRenderer.invoke(channel, ...args);
      };
    }
    result[moduleName] = wrapper;
  }

  contextBridge.exposeInMainWorld(apiKey, result);
}
