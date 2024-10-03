import * as React from 'react';

import { FolderIcon, FolderIconType } from '@joplin/lib/services/database/types';
import ExpandLink from './ExpandLink';
import { StyledListItemAnchor, StyledShareIcon, StyledSpanFix } from '../styles';
import { ItemClickListener, ItemContextMenuListener, ItemDragListener } from '../types';
import FolderIconBox from '../../FolderIconBox';
import { getTrashFolderIcon, getTrashFolderId } from '@joplin/lib/services/trash';
import Folder from '@joplin/lib/models/Folder';
import { ModelType } from '@joplin/lib/BaseModel';
import { _ } from '@joplin/lib/locale';
import NoteCount from './NoteCount';
import ListItemWrapper from './ListItemWrapper';

const renderFolderIcon = (folderIcon: FolderIcon) => {
	if (!folderIcon) {
		const defaultFolderIcon: FolderIcon = {
			dataUrl: '',
			emoji: '',
			name: 'far fa-folder',
			type: FolderIconType.FontAwesome,
		};
		return <div style={{ marginRight: 7, display: 'flex' }}><FolderIconBox opacity={0.7} folderIcon={defaultFolderIcon}/></div>;
	}

	return <div style={{ marginRight: 7, display: 'flex' }}><FolderIconBox folderIcon={folderIcon}/></div>;
};

interface FolderItemProps {
	hasChildren: boolean;
	showFolderIcon: boolean;
	isExpanded: boolean;
	parentId: string;
	depth: number;
	folderId: string;
	folderTitle: string;
	folderIcon: FolderIcon;
	noteCount: number;
	onFolderDragStart_: ItemDragListener;
	onFolderDragOver_: ItemDragListener;
	onFolderDrop_: ItemDragListener;
	itemContextMenu: ItemContextMenuListener;
	folderItem_click: (folderId: string)=> void;
	onFolderToggleClick_: ItemClickListener;
	shareId: string;
	selected: boolean;

	index: number;
	itemCount: number;
}

function FolderItem(props: FolderItemProps) {
	const { hasChildren, showFolderIcon, isExpanded, parentId, depth, selected, folderId, folderTitle, folderIcon, noteCount, onFolderDragStart_, onFolderDragOver_, onFolderDrop_, itemContextMenu, folderItem_click, onFolderToggleClick_, shareId } = props;

	const shareTitle = _('Shared');
	const shareIcon = shareId && !parentId ? <StyledShareIcon aria-label={shareTitle} title={shareTitle} className="fas fa-share-alt"/> : null;
	const draggable = ![getTrashFolderId(), Folder.conflictFolderId()].includes(folderId);

	const doRenderFolderIcon = () => {
		if (folderId === getTrashFolderId()) {
			return renderFolderIcon(getTrashFolderIcon(FolderIconType.FontAwesome));
		}

		if (!showFolderIcon) return null;
		return renderFolderIcon(folderIcon);
	};

	return (
		<ListItemWrapper
			depth={depth}
			selected={selected}
			itemIndex={props.index}
			itemCount={props.itemCount}
			aria-expanded={hasChildren ? props.isExpanded : undefined}
			className={`list-item-container list-item-depth-${depth} ${selected ? 'selected' : ''}`}
			onDragStart={onFolderDragStart_}
			onDragOver={onFolderDragOver_}
			onDrop={onFolderDrop_}
			draggable={draggable}
			data-folder-id={folderId}
		>
			<ExpandLink hasChildren={hasChildren} folderTitle={folderTitle} folderId={folderId} onClick={onFolderToggleClick_} isExpanded={isExpanded}/>
			<StyledListItemAnchor
				className="list-item"
				isConflictFolder={folderId === Folder.conflictFolderId()}
				selected={selected}
				shareId={shareId}
				data-id={folderId}
				data-type={ModelType.Folder}
				onContextMenu={itemContextMenu}
				data-folder-id={folderId}
				onDoubleClick={onFolderToggleClick_}
			
				onClick={() => {
					folderItem_click(folderId);
				}}
			>
				{doRenderFolderIcon()}<StyledSpanFix className="title">{folderTitle}</StyledSpanFix>
				{shareIcon} <NoteCount count={noteCount}/>
			</StyledListItemAnchor>
		</ListItemWrapper>
	);
}

export default FolderItem;
