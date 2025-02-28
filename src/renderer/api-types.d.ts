import type { allApis } from "../main/api/";

/**
 * API関数群の型を変換するヘルパー型
 * 例: greetings: (...args: Parameters<typeof greetings>) => ReturnType<typeof greetings>
 */
export type ApiType<Module extends Record<string, (...args: any[]) => any>> = {
  [FunctionName in keyof Module]: (
    ...args: Parameters<Module[FunctionName]>
  ) => Promise<ReturnType<Module[FunctionName]>>;
};

/**
 * 各APIモジュールの関数型を変換するヘルパー型
 * 例: { greetings: (...args: Parameters<typeof greetings>) => ReturnType<typeof greetings> }
 */
export type RendererApi = {
  [ModuleName in keyof typeof allApis]: ApiType<(typeof allApis)[ModuleName]>;
};

/**
 * API関数の戻り値の型を取得するヘルパー型
 * 例: { greetings: string }
 */
export type ApiReturnTypes = {
  [ModuleName in keyof RendererApi]: {
    [FunctionName in keyof RendererApi[ModuleName]]:
    RendererApi[ModuleName][FunctionName] extends (...args: any[]) => Promise<infer ReturnValue>
    ? ReturnValue
    : never;
  };
};

declare global {
  interface Window {
    api: RendererApi;
  }
}
