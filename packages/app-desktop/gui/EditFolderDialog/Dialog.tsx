import * as React from 'react';
import { useCallback, useState } from 'react';
import { _ } from '@joplin/lib/locale';
import DialogButtonRow, { ClickEvent } from '../DialogButtonRow';
import Dialog from '../Dialog';
import DialogTitle from '../DialogTitle';
import StyledInput from '../style/StyledInput';
import { IconSelector, ChangeEvent } from './IconSelector';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import Folder from '@joplin/lib/models/Folder';
import { FolderIcon } from '@joplin/lib/services/database/types';
import Button from '../Button/Button';

interface Props {
	themeId: number;
	dispatch: Function;
	folderId: string;
}

export default function(props: Props) {
	const [folderTitle, setFolderTitle] = useState('');
	const [folderIcon, setFolderIcon] = useState<FolderIcon>();

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		const folder = await Folder.load(props.folderId);
		if (event.cancelled) return;
		setFolderTitle(folder.title);
		setFolderIcon(Folder.unserializeIcon(folder.icon));
	}, [props.folderId]);

	const onClose = useCallback(() => {
		props.dispatch({
			type: 'DIALOG_CLOSE',
			name: 'editFolder',
		});
	}, [props.dispatch]);

	const onButtonRowClick = useCallback(async (event: ClickEvent) => {
		if (event.buttonName === 'cancel') {
			onClose();
			return;
		}

		if (event.buttonName === 'ok') {
			await Folder.save({
				id: props.folderId,
				title: folderTitle,
				icon: Folder.serializeIcon(folderIcon),
			});
			onClose();
			return;
		}
	}, [onClose, folderTitle, folderIcon, props.folderId]);

	const onFolderTitleChange = useCallback((event: any) => {
		setFolderTitle(event.target.value);
	}, []);

	const onFolderIconChange = useCallback((event: ChangeEvent) => {
		setFolderIcon(event.value);
	}, []);

	const onClearClick = useCallback(() => {
		setFolderIcon(null);
	}, []);

	function renderForm() {
		return (
			<div>
				<div className="form">
					<div className="form-input-group">
						<label>{_('Title')}</label>
						<StyledInput type="text" value={folderTitle} onChange={onFolderTitleChange}/>
					</div>

					<div className="form-input-group">
						<label>{_('Icon')}</label>
						<div className="icon-selector-row">
							<IconSelector
								icon={folderIcon}
								onChange={onFolderIconChange}
							/>
							<Button ml={1} title={_('Clear')} onClick={onClearClick}/>
						</div>
					</div>
				</div>
			</div>
		);
	}

	function renderContent() {
		return (
			<div className="dialog-content">
				{renderForm()}
			</div>
		);
	}

	function renderDialogWrapper() {
		return (
			<div className="dialog-root">
				<DialogTitle title={_('Edit notebook')}/>
				{renderContent()}
				<DialogButtonRow
					themeId={props.themeId}
					onClick={onButtonRowClick}
				/>
			</div>
		);
	}

	return (
		<Dialog onClose={onClose} className="master-password-dialog" renderContent={renderDialogWrapper}/>
	);
}
