import * as React from 'react';
import { useState, useEffect } from 'react';

const { _ } = require('lib/locale.js');
const { themeStyle } = require('../theme.js');
const DialogButtonRow = require('./DialogButtonRow.min');

const Folder = require('lib/models/Folder.js');

interface FolderPropertiesDialogProps {
	theme: number,
	folderId: string,
	onClose: Function,
}

export default function FolderPropertiesDialog(props: FolderPropertiesDialogProps) {
	console.info('Render NotebookPropertiesDialog');

	const [formFolder, setFormFolder] = useState<any>({});

	const theme = themeStyle(props.theme);

	useEffect(() => {
		async function fetchFolder() {
			if (!props.folderId) {
				setFormFolder({folder: null});
			} else {
				setFormFolder(await Folder.load(props.folderId));
			}
		}

		fetchFolder();
	}, [props.folderId]);


	const buttonRow_click = () => {
		props.onClose();
	};

	const saveFolder = async () => {
		await Folder.save({id: formFolder.id, title: formFolder.title, icon: formFolder.icon}, {userValidation: true});
	};

	const rootStyle = Object.assign({}, theme.dialogBox);
	rootStyle.width = '50%';

	return (
		<div style={theme.dialogModalLayer}>
			<div style={rootStyle}>
				<div style={theme.dialogTitle}>{_('Notebook Properties')}</div>
				<label style={theme.textStyle}>{_('Name: ')}</label>
				<input defaultValue={formFolder.title} onChange={event => formFolder.title = event.target.value} />
				<button onClick={saveFolder}>{_('Save')}</button>
				<br />
				<label style={theme.textStyle}>{_('Icon: ')}</label>
				<input defaultValue={formFolder.icon} onChange={event => formFolder.icon = event.target.value} />
				<button onClick={saveFolder}>{_('Save')}</button>
				<DialogButtonRow theme={props.theme} onClick={buttonRow_click} okButtonShow={false} cancelButtonLabel={_('Close')}/>
			</div>
		</div>
	);
}
