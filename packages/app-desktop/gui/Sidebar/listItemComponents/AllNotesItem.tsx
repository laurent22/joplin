import * as React from 'react';
import { StyledAllNotesIcon, StyledListItemAnchor } from '../styles';
import { useCallback } from 'react';
import { Dispatch } from 'redux';
import bridge from '../../../services/bridge';
import Setting from '@joplin/lib/models/Setting';
import MenuUtils from '@joplin/lib/services/commands/MenuUtils';
import CommandService from '@joplin/lib/services/CommandService';
import PerFolderSortOrderService from '../../../services/sortOrder/PerFolderSortOrderService';
import { _ } from '@joplin/lib/locale';
import { connect } from 'react-redux';
import EmptyExpandLink from './EmptyExpandLink';
import ListItemWrapper, { ListItemRef } from './ListItemWrapper';
const { ALL_NOTES_FILTER_ID } = require('@joplin/lib/reserved-ids');

const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;

interface Props {
	dispatch: Dispatch;
	anchorRef: ListItemRef;
	selected: boolean;
	index: number;
	itemCount: number;
}

const menuUtils = new MenuUtils(CommandService.instance());

const AllNotesItem: React.FC<Props> = props => {
	const onAllNotesClick_ = useCallback(() => {
		props.dispatch({
			type: 'SMART_FILTER_SELECT',
			id: ALL_NOTES_FILTER_ID,
		});
	}, [props.dispatch]);

	const toggleAllNotesContextMenu = useCallback(() => {
		const menu = new Menu();

		if (Setting.value('notes.perFolderSortOrderEnabled')) {
			menu.append(new MenuItem({
				...menuUtils.commandToStatefulMenuItem('togglePerFolderSortOrder', ALL_NOTES_FILTER_ID),
				type: 'checkbox',
				checked: PerFolderSortOrderService.isSet(ALL_NOTES_FILTER_ID),
			}));
		}

		menu.popup({ window: bridge().window() });
	}, []);

	return (
		<ListItemWrapper
			containerRef={props.anchorRef}
			key="allNotesHeader"
			selected={props.selected}
			depth={1}
			className={'list-item-container list-item-depth-0 all-notes'}
			highlightOnHover={true}
			itemIndex={props.index}
			itemCount={props.itemCount}
		>
			<EmptyExpandLink/>
			<StyledAllNotesIcon aria-label='' role='img' className='icon-notes'/>
			<StyledListItemAnchor
				className="list-item"
				isSpecialItem={true}
				selected={props.selected}
				onClick={onAllNotesClick_}
				onContextMenu={toggleAllNotesContextMenu}
			>
				{_('All notes')}
			</StyledListItemAnchor>
		</ListItemWrapper>
	);
};

export default connect()(AllNotesItem);
