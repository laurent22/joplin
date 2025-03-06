import * as React from 'react';
import { useCallback } from 'react';
import { _ } from '@joplin/lib/locale';
import CommandService from '@joplin/lib/services/CommandService';

interface Props {
	selectedIndex: number;
	onKeyDown: React.KeyboardEventHandler;
	allFoldersCollapsed: boolean;
}

const onAddFolderButtonClick = () => {
	void CommandService.instance().execute('newFolder');
};

const onToggleAllFolders = (allFoldersCollapsed: boolean) => {
	void CommandService.instance().execute('toggleAllFolders', !allFoldersCollapsed);
};

interface CollapseExpandAllButtonProps {
	allFoldersCollapsed: boolean;
}

const CollapseExpandAllButton = (props: CollapseExpandAllButtonProps) => {
	// To allow it to be accessed by accessibility tools, the toggle button
	// is not included in the portion of the list with role='tree'.
	const icon = props.allFoldersCollapsed ? 'far fa-caret-square-right' : 'far fa-caret-square-down';
	const label = props.allFoldersCollapsed ? _('Expand all notebooks') : _('Collapse all notebooks');

	return <button onClick={() => onToggleAllFolders(props.allFoldersCollapsed)} className='sidebar-header-button -collapseall'>
		<i
			aria-label={label}
			role='img'
			className={icon}
		/>
	</button>;
};

const NewFolderButton = () => {
	// To allow it to be accessed by accessibility tools, the new folder button
	// is not included in the portion of the list with role='tree'.
	return <button onClick={onAddFolderButtonClick} className='sidebar-header-button -newfolder'>
		<i
			aria-label={_('New notebook')}
			role='img'
			className='fas fa-plus'
		/>
	</button>;
};

const useOnRenderListWrapper = (props: Props) => {
	return useCallback((listItems: React.ReactNode[]) => {
		const listHasValidSelection = props.selectedIndex >= 0;
		const allowContainerFocus = !listHasValidSelection;
		return <>
			<CollapseExpandAllButton allFoldersCollapsed={props.allFoldersCollapsed}/>
			<NewFolderButton/>
			<div
				role='tree'
				className='sidebar-list-items-wrapper'
				tabIndex={allowContainerFocus ? 0 : undefined}
				onKeyDown={props.onKeyDown}
			>
				{...listItems}
			</div>
		</>;
	}, [props.selectedIndex, props.onKeyDown, props.allFoldersCollapsed]);
};

export default useOnRenderListWrapper;
