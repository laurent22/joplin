import * as React from 'react';
import { useCallback } from 'react';
import { StyledHeader, StyledHeaderIcon, StyledHeaderLabel } from '../styles';
import { HeaderId, HeaderListItem } from '../types';
import bridge from '../../../services/bridge';
import MenuUtils from '@joplin/lib/services/commands/MenuUtils';
import CommandService from '@joplin/lib/services/CommandService';
import ListItemWrapper, { ListItemRef } from './ListItemWrapper';

const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;
const menuUtils = new MenuUtils(CommandService.instance());


interface Props {
	anchorRef: ListItemRef;
	item: HeaderListItem;
	isSelected: boolean;
	onDrop: React.DragEventHandler|null;
	index: number;
	itemCount: number;
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

	const onContextMenu = useCallback(async () => {
		if (itemId === HeaderId.FolderHeader) {
			const menu = new Menu();

			menu.append(
				new MenuItem(menuUtils.commandToStatefulMenuItem('newFolder')),
			);

			menu.popup({ window: bridge().window() });
		}
	}, [itemId]);

	return (
		<ListItemWrapper
			containerRef={props.anchorRef}
			selected={props.isSelected}
			itemIndex={props.index}
			itemCount={props.itemCount}
			expanded={props.item.expanded}
			onContextMenu={onContextMenu}
			depth={0}
			highlightOnHover={false}
			className='sidebar-header-container'
			{...item.extraProps}
			onDrop={props.onDrop}
		>
			<StyledHeader onClick={onClick}>
				<StyledHeaderIcon aria-label='' role='img' className={item.iconName}/>
				<StyledHeaderLabel>{item.label}</StyledHeaderLabel>
			</StyledHeader>
		</ListItemWrapper>
	);
};

export default HeaderItem;
