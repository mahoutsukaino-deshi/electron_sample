"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = require("path");
const fs_1 = require("fs");
const rp = require("request-promise");
const DEBUG_MODE = true;
class SampleApp {
    constructor(app) {
        this.mainWindow = null;
        this.mainURL = `file://${__dirname}/index.html`;
        this.app = app;
        this.app.on("window-all-closed", this.onWindowAllClosed.bind(this));
        this.app.on("ready", this.create.bind(this));
        this.app.on("activate", this.onActivated.bind(this));
        electron_1.ipcMain.handle("saveData", this.handleSaveData.bind(this));
        electron_1.ipcMain.handle("searchAddress", this.handleSearchAddress.bind(this));
    }
    onWindowAllClosed() {
        this.app.quit();
    }
    create() {
        let windowSize = { width: 800, height: 600 };
        if (DEBUG_MODE) {
            const { screen } = require("electron");
            const primaryDisplay = screen.getPrimaryDisplay();
            windowSize = primaryDisplay.workAreaSize;
        }
        this.mainWindow = new electron_1.BrowserWindow({
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
    onReady() {
        this.create();
    }
    onActivated() {
        if (this.mainWindow === null) {
            this.create();
        }
    }
    handleSaveData(event, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield electron_1.dialog.showSaveDialog({
                    properties: ["createDirectory"],
                });
                if (result && result.filePath) {
                    yield fs_1.promises.writeFile(result.filePath, JSON.stringify(data, null, "  "));
                }
            }
            catch (err) {
                console.error(err.toString());
            }
        });
    }
    handleSearchAddress(event, zipcode) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipcode}`;
            try {
                let response = yield rp({
                    url: url,
                    json: true,
                });
                console.log(response);
                return response;
            }
            catch (err) {
                console.error(err);
            }
        });
    }
}
const MyApp = new SampleApp(electron_1.app);
