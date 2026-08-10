const resourceRegex = /^(joplin:\/\/|:\/)([0-9a-zA-Z]{32})(|#[^\s]*)(|\s".*?")$/;

export const urlDecode = (string: string): string => {
	return decodeURIComponent((`${string}`).replace(/\+/g, '%20'));
};

export const isResourceUrl = (url: string): boolean => {
	return !!url.match(resourceRegex);
};

export interface ParsedResourceUrl {
	itemId: string;
	hash: string;
}

export const parseResourceUrl = (url: string): ParsedResourceUrl | null => {
	if (!isResourceUrl(url)) return null;

	const match = url.match(resourceRegex);

	const itemId = match[2];
	let hash = match[3].trim();

	// In general we want the hash to be decoded so that non-alphabetical languages
	// appear as-is without being encoded with %.
	// Fixes https://github.com/laurent22/joplin/issues/1870
	if (hash) hash = urlDecode(hash.substr(1)); // Remove the first #

	return {
		itemId: itemId,
		hash: hash,
	};
};
