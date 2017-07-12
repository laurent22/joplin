import DialogBox from 'react-native-dialogbox';

// Add this at the bottom of the component:
//
// <DialogBox ref={dialogbox => { this.dialogbox = dialogbox }}/>

let dialogs = {};

dialogs.confirm = (parentComponent, message) => {
	if (!'dialogbox' in parentComponent) throw new Error('A "dialogbox" component must be defined on the parent component!');

	return new Promise((resolve, reject) => {
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
	})
}

export { dialogs };