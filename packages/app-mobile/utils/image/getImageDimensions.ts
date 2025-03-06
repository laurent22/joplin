import { Size } from '@joplin/utils/types';
import { fileUriToPath } from '@joplin/utils/url';
import { Image as NativeImage, Platform } from 'react-native';
import fileToImage from './fileToImage.web';


const getImageDimensions = async (uri: string): Promise<Size> => {
	if (uri.startsWith('/')) {
		uri = `file://${uri}`;
	}

	// On web, image files are stored using the Origin Private File System and need special
	// handling.
	const isFileUrl = uri.startsWith('file://');
	if (Platform.OS === 'web' && isFileUrl) {
		const path = isFileUrl ? fileUriToPath(uri) : uri;
		const image = await fileToImage(path);
		const size = { width: image.image.width, height: image.image.height };
		image.free();
		return size;
	}

	return new Promise((resolve, reject) => {
		NativeImage.getSize(
			uri,
			(width: number, height: number) => {
				resolve({ width: width, height: height });
			},
			(error: unknown) => {
				reject(error);
			},
		);
	});
};

export default getImageDimensions;
