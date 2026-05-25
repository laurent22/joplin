
import { ipcRenderer } from 'electron';
window.electronWindow = {
	onSetWindowId: windowId => ipcRenderer.send('secondary-window-added', windowId),
};
