import * as React from 'react';
import { StyledAllNotesIcon, StyledExpandLink, StyledListItem, StyledListItemAnchor } from './styles';
import ExpandIcon from './ExpandIcon';
import { useCallback } from 'react';
import { Dispatch } from 'redux';
import bridge from '../../services/bridge';
import Setting from '@joplin/lib/models/Setting';
import { Menu, MenuItem } from 'electron';
import MenuUtils from '@joplin/lib/services/commands/MenuUtils';
import CommandService from '@joplin/lib/services/CommandService';
import PerFolderSortOrderService from '../../services/sortOrder/PerFolderSortOrderService';
import { _ } from '@joplin/lib/locale';
import { AppState } from '../../app.reducer';
import { connect } from 'react-redux';
const { ALL_NOTES_FILTER_ID } = require('@joplin/lib/reserved-ids');

interface Props {
	dispatch: Dispatch;
	selectedSmartFilterId: string;
	notesParentType: string;
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

	const selected = props.selectedSmartFilterId === ALL_NOTES_FILTER_ID && props.notesParentType === 'SmartFilter';
	return (
		<StyledListItem key="allNotesHeader" selected={selected} className={'list-item-container list-item-depth-0 all-notes'} isSpecialItem={true}>
			<StyledExpandLink><ExpandIcon isExpanded={false} isVisible={false} /></StyledExpandLink>
			<StyledAllNotesIcon className="icon-notes"/>
			<StyledListItemAnchor
				className="list-item"
				isSpecialItem={true}
				href="#"
				selected={selected}
				onClick={onAllNotesClick_}
				onContextMenu={toggleAllNotesContextMenu}
			>
				{_('All notes')}
			</StyledListItemAnchor>
		</StyledListItem>
	);
};

export default connect((state: AppState) => {
	return {
		selectedSmartFilterId: state.selectedSmartFilterId,
		notesParentType: state.notesParentType,
	};
})(AllNotesItem);
