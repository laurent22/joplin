import * as React from 'react';
import { useCallback } from 'react';
import { ButtonLevel } from '../../Button/Button';
import { StyledAddButton, StyledHeader, StyledHeaderIcon, StyledHeaderLabel } from '../styles';
import { HeaderId, HeaderListItem } from '../types';
import { _ } from '@joplin/lib/locale';
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

	const addButton = <StyledAddButton
		iconLabel={_('New')}
		onClick={item.onPlusButtonClick}
		iconName='fas fa-plus'
		level={ButtonLevel.SidebarSecondary}
	/>;

	return (
		<ListItemWrapper
			containerRef={props.anchorRef}
			selected={props.isSelected}
			itemIndex={props.index}
			itemCount={props.itemCount}
			className='sidebar-header-container'
			{...item.extraProps}
			onDrop={props.onDrop}
		>
			<StyledHeader
				onContextMenu={onContextMenu}
				onClick={onClick}
			>
				<StyledHeaderIcon aria-label='' className={item.iconName}/>
				<StyledHeaderLabel>{item.label}</StyledHeaderLabel>
			</StyledHeader>
			{ item.onPlusButtonClick && addButton }
		</ListItemWrapper>
	);
};

export default HeaderItem;
