
type OnNextRandom = (lowInclusive: number, highExclusive: number)=> number;

const randomId = (nextRandomInteger: OnNextRandom)=> () => {
	const bytes = [];
	for (let i = 0; i < 16; i++) {
		bytes.push(nextRandomInteger(0, 256));
	}

	return Buffer.from(bytes)
		.toString('hex')
		.toLowerCase()
		.padStart(32, '0');
};

export default randomId;
