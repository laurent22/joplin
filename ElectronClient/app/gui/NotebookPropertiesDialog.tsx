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
	const [icon, setIcon] = useState<string>('fa fa-book');
	const [loaded, setLoaded] = useState<boolean>(false);

	const theme = themeStyle(props.theme);

	useEffect(() => {
		async function fetchNotebook() {
			if (!props.folderId) {
				setNotebook({notebook: null});
			} else {
				const n = await Folder.load(props.folderId);
				const nb = formNotebook(n);
				setNotebook(nb);
			}
		}

		fetchNotebook();
	}, [props.folderId]);

	const formNotebook = (targetNotebook:any) => {
		if (!loaded) {
			const nb = Object.assign({}, targetNotebook, {
				icon: targetNotebook.icon,
			});
			setIcon(nb.icon);
			setLoaded(true);
			return nb;
		}
	};

	const buttonRow_click = () => {
		props.onClose();
	};

	// having issues wrapping my head around saving folder information to the database
	const saveNotebook = async () => {
		console.info('Saving Notebook Now');
		if (!notebook) {
			console.error('Notebook saving failed in the NotebookPropertiesDialog');
		} else {
			const nb = await Folder.save(notebook, {userSideValidation: true});
			setNotebook(nb);
		}
		props.onClose();
	};

	const rootStyle = Object.assign({}, theme.dialogBox);
	rootStyle.width = '50%';

	console.info('Icon: %s', icon);

	return (
		<div style={theme.dialogModalLayer}>
			<div style={rootStyle}>
				<div style={theme.dialogTitle}>{_('Notebook Properties')}</div>
				<label style={theme.textStyle}>{_('Icon: ')}</label>
				<input defaultValue={notebook.icon} onChange={event => setIcon(event.target.value)} />
				<button onClick={saveNotebook}>{_('Save')}</button>
				<DialogButtonRow theme={props.theme} onClick={buttonRow_click} okButtonShow={false} cancelButtonLabel={_('Cancel')}/>
			</div>
		</div>
	);
}
