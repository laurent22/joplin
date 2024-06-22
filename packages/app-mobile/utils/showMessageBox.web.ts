interface Options {
	title: string;
	buttons: string[];
}

// As of 2024-06-22, alerts aren't supported by React Native Web.

const showMessageBox = (message: string, _options: Options = null) => {
	return new Promise<number>(resolve => {
		resolve(confirm(message) ? 0 : 1);
	});
};
export default showMessageBox;
