import * as React from 'react';

const ipcRenderer = require('electron').ipcRenderer;

const minimizeHandler = () => {
	ipcRenderer.send('minimize-handler');
};
const maximizeHandler = () => {
	ipcRenderer.send('maximize-handler');
};
const closeWindowHandler = () => {
	ipcRenderer.send('close-window-handler');
};

export default function TopBar() {
	return (
		<div>
			Joplin
			<i className="fa fa-minus" aria-hidden="true" onClick={minimizeHandler} />
			<i className="fa fa-window-maximize" aria-hidden="true" onClick={maximizeHandler} />
			<i className="fa fa-times" aria-hidden="true" onClick={closeWindowHandler} />
		</div>
	);
}
