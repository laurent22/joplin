import joplin from 'api';
import { ToastType } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		const dialogs = joplin.views.dialogs;

		setTimeout(() => {
			dialogs.showToast({
				message: 'This is an info message',
			});
		}, 5000);

		setTimeout(() => {
			dialogs.showToast({
				type: ToastType.Error,
				message: 'This is an error message',
			});
		}, 7000);

		setTimeout(() => {
			dialogs.showToast({
				type: ToastType.Success,
				message: 'This is a success message',
			});
		}, 9000);
	},

});
