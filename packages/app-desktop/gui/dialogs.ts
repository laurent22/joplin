const smalltalk = require('smalltalk/bundle');

class Dialogs {
	async alert(message: string, title = '') {
		await smalltalk.alert(title, message);
	}

	async confirm(message: string, title = '', options: any = {}) {
		try {
			await smalltalk.confirm(title, message, options);
			return true;
		} catch (error) {
			return false;
		}
	}

	async prompt(message: string, title = '', defaultValue = '', options: any = null) {
		if (options === null) options = {};

		try {
			const answer = await smalltalk.prompt(title, message, defaultValue, options);
			return answer;
		} catch (error) {
			return null;
		}
	}
}

const dialogs = new Dialogs();

export default dialogs;
