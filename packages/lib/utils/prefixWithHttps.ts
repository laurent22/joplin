const prefixWithHttps = (url: string) => {
	if (!url.startsWith('http://') && !url.startsWith('https://')) {
		return `https://${url}`;
	} else {
		return url;
	}
};

export default prefixWithHttps;
