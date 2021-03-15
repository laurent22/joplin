import modals from './modal/modals';

class Dialogs {
	async alert(message: string, title = '') {
		await modals.alert(title, message);
	}

	async confirm(message: string, title = '', options: any = {}) {
		try {
			await modals.confirm(title, message, options);
			return true;
		} catch (error) {
			return false;
		}
	}

	async prompt(message: string, title = '', defaultValue = '', options: any = null) {
		if (options === null) options = {};

		try {
			const answer = await modals.prompt(title, message, defaultValue, options);
			return answer;
		} catch (error) {
			return null;
		}
	}

	async promptWithConfirmation(message: string, title = '', defaultValue = '', options: any = null) {
		if (options === null) options = {};

		try {
			const answer = await modals.promptWithConfirmation(title, message, defaultValue, options);
			return answer;
		} catch (error) {
			return null;
		}
	}
}

const dialogs = new Dialogs();

export default dialogs;
