import Logger from '@joplin/utils/Logger';

// Can't upgrade beyond 2.x because it doesn't work with Electron. If trying to
// upgrade again, check that adding a link from the CodeMirror editor works/
const smalltalk = require('smalltalk');

const logger = Logger.create('dialogs');

class Dialogs {
	public async alert(message: string, title = '') {
		await smalltalk.alert(title, message);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async confirm(message: string, title = '', options: any = {}) {
		try {
			await smalltalk.confirm(title, message, options);
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
			const answer = await smalltalk.prompt(title, message, defaultValue, options);
			return answer;
		} catch (error) {
			logger.warn('Prompt appears to have been cancelled:', error);
			return null;
		}
	}
}

const dialogs = new Dialogs();

export default dialogs;
