import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';

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
	value?: any;
	autocomplete?: any[];
	buttons?: string[];
}

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, config: PromptConfig) => {
			return new Promise((resolve) => {
				comp.setState({
					promptOptions: {
						...config,
						onClose: async (answer: any, buttonType: string) => {
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
