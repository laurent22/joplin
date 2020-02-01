import * as React from 'react';
import { useState, useEffect } from 'react';

const { _ } = require('lib/locale.js');
const { themeStyle } = require('../theme.js');
const DialogButtonRow = require('./DialogButtonRow.min');

const Folder = require('lib/models/Folder.js');

interface NotebookPropertiesDialogProps {
	theme: number,
	folderId: string,
	onClose: Function,
}

export default function NotebookPropertiesDialog(props: NotebookPropertiesDialogProps) {
	console.info('Render NotebookPropertiesDialog');

	const [notebook, setNotebook] = useState<any>({});
	const [icon, setIcon] = useState<string>('');

	const theme = themeStyle(props.theme);

	useEffect(() => {
		async function fetchNotebook() {
			const n = await Folder.load(props.folderId);
			setNotebook(n);
		}

		fetchNotebook();
	}, [props.folderId]);

	const buttonRow_click = () => {
		props.onClose();
	};

	// having issues wrapping my head around saving folder information to the database
	const saveIcon = async () => {
		console.info('Saving Icon Now');
		notebook.icon = icon;
		await Folder.save(notebook, { fields: ['icon'], userSideValidation: true });
		setNotebook(notebook);
	};

	const rootStyle = Object.assign({}, theme.dialogBox);
	rootStyle.width = '50%';

	console.info('Icon: %s', notebook.icon);

	return (
		<div style={theme.dialogModalLayer}>
			<div style={rootStyle}>
				<div style={theme.dialogTitle}>{_('Notebook Properties')}</div>
				<label style={theme.textStyle}>{_('Icon: ')}</label>
				<input defaultValue={notebook.icon} onChange={event => setIcon(event.target.value)} />
				<button onClick={saveIcon}>{_('Save')}</button>
				<DialogButtonRow theme={props.theme} onClick={buttonRow_click} okButtonShow={true} cancelButtonLabel={_('Cancel')}/>
			</div>
		</div>
	);
}
