import { _ } from '@joplin/lib/locale';
import { reg } from '@joplin/lib/registry.js';

export default class BaseCommand {

	protected stdout_: any = null;
	protected prompt_: any = null;
	protected dispatcher_: any;

	usage(): string {
		throw new Error('Usage not defined');
	}

	encryptionCheck(item: any) {
		if (item && item.encryption_applied) throw new Error(_('Cannot change encrypted item'));
	}

	description() {
		throw new Error('Description not defined');
	}

	async action(_args: any) {
		throw new Error('Action not defined');
	}

	compatibleUis() {
		return ['cli', 'gui'];
	}

	supportsUi(ui: string) {
		return this.compatibleUis().indexOf(ui) >= 0;
	}

	options(): any[] {
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
		const r = this.usage().split(' ');
		return r[0];
	}

	setDispatcher(fn: Function) {
		this.dispatcher_ = fn;
	}

	dispatch(action: any) {
		if (!this.dispatcher_) throw new Error('Dispatcher not defined');
		return this.dispatcher_(action);
	}

	setStdout(fn: Function) {
		this.stdout_ = fn;
	}

	stdout(text: string) {
		if (this.stdout_) this.stdout_(text);
	}

	setPrompt(fn: Function) {
		this.prompt_ = fn;
	}

	async prompt(message: string, options: any = null) {
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
