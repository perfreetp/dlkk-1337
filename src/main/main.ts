import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'DICOM 标注质检客户端',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'multiSelections'],
  });
  return result.filePaths;
});

ipcMain.handle('select-file', async (_, filters: Electron.FileFilter[]) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'multiSelections'],
    filters,
  });
  return result.filePaths;
});

ipcMain.handle('save-dialog', async (_, options: { defaultPath?: string; filters?: Electron.FileFilter[] }) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: options.defaultPath,
    filters: options.filters,
  });
  return result.filePath;
});

ipcMain.handle('read-file', async (_, filePath: string) => {
  return fs.readFileSync(filePath);
});

ipcMain.handle('read-dir', async (_, dirPath: string) => {
  return fs.readdirSync(dirPath, { withFileTypes: true }).map((dirent) => ({
    name: dirent.name,
    isDirectory: dirent.isDirectory(),
    isFile: dirent.isFile(),
  }));
});

ipcMain.handle('file-exists', async (_, filePath: string) => {
  return fs.existsSync(filePath);
});

ipcMain.handle('write-file', async (_, filePath: string, data: string | Buffer) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, data);
  return true;
});
