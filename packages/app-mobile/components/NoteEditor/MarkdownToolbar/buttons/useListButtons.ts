import { useMemo } from 'react';
import { ButtonSpec } from '../types';
import { _ } from '@joplin/lib/locale';
import { ButtonRowProps } from '../types';

const useListButtons = ({ selectionState, editorControl, readOnly }: ButtonRowProps) => {
	return useMemo(() => {
		const listButtons: ButtonSpec[] = [];

		listButtons.push({
			icon: 'fa list-ul',
			description: _('Unordered list'),
			active: selectionState.inUnorderedList,
			onPress: editorControl.toggleUnorderedList,

			priority: -2,
			disabled: readOnly,
		});

		listButtons.push({
			icon: 'fa list-ol',
			description: _('Ordered list'),
			active: selectionState.inOrderedList,
			onPress: editorControl.toggleOrderedList,

			priority: -2,
			disabled: readOnly,
		});

		listButtons.push({
			icon: 'fa tasks',
			description: _('Task list'),
			active: selectionState.inChecklist,
			onPress: editorControl.toggleTaskList,

			priority: -2,
			disabled: readOnly,
		});


		listButtons.push({
			icon: 'ant indent-left',
			description: _('Decrease indent level'),
			onPress: editorControl.decreaseIndent,

			priority: -1,
			disabled: readOnly,
		});

		listButtons.push({
			icon: 'ant indent-right',
			description: _('Increase indent level'),
			onPress: editorControl.increaseIndent,

			priority: -1,
			disabled: readOnly,
		});

		return listButtons;
	}, [readOnly, editorControl, selectionState]);
};

export default useListButtons;
