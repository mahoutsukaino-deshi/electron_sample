const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  saveData: (data: object) => ipcRenderer.invoke("saveData", data),
});
