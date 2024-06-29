interface Options {
	title: string;
	buttons: string[];
}

// As of 2024-06-22, alerts aren't supported by React Native Web.

const showMessageBox = (message: string, options: Options = null) => {
	return new Promise<number>(resolve => {
		if (options?.buttons?.length === 1) {
			alert(message);
			resolve(0);
		} else {
			resolve(confirm(message) ? 0 : 1);
		}
	});
};
export default showMessageBox;
