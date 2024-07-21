import { Size } from '@joplin/utils/types';
import { Image as NativeImage } from 'react-native';

const getImageDimensions = async (uri: string): Promise<Size> => {
	if (uri.startsWith('/')) {
		uri = `file://${uri}`;
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
