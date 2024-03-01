import { useMemo } from 'react';
import { ButtonSpec } from '../types';
import { _ } from '@joplin/lib/locale';
import { ButtonRowProps } from '../types';

const useHeaderButtons = ({ selectionState, editorControl, readOnly }: ButtonRowProps) => {
	return useMemo(() => {
		const headerButtons: ButtonSpec[] = [];
		for (let level = 1; level <= 5; level++) {
			const active = selectionState.headerLevel === level;

			headerButtons.push({
				icon: `text H${level}`,
				description: _('Header %d', level),
				active,

				// We only call addHeaderButton 5 times and in the same order, so
				// the linter error is safe to ignore.
				// eslint-disable-next-line @seiyab/react-hooks/rules-of-hooks
				onPress: () => {
					editorControl.toggleHeaderLevel(level);
				},

				// Make it likely for the first three header buttons to show, less likely for
				// the others.
				priority: level < 3 ? 2 : 0,
				disabled: readOnly,
			});
		}
		return headerButtons;
	}, [selectionState, editorControl, readOnly]);
};

export default useHeaderButtons;
