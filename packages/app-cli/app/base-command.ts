import { _ } from '@joplin/lib/locale';
import { reg } from '@joplin/lib/registry.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stdout can be called with formatted strings or arbitrary values
type StdoutFn = (text: any)=> void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prompt response varies by type and tests pass sync mocks
type PromptFn = (message: string, options: any)=> any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Redux dispatch action shape varies
type DispatcherFn = (action: any)=> any;

export default class BaseCommand {

	protected stdout_: StdoutFn | null = null;
	protected prompt_: PromptFn | null = null;
	protected dispatcher_: DispatcherFn | null = null;

	public usage(): string {
		throw new Error('Usage not defined');
	}

	public encryptionCheck(item: { encryption_applied?: number } | null) {
		if (item && item.encryption_applied) throw new Error(_('Cannot change encrypted item'));
	}

	public description() {
		throw new Error('Description not defined');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Subclasses override with command-specific arg shapes; parameters are contravariant so a narrower base would break all overrides
	public async action(_args: any) {
		throw new Error('Action not defined');
	}

	public compatibleUis() {
		return ['cli', 'gui'];
	}

	public supportsUi(ui: string) {
		return this.compatibleUis().indexOf(ui) >= 0;
	}

	public options(): unknown[] {
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

	public setDispatcher(fn: DispatcherFn) {
		this.dispatcher_ = fn;
	}

	public dispatch(action: unknown) {
		if (!this.dispatcher_) throw new Error('Dispatcher not defined');
		return this.dispatcher_(action);
	}

	public setStdout(fn: StdoutFn) {
		this.stdout_ = fn;
	}

	public stdout(text: string) {
		if (this.stdout_) this.stdout_(text);
	}

	public setPrompt(fn: PromptFn) {
		this.prompt_ = fn;
	}

	public async prompt(message: string, options: unknown = null) {
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
