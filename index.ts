import { BrowserWindow, app, App, ipcMain, dialog } from "electron";
import path = require("path");
import { promises as fs } from "fs";

const DEBUG_MODE = false;

class SampleApp {
  private mainWindow: BrowserWindow | null = null;
  private app: App;
  private mainURL: string = `file://${__dirname}/index.html`;

  constructor(app: App) {
    this.app = app;
    this.app.on("window-all-closed", this.onWindowAllClosed.bind(this));
    this.app.on("ready", this.create.bind(this));
    this.app.on("activate", this.onActivated.bind(this));
    ipcMain.handle("saveData", this.handleSaveData.bind(this));
  }

  private onWindowAllClosed() {
    this.app.quit();
  }

  private create() {
    let windowSize = { width: 800, height: 600 };
    if (DEBUG_MODE) {
      const { screen } = require("electron");
      const primaryDisplay = screen.getPrimaryDisplay();
      windowSize = primaryDisplay.workAreaSize;
    }
    this.mainWindow = new BrowserWindow({
      width: windowSize.width,
      height: windowSize.height,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
      },
    });

    this.mainWindow.loadURL(this.mainURL);

    if (DEBUG_MODE) {
      this.mainWindow.webContents.openDevTools();
    }

    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });
  }

  private onReady() {
    this.create();
  }

  private onActivated() {
    if (this.mainWindow === null) {
      this.create();
    }
  }

  private async handleSaveData(
    event: Electron.IpcMainInvokeEvent,
    data: object
  ) {
    try {
      const result = await dialog.showSaveDialog({
        properties: ["createDirectory"],
      });
      if (result && result.filePath) {
        await fs.writeFile(result.filePath, JSON.stringify(data, null, "  "));
      }
    } catch (err: any) {
      console.error(err.toString());
    }
  }
}

const MyApp: SampleApp = new SampleApp(app);
