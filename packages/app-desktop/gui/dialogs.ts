import Logger from '@joplin/utils/Logger';

// Can't upgrade beyond 2.x because it doesn't work with Electron. If trying to
// upgrade again, check that adding a link from the CodeMirror editor works/
const smalltalk = require('smalltalk');

const logger = Logger.create('dialogs');

class Dialogs {
	public async alert(message: string, title = '') {
		await smalltalk.alert(title, message);
	}

	public async confirm(message: string, title = '', options: any = {}) {
		try {
			await smalltalk.confirm(title, message, options);
			return true;
		} catch (error) {
			logger.error(error);
			return false;
		}
	}

	public async prompt(message: string, title = '', defaultValue = '', options: any = null) {
		if (options === null) options = {};

		try {
			const answer = await smalltalk.prompt(title, message, defaultValue, options);
			return answer;
		} catch (error) {
			logger.error(error);
			return null;
		}
	}
}

const dialogs = new Dialogs();

export default dialogs;
