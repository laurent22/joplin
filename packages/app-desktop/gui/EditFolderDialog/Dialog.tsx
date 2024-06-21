import * as React from 'react';
import { useCallback, useState, useRef, useEffect, useId } from 'react';
import { _ } from '@joplin/lib/locale';
import DialogButtonRow, { ClickEvent } from '../DialogButtonRow';
import Dialog from '../Dialog';
import DialogTitle from '../DialogTitle';
import StyledInput from '../style/StyledInput';
import { IconSelector, ChangeEvent } from './IconSelector';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import Folder from '@joplin/lib/models/Folder';
import { FolderEntity, FolderIcon, FolderIconType } from '@joplin/lib/services/database/types';
import Button from '../Button/Button';
import bridge from '../../services/bridge';
import shim from '@joplin/lib/shim';
import FolderIconBox from '../FolderIconBox';
import { focus } from '@joplin/lib/utils/focusHandler';

interface Props {
	themeId: number;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	dispatch: Function;
	folderId: string;
	parentId: string;
}

export default function(props: Props) {
	const [folderTitle, setFolderTitle] = useState('');
	const [folderIcon, setFolderIcon] = useState<FolderIcon>();
	const titleInputRef = useRef(null);

	const isNew = !props.folderId;

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		if (isNew) return;

		const folder = await Folder.load(props.folderId);
		if (event.cancelled) return;
		setFolderTitle(folder.title);
		setFolderIcon(Folder.unserializeIcon(folder.icon));
	}, [props.folderId, isNew]);

	const onClose = useCallback(() => {
		props.dispatch({
			type: 'DIALOG_CLOSE',
			name: 'editFolder',
		});
	}, [props.dispatch]);

	useEffect(() => {
		focus('Dialog::titleInputRef', titleInputRef.current);

		setTimeout(() => {
			titleInputRef.current.select();
		}, 100);
	}, []);

	const onButtonRowClick = useCallback(async (event: ClickEvent) => {
		if (event.buttonName === 'cancel') {
			onClose();
			return;
		}

		if (event.buttonName === 'ok') {
			const folder: FolderEntity = {
				title: folderTitle,
				icon: Folder.serializeIcon(folderIcon),
			};

			if (!isNew) folder.id = props.folderId;
			if (props.parentId) folder.parent_id = props.parentId;

			try {
				const savedFolder = await Folder.save(folder, { userSideValidation: true });
				onClose();

				props.dispatch({
					type: 'FOLDER_SELECT',
					id: savedFolder.id,
				});
			} catch (error) {
				bridge().showErrorMessageBox(error.message);
			}

			return;
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [onClose, folderTitle, folderIcon, props.folderId, props.parentId]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const onFolderTitleChange = useCallback((event: any) => {
		setFolderTitle(event.target.value);
	}, []);

	const onFolderIconChange = useCallback((event: ChangeEvent) => {
		setFolderIcon(event.value);
	}, []);

	const onClearClick = useCallback(() => {
		setFolderIcon(null);
	}, []);

	const onBrowseClick = useCallback(async () => {
		const filePaths = await bridge().showOpenDialog({
			filters: [
				{
					name: _('Images'),
					extensions: ['jpg', 'jpeg', 'png'],
				},
			],
		});
		if (filePaths.length !== 1) return;
		const filePath = filePaths[0];

		try {
			const dataUrl = await shim.imageToDataUrl(filePath, 256);
			setFolderIcon(icon => {
				return {
					...icon,
					emoji: '',
					name: '',
					type: FolderIconType.DataUrl,
					dataUrl,
				};
			});
		} catch (error) {
			await bridge().showErrorMessageBox(error.message);
		}
	}, []);

	const formTitleInputId = useId();
	function renderForm() {
		return (
			<div>
				<div className="form">
					<div className="form-input-group">
						<label htmlFor={formTitleInputId}>{_('Title')}</label>
						<StyledInput id={formTitleInputId} type="text" ref={titleInputRef} value={folderTitle} onChange={onFolderTitleChange}/>
					</div>

					<div className="form-input-group">
						<label>{_('Icon')}</label>
						<div className="icon-selector-row">
							{ folderIcon && <div className="foldericon"><FolderIconBox folderIcon={folderIcon} /></div> }
							<IconSelector
								title={_('Select emoji...')}
								icon={folderIcon}
								onChange={onFolderIconChange}
							/>
							<Button ml={1} title={_('Select file...')} onClick={onBrowseClick}/>
							{ folderIcon && <Button ml={1} title={_('Clear')} onClick={onClearClick}/> }
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

	const dialogTitle = isNew ? _('Create notebook') : _('Edit notebook');

	function renderDialogWrapper() {
		return (
			<div className="dialog-root">
				<DialogTitle title={dialogTitle}/>
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
