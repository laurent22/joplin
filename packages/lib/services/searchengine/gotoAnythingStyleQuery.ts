export default (query: string) => {
	if (!query) return '';

	const output = [];
	const splitted = query.split(' ');

	for (let i = 0; i < splitted.length; i++) {
		const s = splitted[i].trim();
		if (!s) continue;
		output.push(`${s}*`);
	}

	return output.join(' ');
};
