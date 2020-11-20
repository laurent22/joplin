import CommandService, { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
const TemplateUtils = require('@joplin/lib/TemplateUtils');

export const declaration: CommandDeclaration = {
	name: 'selectTemplate',
};

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, noteType: string) => {
			comp.setState({
				promptOptions: {
					label: _('Template file:'),
					inputType: 'dropdown',
					value: comp.props.templates[0], // Need to start with some value
					autocomplete: comp.props.templates,
					onClose: async (answer: any) => {
						if (answer) {
							if (noteType === 'note' || noteType === 'todo') {
								CommandService.instance().execute('newNote', answer.value, noteType === 'todo');
							} else {
								CommandService.instance().execute('insertText', TemplateUtils.render(answer.value));
							}
						}

						comp.setState({ promptOptions: null });
					},
				},
			});
		},
	};
};
