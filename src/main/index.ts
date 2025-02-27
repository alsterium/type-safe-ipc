import { app } from "electron";
import { registerApiToIpcMain } from "./register-ipc";
import { allApis } from "./api";
import { BrowserWindow } from "electron/main";
import path from "path";

function main() {
  registerApiToIpcMain(allApis);
  app.whenReady().then(() => {
    const win = new BrowserWindow({
      webPreferences: {
        preload: path.resolve(__dirname, "../../preload/dist/preload.cjs"),
        devTools: true,
      },
    });
    win.loadURL("http://localhost:3000");
    win.webContents.openDevTools();
  });
}

main();
