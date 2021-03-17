import * as React from 'react';
import {
	StyledDragBar,
	StyledRoot,
	StyledCloseHolder,
	StyledIconHolder,
	StyledIconI,
	StyledWindowControlsHolder,
	StyledWindowTitleBar,
} from './styles';

const { ipcRenderer, remote } = require('electron');
const window = remote.BrowserWindow.getFocusedWindow();

const closeWindowHandler = () => {
	ipcRenderer.send('close-window-handler');
};
const maximizeHandler = () => {
	ipcRenderer.send('maximize-handler');
};
const minimizeHandler = () => {
	ipcRenderer.send('minimize-handler');
};
const openMenu = () => {
	ipcRenderer.send('display-app-menu', { x: 48, y: 0 });
};

export default function TitleBar() {
	return (
		<StyledRoot>
			<StyledWindowTitleBar>
				{process.platform === 'win32' && (
					<StyledWindowControlsHolder>
						<StyledIconHolder onClick={openMenu}>
							<StyledIconI className="fa fa-bars" />
						</StyledIconHolder>
					</StyledWindowControlsHolder>
				)}
				<StyledDragBar>{document.title}</StyledDragBar>
				<StyledWindowControlsHolder>
					<StyledIconHolder onClick={minimizeHandler}>
						<StyledIconI className="fa fa-minus" />
					</StyledIconHolder>
					<StyledIconHolder onClick={maximizeHandler}>
						<StyledIconI
							className={`far fa-window-${
								window.isMaximized() ? 'restore' : 'maximize'
							}`}
						/>
					</StyledIconHolder>
					<StyledCloseHolder onClick={closeWindowHandler}>
						<StyledIconI className="fa fa-times" />
					</StyledCloseHolder>
				</StyledWindowControlsHolder>
			</StyledWindowTitleBar>
		</StyledRoot>
	);
}
