import { fromFile } from 'file-type';

export const supportedImageFormat = ['image/png', 'image/jpeg', 'image/bmp'];

const isFileAValidImage = async (filepath: string) => {
	const result = await fromFile(filepath);

	if (!result || !result.mime) {
		return [false, 'unknown'];
	}

	return [supportedImageFormat.includes(result.mime), result.mime];
};

export default isFileAValidImage;
