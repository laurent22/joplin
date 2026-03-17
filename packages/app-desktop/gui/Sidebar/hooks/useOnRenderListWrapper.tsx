import * as React from 'react';
import { useCallback } from 'react';

interface Props {
	selectedIndex: number;
	onKeyDown: React.KeyboardEventHandler;
}

const useOnRenderListWrapper = (props: Props) => {
	return useCallback((listItems: React.ReactNode[]) => {
		const listHasValidSelection = props.selectedIndex >= 0;
		const allowContainerFocus = !listHasValidSelection;
		return <>
			<div
				role='tree'
				className='sidebar-list-items-wrapper'
				tabIndex={allowContainerFocus ? 0 : undefined}
				onKeyDown={props.onKeyDown}
			>
				{...listItems}
			</div>
		</>;
	}, [props.selectedIndex, props.onKeyDown]);
};

export default useOnRenderListWrapper;
