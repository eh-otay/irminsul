const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('ElectronAPI', {
  open: () => ipcRenderer.invoke('open'),
  saveAs: (content) => ipcRenderer.invoke('saveAs', content),
  save: (path, content) => ipcRenderer.invoke('save', path, content),
  setTitle: (title) => ipcRenderer.invoke('setTitle', title),
  parseMD: (md) => ipcRenderer.invoke('parseMD', md),
  openLink: (url) => ipcRenderer.invoke('openLink', url)
});
