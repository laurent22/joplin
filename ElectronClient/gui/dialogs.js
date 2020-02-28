const smalltalk = require('smalltalk');
const Swal = require('sweetalert2');

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
	async promptUrl(message) {
		try {
			let formValues = { title: '', url: '', dismiss: '' };
			formValues = await Swal.fire({
				title: `${message}`,
				html:
					'<input id="URL" class="swal2-input" placeholder="Enter the URl">' +
					'<input id="Title" class="swal2-input" placeholder="Title">',
				focusConfirm: false,
				showCancelButton: true,

				preConfirm: () => {
					return ({
						url: document.getElementById('URL').value,
						title: document.getElementById('Title').value,
					});
				},
			});

			return (formValues);
		} catch (error) { return null; }
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
