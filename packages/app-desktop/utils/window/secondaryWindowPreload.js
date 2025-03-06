const { ipcRenderer } = require('electron');

window.electronWindow = {
	onSetWindowId: windowId => ipcRenderer.send('secondary-window-added', windowId),
};
