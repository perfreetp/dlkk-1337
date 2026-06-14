import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectFile: (filters: any[]) => ipcRenderer.invoke('select-file', filters),
  saveDialog: (options: { defaultPath?: string; filters?: any[] }) =>
    ipcRenderer.invoke('save-dialog', options),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  readDir: (dirPath: string) => ipcRenderer.invoke('read-dir', dirPath),
  fileExists: (filePath: string) => ipcRenderer.invoke('file-exists', filePath),
  writeFile: (filePath: string, data: string | Buffer) =>
    ipcRenderer.invoke('write-file', filePath, data),
});

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
}
