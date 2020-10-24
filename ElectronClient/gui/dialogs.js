const smalltalk = require('smalltalk');

class Dialogs {
	async alert(message, title = '') {
		await smalltalk.alert(title, message);
	}

	async confirm(message, title = '') {
		try {
			await smalltalk.confirm(title, message);
			return true;
		} catch (error) {
			return false;
		}
	}

	async prompt(message, title = '', defaultValue = '', options = null) {
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

module.exports = dialogs;
