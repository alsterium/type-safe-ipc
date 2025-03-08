/* eslint @typescript-eslint/no-unused-vars: 0 */
export function greetings() {
  return "greetings from MainProcess!";
}
function privatefunc() {
  return "this is privatefunc, so do not expose to preload.";
}
