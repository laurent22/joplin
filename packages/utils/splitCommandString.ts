export interface SplitCommandOptions {
	handleEscape?: boolean;
}

export default (command: string, options: any = null) => {
	options = options || {};
	if (!('handleEscape' in options)) {
		options.handleEscape = true;
	}

	const args = [];
	let state = 'start';
	let current = '';
	let quote = '"';
	let escapeNext = false;
	for (let i = 0; i < command.length; i++) {
		const c = command[i];

		if (state === 'quotes') {
			if (c !== quote) {
				current += c;
			} else {
				args.push(current);
				current = '';
				state = 'start';
			}
			continue;
		}

		if (escapeNext) {
			current += c;
			escapeNext = false;
			continue;
		}

		if (c === '\\' && options.handleEscape) {
			escapeNext = true;
			continue;
		}

		if (c === '"' || c === '\'') {
			state = 'quotes';
			quote = c;
			continue;
		}

		if (state === 'arg') {
			if (c === ' ' || c === '\t') {
				args.push(current);
				current = '';
				state = 'start';
			} else {
				current += c;
			}
			continue;
		}

		if (c !== ' ' && c !== '\t') {
			state = 'arg';
			current += c;
		}
	}

	if (state === 'quotes') {
		throw new Error(`Unclosed quote in command line: ${command}`);
	}

	if (current !== '') {
		args.push(current);
	}

	if (args.length <= 0) {
		throw new Error('Empty command line');
	}

	return args;
};
