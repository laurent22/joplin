import { useCallback } from 'react';
import { AiService } from '@joplin/lib/services/ai';
import { _ } from '@joplin/lib/locale';

interface MenuItem {
	label: string;
	icon: string;
	action: (text: string) => Promise<string>;
	requiresSelection?: boolean;
}

interface Props {
	selectedText: string;
	noteBody: string;
	onResult: (result: string, shouldReplace: boolean) => void;
	onClose: () => void;
}

// Custom hook to generate AI context menu items
const useAiContextMenu = ({ selectedText, noteBody, onResult, onClose }: Props) => {
	const aiService = AiService.instance();

	const menuItems: MenuItem[] = [
		{
			label: _('Summarize'),
			icon: 'fas fa-compress-alt',
			action: (text) => aiService.summarize(text),
			requiresSelection: false,
		},
		{
			label: _('Improve Writing'),
			icon: 'fas fa-magic',
			action: (text) => aiService.improveWriting(text),
			requiresSelection: true,
		},
		{
			label: _('Fix Grammar'),
			icon: 'fas fa-spell-check',
			action: (text) => aiService.fixGrammar(text),
			requiresSelection: true,
		},
		{
			label: _('Expand'),
			icon: 'fas fa-expand-alt',
			action: (text) => aiService.expandText(text),
			requiresSelection: true,
		},
		{
			label: _('Make Shorter'),
			icon: 'fas fa-compress',
			action: (text) => aiService.makeShorter(text),
			requiresSelection: true,
		},
		{
			label: _('Continue Writing'),
			icon: 'fas fa-forward',
			action: (text) => aiService.continueWriting(text),
			requiresSelection: false,
		},
	];

	const handleAction = useCallback(async (item: MenuItem) => {
		try {
			const text = item.requiresSelection ? selectedText : (selectedText || noteBody);
			if (!text) {
				alert(_('No text available'));
				return;
			}

			const result = await item.action(text);
			onResult(result, item.requiresSelection);
			onClose();
		} catch (error) {
			alert(`${_('AI Error')}: ${error.message}`);
		}
	}, [selectedText, noteBody, onResult, onClose]);

	return {
		items: menuItems.map(item => ({
			...item,
			onClick: () => handleAction(item),
			disabled: item.requiresSelection && !selectedText,
		})),
	};
};

export default useAiContextMenu;
