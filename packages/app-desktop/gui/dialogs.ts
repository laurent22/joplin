import Logger from '@joplin/utils/Logger';

const logger = Logger.create('dialogs');

interface Smalltalk {
	alert(title: string, message: string): Promise<boolean>;
	confirm(title: string, message: string, options: unknown): Promise<void>;
	prompt(title: string, message: string, defaultValue: string, options: unknown): Promise<string>;
}

class Dialogs {
	private activeWindow: Window|null;
	public setActiveWindow(win: Window) {
		this.activeWindow = win;
	}

	private get smalltalk(): Smalltalk {
		// The smalltalk library shows prompts in whichever document it is loaded in
		// (it uses the global document object).
		// As such, a copy of the library needs to be loaded in each window:
		if (this.activeWindow && 'smalltalk' in this.activeWindow) {
			return this.activeWindow.smalltalk as Smalltalk;
		}

		if ('smalltalk' in window) {
			return window.smalltalk as Smalltalk;
		}

		throw new Error('Unable to find the smalltalk library. Please make sure it has been loaded with a <script> element.');
	}

	public async alert(message: string, title = '') {
		await this.smalltalk.alert(title, message);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async confirm(message: string, title = '', options: any = {}) {
		try {
			await this.smalltalk.confirm(title, message, options);
			return true;
		} catch (error) {
			logger.error(error);
			return false;
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async prompt(message: string, title = '', defaultValue = '', options: any = null) {
		options = { cancel: true, ...options };

		try {
			// https://github.com/laurent22/joplin/pull/10258#discussion_r1550306545
			const answer = await this.smalltalk.prompt(title, message, defaultValue, options);
			return answer;
		} catch (error) {
			logger.warn('Prompt appears to have been cancelled:', error);
			return null;
		}
	}
}

const dialogs = new Dialogs();

export default dialogs;
