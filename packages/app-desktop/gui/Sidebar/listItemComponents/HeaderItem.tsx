import * as React from 'react';
import { useCallback } from 'react';
import { StyledHeader, StyledHeaderButtons, StyledHeaderIcon, StyledHeaderLabel } from '../styles';
import { HeaderId, HeaderListItem } from '../types';
import bridge from '../../../services/bridge';
import MenuUtils from '@joplin/lib/services/commands/MenuUtils';
import CommandService from '@joplin/lib/services/CommandService';
import ListItemWrapper, { ItemSelectionState, ListItemRef } from './ListItemWrapper';
import { _ } from '@joplin/lib/locale';

const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;
const menuUtils = new MenuUtils(CommandService.instance());


interface Props {
	anchorRef: ListItemRef;
	item: HeaderListItem;
	selectionState: ItemSelectionState;
	onDrop: React.DragEventHandler|null;
	index: number;
	itemCount: number;
	allFoldersCollapsed?: boolean;
}

const HeaderItem: React.FC<Props> = props => {
	const item = props.item;
	const onItemClick = item.onClick;
	const itemId = item.id;

	const onClick: React.MouseEventHandler<HTMLElement> = useCallback(event => {
		if (onItemClick) {
			onItemClick(itemId, event);
		}
	}, [onItemClick, itemId]);

	const onAddFolderButtonClick: React.MouseEventHandler<HTMLElement> = useCallback(event => {
		event.stopPropagation();
		void CommandService.instance().execute('newFolder');
	}, []);

	const onToggleAllFoldersClick: React.MouseEventHandler<HTMLElement> = useCallback(event => {
		event.stopPropagation();
		void CommandService.instance().execute('toggleAllFolders', !(props.allFoldersCollapsed ?? false));
	}, [props.allFoldersCollapsed]);

	const onContextMenu = useCallback(async () => {
		if (itemId === HeaderId.FolderHeader) {
			const menu = new Menu();

			menu.append(
				new MenuItem(menuUtils.commandToStatefulMenuItem('newFolder')),
			);

			menu.popup({ window: bridge().activeWindow() });
		}
	}, [itemId]);

	const collapseIcon = (props.allFoldersCollapsed ?? false) ? 'far fa-caret-square-right' : 'far fa-caret-square-down';
	const collapseLabel = (props.allFoldersCollapsed ?? false) ? _('Expand all notebooks') : _('Collapse all notebooks');
	const newFolderLabel = _('New notebook');

	const renderFolderHeaderButtons = () => {
		if (itemId !== HeaderId.FolderHeader) return null;
		return (
			<StyledHeaderButtons className='sidebar-header-actions'>
				<button onClick={onToggleAllFoldersClick} className='sidebar-header-button -collapseall' title={collapseLabel}>
					<i aria-label={collapseLabel} role='img' className={collapseIcon}/>
				</button>
				<button onClick={onAddFolderButtonClick} className='sidebar-header-button -newfolder' title={newFolderLabel}>
					<i aria-label={newFolderLabel} role='img' className='fas fa-plus'/>
				</button>
			</StyledHeaderButtons>
		);
	};

	return (
		<ListItemWrapper
			containerRef={props.anchorRef}
			selectionState={props.selectionState}
			itemIndex={props.index}
			itemCount={props.itemCount}
			expanded={props.item.expanded}
			onContextMenu={onContextMenu}
			depth={item.depth}
			highlightOnHover={false}
			className='sidebar-header-container'
			{...item.extraProps}
			onDrop={props.onDrop}
		>
			<StyledHeader
				onClick={onClick}
			>
				<StyledHeaderIcon aria-hidden='true' role='img' className={item.iconName}/>
				<StyledHeaderLabel>{item.label}</StyledHeaderLabel>
				{renderFolderHeaderButtons()}
			</StyledHeader>
		</ListItemWrapper>
	);
};

export default HeaderItem;
