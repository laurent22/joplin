const { _ } = require('lib/locale.js');
const { reg } = require('lib/registry.js');

class BaseCommand {

	constructor() {
		this.stdout_ = null;
		this.prompt_ = null;
	}

	usage() {
		throw new Error('Usage not defined');
	}

	encryptionCheck(item) {
		if (item && item.encryption_applied) throw new Error(_('Cannot change encrypted item'));
	}

	description() {
		throw new Error('Description not defined');
	}

	async action(args) {
		throw new Error('Action not defined');
	}

	compatibleUis() {
		return ['cli', 'gui'];
	}

	supportsUi(ui) {
		return this.compatibleUis().indexOf(ui) >= 0;
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

	setDispatcher(fn) {
		this.dispatcher_ = fn;
	}

	dispatch(action) {
		if (!this.dispatcher_) throw new Error('Dispatcher not defined');
		return this.dispatcher_(action);
	}

	setStdout(fn) {
		this.stdout_ = fn;
	}

	stdout(text) {
		if (this.stdout_) this.stdout_(text);
	}

	setPrompt(fn) {
		this.prompt_ = fn;
	}

	async prompt(message, options = null) {
		if (!this.prompt_) throw new Error('Prompt is undefined');
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

	logger() {
		return reg.logger();
	}

}

module.exports = { BaseCommand };