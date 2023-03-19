const quotePath = (path: string) => {
	if (!path) return '';
	if (path.indexOf('"') < 0 && path.indexOf(' ') < 0) return path;
	path = path.replace(/"/, '\\"');
	return `"${path}"`;
};

export default (commandName: string, args: string[] = []) => {
	const output = [quotePath(commandName)];

	for (const arg of args) {
		output.push(quotePath(arg));
	}

	return output.join(' ').trim();
};
