import { _ } from '@joplin/lib/locale';
import BaseCommand from './base-command';
import { Store } from 'redux';

interface PromptOptions {
	type?: string;
	booleanAnswerDefault?: string;
	answers?: string[];
	secure?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- gui() returns AppGui, which is an untyped JS module (app-gui.js)
export default (cmd: BaseCommand, stdout: (text: string)=> void, store: ()=> Store, gui: ()=> any) => {
	cmd.setStdout((text: string) => {
		return stdout(text);
	});

	cmd.setDispatcher(action => {
		if (store()) {
			return store().dispatch(action);
		} else {
			return () => {};
		}
	});

	cmd.setPrompt(async (message: string, options: PromptOptions) => {
		if (!options) options = {};
		if (!options.type) options.type = 'boolean';
		if (!options.booleanAnswerDefault) options.booleanAnswerDefault = 'y';
		if (!options.answers) options.answers = options.booleanAnswerDefault === 'y' ? [_('Y'), _('n')] : [_('N'), _('y')];

		if (options.type === 'boolean') {
			message += ` (${options.answers.join('/')})`;
		}

		let answer = await gui().prompt('', `${message} `, options);

		if (options.type === 'boolean') {
			if (answer === null) return false; // Pressed ESCAPE
			if (!answer) answer = options.answers[0];
			const positiveIndex = options.booleanAnswerDefault === 'y' ? 0 : 1;
			return answer.toLowerCase() === options.answers[positiveIndex].toLowerCase();
		} else {
			return answer;
		}
	});

	return cmd;
};
