// eslint-disable-next-line import/prefer-default-export
export const bytesToHuman = (bytes: number) => {
	const units = ['Bytes', 'KB', 'MB', 'GB'];
	let unitIndex = 0;

	while (bytes >= 1024 && unitIndex < units.length - 1) {
		bytes /= 1024;
		unitIndex++;
	}

	return `${bytes.toFixed(1)} ${units[unitIndex]}`;
};
