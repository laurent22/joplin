import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'showPrompt',
};

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, config: any) => {
			return new Promise((resolve) => {
				comp.setState({
					promptOptions: {
						...config,
						label: _(config.label),
						onClose: async (answer: any, buttonType: string) => {
							resolve({
								answer: answer,
								buttonType: buttonType,
							});
							comp.setState({ promptOptions: null });
						},
					},
				});
			});
		},
	};
};
