import * as React from 'react';
import { useState, useEffect } from 'react';

const { _ } = require('lib/locale.js');
const { themeStyle, buildStyle } = require('../theme.js');
const DialogButtonRow = require('./DialogButtonRow.min');

const Folder = require('lib/models/Folder.js');

interface FolderPropertiesDialogProps {
	theme: number,
	folderId: string,
	onClose: Function,
}

function styles_(props:FolderPropertiesDialogProps) {
	return buildStyle('FolderPropertiesDialog', props.theme, (theme: any) => {
		return {
			folderLabel: {
				...theme.textStyle,
				flex: 1,
				display: 'flex',
				fontWeight: 'bold',
				color: theme.color,
			},
			folderSaveButton: {
				background: 'none',
				border: 'none',
			},
			folderSaveButtonIcon: {
				color: theme.color,
				fontSize: '1.4em',
			},
			titleForm: {
				display: 'inline-block',
				color: theme.color,
				backgroundColor: theme.backgroundColor,
				border: '1px solid',
				borderColor: theme.dividerColor,
				marginLeft: '3em',
				width: '6em',
			},
			iconForm: {
				display: 'inline-block',
				color: theme.color,
				backgroundColor: theme.backgroundColor,
				border: '1px solid',
				borderColor: theme.dividerColor,
				marginLeft: '3.6em',
				width: '6em',
			},
		};
	});
}

export default function FolderPropertiesDialog(props: FolderPropertiesDialogProps) {
	console.info('Render NotebookPropertiesDialog');

	const [formFolder, setFormFolder] = useState<any>({});

	const theme = themeStyle(props.theme);
	const styles = styles_(props);

	useEffect(() => {
		async function fetchFolder() {
			if (!props.folderId) {
				throw new Error('FolderID is not set. This Notebook is not valid!!!');
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

	let titleComp = (
		<label
			style={styles.folderLabel}>
			{_('Name: ')}
			<input
				defaultValue={formFolder.title}
				onChange={event => formFolder.title = event.target.value}
				style={styles.titleForm} />
			<button
				onClick={saveFolder}
				style={styles.folderSaveButton}>
				<i
					style={styles.folderSaveButtonIcon}
					className={'fa fa-save'}>
				</i>
			</button>
		</label>
	);

	let iconComp = (
		<label
			style={styles.folderLabel}>
			{_('Icon: ')}
			<input
				defaultValue={formFolder.icon}
				onChange={event => formFolder.icon = event.target.value}
				style={styles.iconForm} />
			<button
				onClick={saveFolder}
				style={styles.folderSaveButton}>
				<i
					style={styles.folderSaveButtonIcon}
					className={'fa fa-save'}>
				</i>
			</button>
		</label>
	);

	return (
		<div style={theme.dialogModalLayer}>
			<div style={rootStyle}>
				<div style={theme.dialogTitle}>{_('Notebook Properties')}</div>
				{titleComp}
				{iconComp}
				<DialogButtonRow theme={props.theme} onClick={buttonRow_click} okButtonShow={false} cancelButtonLabel={_('Close')}/>
			</div>
		</div>
	);
}
