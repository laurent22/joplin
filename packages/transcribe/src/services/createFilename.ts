import { randomBytes } from 'crypto';

const createFilename = (extension = '') => {
	const time = new Date().getTime();
	const random = randomBytes(16).toString('hex');
	const ext = extension ? `.${extension.replace(/^\./, '')}` : '';
	return `${time}_${random}${ext}`;
};

export default createFilename;
