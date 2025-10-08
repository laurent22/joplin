import { randomBytes } from 'crypto';

const createFilename = () => {
	const time = new Date().getTime();
	const random = randomBytes(16).toString('hex');
	return `${time}_${random}`;
};

export default createFilename;
