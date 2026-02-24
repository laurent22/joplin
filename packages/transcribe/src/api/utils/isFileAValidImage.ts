import { fromFile } from 'file-type';

export const supportedImageFormat = ['image/png', 'image/jpeg', 'image/bmp'];

const isFileAValidImage = async (filepath: string): Promise<[boolean, string]> => {
	const result = await fromFile(filepath);

	if (!result || !result.mime) {
		return [false, 'unknown'];
	}

	const isValid = supportedImageFormat.includes(result.mime);
	return [isValid, result.mime];
};

export default isFileAValidImage;
