export {};

declare global {
  interface Window {
    electronAPI: {
      selectDirectory: () => Promise<string[]>;
      selectFile: (filters: any[]) => Promise<string[]>;
      saveDialog: (options: { defaultPath?: string; filters?: any[] }) => Promise<string | undefined>;
      readFile: (filePath: string) => Promise<Buffer>;
      readDir: (dirPath: string) => Promise<{ name: string; isDirectory: boolean; isFile: boolean }[]>;
      fileExists: (filePath: string) => Promise<boolean>;
      writeFile: (filePath: string, data: string | Buffer) => Promise<boolean>;
    };
  }

  interface File {
    path?: string;
    webkitRelativePath?: string;
  }
}
