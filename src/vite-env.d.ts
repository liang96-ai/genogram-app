/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** build 時由 vite define 注入(來源 = package.json 的 version),不要 hardcode 版本字串 */
declare const __APP_VERSION__: string;
