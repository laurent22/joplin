const normalizeHeadingForHash = (headingText: string): string => {
	return headingText.replace(/^\[(?: |x|X)\]\s+/, '');
};

export default normalizeHeadingForHash;
