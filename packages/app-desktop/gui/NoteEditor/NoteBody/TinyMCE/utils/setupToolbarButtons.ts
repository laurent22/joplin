import { _ } from '@joplin/lib/locale';

interface ButtonDefinition {
	name: string;
	tooltip: string;
	icon: string;
	grouped?: boolean;
}

function buttonDefinitions(): ButtonDefinition[] {
	return [
		{
			name: 'joplinHighlight',
			tooltip: _('Highlight'),
			icon: 'highlight-bg-color',
		},
		{
			name: 'joplinStrikethrough',
			tooltip: _('Strikethrough'),
			icon: 'strike-through',
		},
		{
			name: 'joplinInsert',
			tooltip: _('Insert'),
			icon: 'underline',
			grouped: true,
		},
		{
			name: 'joplinSup',
			tooltip: _('Superscript'),
			icon: 'superscript',
			grouped: true,
		},
		{
			name: 'joplinSub',
			tooltip: _('Subscript'),
			icon: 'subscript',
			grouped: true,
		},
	];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export default function(editor: any) {
	const definitions = buttonDefinitions();

	for (const def of definitions) {
		editor.ui.registry.addToggleButton(def.name, {
			tooltip: def.tooltip,
			icon: def.icon,
			onAction: async function() {
				editor.execCommand('mceToggleFormat', false, def.name);
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			onSetup: function(api: any) {
				editor.formatter.formatChanged(def.name, (state: boolean) => {
					api.setActive(state);
				});
			},
		});
	}

	// Old code to format a group of buttons into a dropdown
	// const items: string[] = definitions.filter(d => !!d.grouped).map(d => d.name);
	// items.push('forecolor');
	// editor.ui.registry.addGroupToolbarButton('formattingExtras', {
	// 	icon: 'image-options',
	// 	tooltip: _('Formatting'),
	// 	items: items.join(' '),
	// });
}
