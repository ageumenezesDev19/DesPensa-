declare module '@tauri-apps/api/fs' {
  export function readTextFile(path: string): Promise<string>;
  export function writeFile(options: { path: string; contents: string }): Promise<void>;
  export function createDir(path: string, options?: { recursive?: boolean }): Promise<void>;
}

declare module '@tauri-apps/api/path' {
  export function appLocalDataDir(): Promise<string>;
}

declare module '@tauri-apps/api/*' {
  const anything: any;
  export default anything;
}
