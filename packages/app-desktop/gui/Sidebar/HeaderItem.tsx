import * as React from 'react';
import { useCallback } from 'react';
import { ButtonLevel } from '../Button/Button';
import { StyledAddButton, StyledHeader, StyledHeaderIcon, StyledHeaderLabel } from './styles';
import { HeaderListItem, ItemContextMenuListener } from './types';

interface Props {
	item: HeaderListItem;
	contextMenuHandler: ItemContextMenuListener|null;
	onDrop: React.DragEventHandler|null;
	anchorRef: React.Ref<HTMLElement>;
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

	return (
		<div
			className='sidebar-header-container'
			{...item.extraProps}
			onDrop={props.onDrop}
		>
			<StyledHeader
				onContextMenu={props.contextMenuHandler}
				onClick={onClick}
				tabIndex={0}
				ref={props.anchorRef}
			>
				<StyledHeaderIcon className={item.iconName}/>
				<StyledHeaderLabel>{item.label}</StyledHeaderLabel>
			</StyledHeader>
			{ item.onPlusButtonClick && <StyledAddButton onClick={item.onPlusButtonClick} iconName="fas fa-plus" level={ButtonLevel.SidebarSecondary}/> }
		</div>
	);
};

export default HeaderItem;
