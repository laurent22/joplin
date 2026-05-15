import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { WindowControl } from '../utils/useWindowControl';

export const declaration: CommandDeclaration = {
	name: 'showPrompt',
};

enum PromptInputType {
	Dropdown = 'dropdown',
	Datetime = 'datetime',
	Tags = 'tags',
	Text = 'text',
}

interface PromptConfig {
	label: string;
	inputType?: PromptInputType;
	value?: string;
	autocomplete?: unknown[];
	buttons?: string[];
}

export const runtime = (comp: WindowControl): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, config: PromptConfig) => {
			return new Promise((resolve) => {
				comp.setState({
					promptOptions: {
						...config,
						onClose: async (answer: unknown, buttonType: unknown) => {
							comp.setState({ promptOptions: null });
							resolve({
								answer: answer,
								buttonType: buttonType,
							});
						},
					},
				});
			});
		},
	};
};
