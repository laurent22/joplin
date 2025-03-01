import * as React from 'react';
import { useCallback } from 'react';
import { _ } from '@joplin/lib/locale';
import CommandService from '@joplin/lib/services/CommandService';

interface Props {
	selectedIndex: number;
	onKeyDown: React.KeyboardEventHandler;
}

const onAddFolderButtonClick = () => {
	void CommandService.instance().execute('newFolder');
};

const CollapseExpandAllButton = () => {
	// To allow it to be accessed by accessibility tools, the new folder button
	// is not included in the portion of the list with role='tree'.
	return <button onClick={onAddFolderButtonClick} className='sidebar-header-button -collapseall'>
		<i
			aria-label={_('Collapse / Expand all notebooks')}
			role='img'
			className='far fa-caret-square-up'
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

const useOnRenderListWrapper = ({ selectedIndex, onKeyDown }: Props) => {
	return useCallback((listItems: React.ReactNode[]) => {
		const listHasValidSelection = selectedIndex >= 0;
		const allowContainerFocus = !listHasValidSelection;
		return <>
			<CollapseExpandAllButton/>
			<NewFolderButton/>
			<div
				role='tree'
				className='sidebar-list-items-wrapper'
				tabIndex={allowContainerFocus ? 0 : undefined}
				onKeyDown={onKeyDown}
			>
				{...listItems}
			</div>
		</>;
	}, [selectedIndex, onKeyDown]);
};

export default useOnRenderListWrapper;
