class BaseCommand {

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

	autocomplete() {
		return null;
	}

	options() {
		return [];
	}

	hidden() {
		return false;
	}

	async cancel() {}

}

export { BaseCommand };