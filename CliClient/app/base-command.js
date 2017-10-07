import { _ } from 'lib/locale.js';

class BaseCommand {

	constructor() {
		this.stdout_ = null;
		this.prompt_ = null;
	}

	usage() {
		throw new Error('Usage not defined');
	}

	description() {
		throw new Error('Description not defined');
	}

	async action(args) {
		throw new Error('Action not defined');
	}

	aliases() {
		return [];
	}

	options() {
		return [];
	}

	hidden() {
		return false;
	}

	enabled() {
		return true;
	}

	cancellable() {
		return false;
	}

	async cancel() {}

	name() {
		let r = this.usage().split(' ');
		return r[0];
	}

	setStdout(fn) {
		this.stdout_ = fn;
	}

	stdout(...object) {
		if (this.stdout_) this.stdout_(...object);
	}

	setPrompt(fn) {
		this.prompt_ = fn;
	}

	async prompt(message, options = null) {
		if (!this.prompt_) throw new Error('Prompt is undefined');
		if (!options) options = {};
		if (!options.type) options.type = 'boolean';
		if (!options.answers) options.answers = [_('Y'), _('n')];
		return await this.prompt_(message, options);
	}

	metadata() {
		return {
			name: this.name(),
			usage: this.usage(),
			options: this.options(),
			hidden: this.hidden(),
		};
	}

}

export { BaseCommand };