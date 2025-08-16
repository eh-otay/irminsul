const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { Marked } = require('marked');
const { markedHighlight } = require('marked-highlight');
const hljs = require('highlight.js');
const markedKatex = require('marked-katex-extension');
const markedLinkifyIt = require('marked-linkify-it');
const path = require('node:path');
const fs = require('node:fs');

const marked = new Marked(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);

marked.use(markedKatex({ throwOnError: false }));

const schemas = {};
const options = {};

marked.use(markedLinkifyIt(schemas, options));

function parseMD(event, md) {
  return marked.parse(md, {breaks: true});
}

async function handleFileOpen() {
  const { canceled, filePaths } = await dialog.showOpenDialog({});
  if (canceled)
    return { status: 'canceled', err: null, path: null, content: null };
  try {
    const content = fs.readFileSync(filePaths[0]).toString();
    return { status: 'success', err: null, path: filePaths[0], content: content };
  } catch (error) {
    return { status: 'error', err: error.message, path: null, content: null };
  }
};

async function handleFileSaveAs(event, content) {
  const { canceled, filePath } = await dialog.showSaveDialog({});
  if (canceled)
    return { status: 'canceled', err: null, path: null, content: null };
  return handleFileSave(event, filePath, content);
}

async function handleFileSave(event, filePath, content) {
  try {
    fs.writeFileSync(filePath, content);
    return { status: 'success', err: null, path: filePath, content: content };
  } catch (error) {
    return { status: 'error', err: error.message, path: filePath, content: content };
  }
};

async function handleTitleSet(event, title) {
  const win = BrowserWindow.fromWebContents(event.sender);
  win.title = title;
}

async function handleOpenLink(event, url) {
  shell.openExternal(url);
}

const createWindow = () => {
  const window = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  window.webContents.openDevTools();

  window.loadFile('index.html');
};

app.whenReady().then(() => {
  ipcMain.handle('open', handleFileOpen);
  ipcMain.handle('saveAs', handleFileSaveAs);
  ipcMain.handle('save', handleFileSave);
  ipcMain.handle('setTitle', handleTitleSet);
  ipcMain.handle('parseMD', parseMD);
  ipcMain.handle('openLink', handleOpenLink);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0)
      createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin')
    app.quit();
});
