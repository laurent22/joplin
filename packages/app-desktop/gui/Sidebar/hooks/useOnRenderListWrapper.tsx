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

const NewFolderButton = () => {
	// To allow it to be accessed by accessibility tools, the new folder button
	// is not included in the portion of the list with role='tree'.
	return <button onClick={onAddFolderButtonClick} className='new-folder-button'>
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
