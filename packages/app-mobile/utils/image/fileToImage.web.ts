import shim from '@joplin/lib/shim';
import { Platform } from 'react-native';

const fileToImage = async (path: string) => {
	if (Platform.OS !== 'web') throw new Error('fileToImageUrl: Not supported');

	const image = new Image();
	const objectUrl = URL.createObjectURL(await shim.fsDriver().fileAtPath(path));
	const free = () => URL.revokeObjectURL(objectUrl);

	try {
		image.src = objectUrl;
		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = (event) => reject(new Error(`Error loading: ${event}`));
			image.onabort = (event) => reject(new Error(`Loading cancelled: ${event}`));
		});
	} finally {
		free();
	}

	return {
		image,
		free,
	};
};

export default fileToImage;
