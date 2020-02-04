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
	console.info('Render FolderPropertiesDialog');

	const [folder, formFolder] = useState<any>({});

	const theme = themeStyle(props.theme);

	useEffect(() => {
		async function fetchFolder() {
			if (!props.folderId) {
				formFolder({folder: null});
			} else {
				formFolder(await Folder.load(props.folderId));
			}
		}

		fetchFolder();
	}, [props.folderId]);


	const buttonRow_click = () => {
		props.onClose();
	};

	const saveTitle = async () => {
		await Folder.save({id: folder.id, title: folder.title, userValidation: true});
	};

	const saveIcon = async () => {
		await Folder.save({id: folder.id, icon: folder.icon, userValidation: true});
	};

	const rootStyle = Object.assign({}, theme.dialogBox);
	rootStyle.width = '50%';

	return (
		<div style={theme.dialogModalLayer}>
			<div style={rootStyle}>
				<div style={theme.dialogTitle}>{_('Notebook Properties')}</div>
				<label style={theme.textStyle}>{_('Name:   ')}</label>
				<input defaultValue={folder.title} onChange={event => folder.title = event.target.value} />
				<button onClick={saveTitle}>{_('Save')}</button>
				<br />
				<label style={theme.textStyle}>{_('Icon: ')}</label>
				<input defaultValue={folder.icon} onChange={event => folder.icon = event.target.value} />
				<button onClick={saveIcon}>{_('Save')}</button>
				<DialogButtonRow theme={props.theme} onClick={buttonRow_click} okButtonShow={false} cancelButtonLabel={_('Close')}/>
			</div>
		</div>
	);
}
