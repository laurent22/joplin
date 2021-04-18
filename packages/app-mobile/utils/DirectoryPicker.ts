import { Platform, NativeModules } from 'react-native';

let isAvailable = false;
if (Platform.OS === 'android') {
	NativeModules.DirectoryPicker.isAvailable().then((res: boolean) => {
		isAvailable = res;
	});
}

export default {

	isAvailable: (): boolean => isAvailable,

	async pick(): Promise<string> {
		return NativeModules.DirectoryPicker.pick();
	},

};
