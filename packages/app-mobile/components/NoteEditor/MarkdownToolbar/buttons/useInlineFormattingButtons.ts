import { useMemo } from 'react';
import { ButtonSpec } from '../types';
import { _ } from '@joplin/lib/locale';
import { ButtonRowProps } from '../types';


const useInlineFormattingButtons = ({ selectionState, editorControl, readOnly, editorSettings }: ButtonRowProps) => {
	const { bolded, italicized, inCode, inMath, inLink } = selectionState;

	return useMemo(() => {
		const inlineFormattingBtns: ButtonSpec[] = [];
		inlineFormattingBtns.push({
			icon: 'fa bold',
			description: _('Bold'),
			active: bolded,
			onPress: editorControl.toggleBolded,

			priority: 3,
			disabled: readOnly,
		});

		inlineFormattingBtns.push({
			icon: 'fa italic',
			description: _('Italic'),
			active: italicized,
			onPress: editorControl.toggleItalicized,

			priority: 2,
			disabled: readOnly,
		});

		inlineFormattingBtns.push({
			icon: 'text {;}',
			description: _('Code'),
			active: inCode,
			onPress: editorControl.toggleCode,

			priority: 2,
			disabled: readOnly,
		});

		if (editorSettings.katexEnabled) {
			inlineFormattingBtns.push({
				icon: 'text ∑',
				description: _('KaTeX'),
				active: inMath,
				onPress: editorControl.toggleMath,

				priority: 1,
				disabled: readOnly,
			});
		}

		inlineFormattingBtns.push({
			icon: 'fa link',
			description: _('Link'),
			active: inLink,
			onPress: editorControl.showLinkDialog,

			priority: -3,
			disabled: readOnly,
		});
		return inlineFormattingBtns;
	}, [readOnly, editorControl, editorSettings.katexEnabled, inLink, inMath, inCode, italicized, bolded]);
};

export default useInlineFormattingButtons;
