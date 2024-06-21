import * as React from 'react';

import { FolderIcon, FolderIconType } from '@joplin/lib/services/database/types';
import ExpandLink from './ExpandLink';
import { StyledListItem, StyledListItemAnchor, StyledNoteCount, StyledShareIcon, StyledSpanFix } from '../styles';
import { ItemClickListener, ItemContextMenuListener, ItemDragListener } from '../types';
import FolderIconBox from '../../FolderIconBox';
import { getTrashFolderIcon, getTrashFolderId } from '@joplin/lib/services/trash';
import Folder from '@joplin/lib/models/Folder';
import { ModelType } from '@joplin/lib/BaseModel';

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
	anchorRef: React.Ref<HTMLElement>;
}

function FolderItem(props: FolderItemProps) {
	const { hasChildren, showFolderIcon, isExpanded, parentId, depth, selected, folderId, folderTitle, folderIcon, noteCount, onFolderDragStart_, onFolderDragOver_, onFolderDrop_, itemContextMenu, folderItem_click, onFolderToggleClick_, shareId } = props;

	const noteCountComp = noteCount ? <StyledNoteCount className="note-count-label">{noteCount}</StyledNoteCount> : null;
	const shareIcon = shareId && !parentId ? <StyledShareIcon className="fas fa-share-alt"></StyledShareIcon> : null;
	const draggable = ![getTrashFolderId(), Folder.conflictFolderId()].includes(folderId);

	const doRenderFolderIcon = () => {
		if (folderId === getTrashFolderId()) {
			return renderFolderIcon(getTrashFolderIcon(FolderIconType.FontAwesome));
		}

		if (!showFolderIcon) return null;
		return renderFolderIcon(folderIcon);
	};

	return (
		<StyledListItem depth={depth} selected={selected} className={`list-item-container list-item-depth-${depth} ${selected ? 'selected' : ''}`} onDragStart={onFolderDragStart_} onDragOver={onFolderDragOver_} onDrop={onFolderDrop_} draggable={draggable} data-folder-id={folderId}>
			<ExpandLink hasChildren={hasChildren} folderTitle={folderTitle} folderId={folderId} onClick={onFolderToggleClick_} isExpanded={isExpanded}/>
			<StyledListItemAnchor
				ref={props.anchorRef}
				className="list-item"
				isConflictFolder={folderId === Folder.conflictFolderId()}
				href="#"
				selected={selected}
				shareId={shareId}
				data-id={folderId}
				data-type={ModelType.Folder}
				onContextMenu={itemContextMenu}
				data-folder-id={folderId}
				onClick={() => {
					folderItem_click(folderId);
				}}
				onDoubleClick={onFolderToggleClick_}
			>
				{doRenderFolderIcon()}<StyledSpanFix className="title">{folderTitle}</StyledSpanFix>
				{shareIcon} {noteCountComp}
			</StyledListItemAnchor>
		</StyledListItem>
	);
}

export default FolderItem;
