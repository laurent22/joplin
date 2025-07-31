const readFileToBase64 = (file: Blob) => {
	const reader = new FileReader();
	return new Promise<string>((resolve, reject) => {
		reader.onload = async () => {
			const dataUrl = reader.result as string;
			const base64 = dataUrl.replace(/^data:.*;base64,/, '');
			resolve(base64);
		};
		reader.onerror = () => reject(new Error('Failed to load file.'));

		reader.readAsDataURL(file);
	});
};

export default readFileToBase64;
