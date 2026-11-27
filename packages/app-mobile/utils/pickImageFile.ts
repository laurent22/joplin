import { Platform } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { _ } from '@joplin/lib/locale';

interface WebImage {
	type: string;
	fileName: string;
	data: ArrayBuffer;
}

interface NativeImage {
	type: string;
	fileName: string;
	uri: string;
}

const pickWebImageFile = async (): Promise<WebImage|null> => {
	const file = await new Promise<File|null>(resolve => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*';
		input.style.display = 'none';

		const finish = (selectedFile: File|null) => {
			input.remove();
			resolve(selectedFile);
		};
		input.onchange = () => finish(input.files?.[0] ?? null);
		input.oncancel = () => finish(null);

		document.body.appendChild(input);
		input.click();
	});

	if (!file) return null;
	return { type: file.type, fileName: file.name, data: await file.arrayBuffer() };
};

const pickImageFile = async (): Promise<WebImage|NativeImage|null> => {
	if (Platform.OS === 'web') return pickWebImageFile();

	const response = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, assetRepresentationMode: 'compatible' });
	if (response.didCancel) return null;
	if (response.errorCode) throw new Error(response.errorMessage || response.errorCode);
	const [file] = response.assets ?? [];
	if (!file?.uri) throw new Error(_('No image was selected'));
	return { type: file.type || '', fileName: file.fileName || '', uri: file.uri };
};

export default pickImageFile;
