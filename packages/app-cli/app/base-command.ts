import { _ } from '@joplin/lib/locale';
import { reg } from '@joplin/lib/registry.js';

export default class BaseCommand {

	protected stdout_: any = null;
	protected prompt_: any = null;
	protected dispatcher_: any;

	public usage(): string {
		throw new Error('Usage not defined');
	}

	public encryptionCheck(item: any) {
		if (item && item.encryption_applied) throw new Error(_('Cannot change encrypted item'));
	}

	public description() {
		throw new Error('Description not defined');
	}

	public async action(_args: any) {
		throw new Error('Action not defined');
	}

	public compatibleUis() {
		return ['cli', 'gui'];
	}

	public supportsUi(ui: string) {
		return this.compatibleUis().indexOf(ui) >= 0;
	}

	public options(): any[] {
		return [];
	}

	public hidden() {
		return false;
	}

	public enabled() {
		return true;
	}

	public cancellable() {
		return false;
	}

	public async cancel() {}

	public name() {
		const r = this.usage().split(' ');
		return r[0];
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public setDispatcher(fn: Function) {
		this.dispatcher_ = fn;
	}

	public dispatch(action: any) {
		if (!this.dispatcher_) throw new Error('Dispatcher not defined');
		return this.dispatcher_(action);
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public setStdout(fn: Function) {
		this.stdout_ = fn;
	}

	public stdout(text: string) {
		if (this.stdout_) this.stdout_(text);
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public setPrompt(fn: Function) {
		this.prompt_ = fn;
	}

	public async prompt(message: string, options: any = null) {
		if (!this.prompt_) throw new Error('Prompt is undefined');
		return await this.prompt_(message, options);
	}

	public metadata() {
		return {
			name: this.name(),
			usage: this.usage(),
			options: this.options(),
			hidden: this.hidden(),
		};
	}

	public logger() {
		return reg.logger();
	}
}
