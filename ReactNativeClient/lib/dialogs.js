import DialogBox from 'react-native-dialogbox';
import { Keyboard } from 'react-native';

// Add this at the bottom of the component:
//
// <DialogBox ref={dialogbox => { this.dialogbox = dialogbox }}/>

let dialogs = {};

dialogs.confirm = (parentComponent, message) => {
	if (!'dialogbox' in parentComponent) throw new Error('A "dialogbox" component must be defined on the parent component!');

	return new Promise((resolve, reject) => {
		Keyboard.dismiss();

		parentComponent.dialogbox.confirm({
			content: message,
			
			ok: {
				callback: () => {
					resolve(true);
				}
			},

			cancel: {
				callback: () => {
					resolve(false);
				}
			},

		});
	});
};

dialogs.error = (parentComponent, message) => {
	Keyboard.dismiss();
	return parentComponent.dialogbox.alert(message);
}

dialogs.DialogBox = DialogBox

export { dialogs };