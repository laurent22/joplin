// Define here Electron objects that need to be accessed from the WebView
// https://github.com/electron/electron/blob/master/docs/tutorial/security.md#2-disable-nodejs-integration-for-remote-content

window.ipcRenderer = require('electron').ipcRenderer;