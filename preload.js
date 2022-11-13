"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("api", {
    saveData: (data) => ipcRenderer.invoke("saveData", data),
    searchAddress: (data) => ipcRenderer.invoke("searchAddress", data),
});
