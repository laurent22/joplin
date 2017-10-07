class BaseCommand {

	constructor() {
		this.stdout_ = null;
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