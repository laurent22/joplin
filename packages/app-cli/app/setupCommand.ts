import { _ } from '@joplin/lib/locale';

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
export default (cmd: any, stdout: Function, store: Function, gui: Function) => {
	cmd.setStdout((text: string) => {
		return stdout(text);
	});

	cmd.setDispatcher((action: any) => {
		if (store()) {
			return store().dispatch(action);
		} else {
			return () => {};
		}
	});

	cmd.setPrompt(async (message: string, options: any) => {
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
