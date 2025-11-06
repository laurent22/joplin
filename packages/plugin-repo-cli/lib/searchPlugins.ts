import { URLSearchParams } from 'node:url';

export interface PackageInfo {
	name: string;
	version: string;
	date: string;
	keywords: string[];
}

interface SearchResult {
	package: PackageInfo;
}

interface SearchResponse {
	objects: SearchResult[];
	total: number;
}

function validateResponse(response: unknown): asserts response is SearchResponse {
	if (typeof response !== 'object') throw new Error('Invalid response (must be an object)');
	if (!('total' in response) || typeof response.total !== 'number') {
		throw new Error('Invalid response.total');
	}
	if (!('objects' in response) || !Array.isArray(response.objects)) {
		throw new Error('response.objects must be an array');
	}
	for (const object of response.objects) {
		if (!('package' in object)) throw new Error('Missing "package" field');
		const packageField = object.package;
		if (typeof packageField.name !== 'string') throw new Error('package.name: Invalid type');
		if (typeof packageField.version !== 'string') throw new Error('package.version: Invalid type');
		if (typeof packageField.date !== 'string') throw new Error('package.date: Invalid type');
		if (!Array.isArray(packageField.keywords)) throw new Error('package.keywords: Invalid type');
	}
}

const searchPlugins = async () => {
	const pageSize = 100;
	const makeRequest = async (start: number): Promise<SearchResponse> => {
		const urlParams = new URLSearchParams({
			text: 'keywords:joplin-plugin',
			size: String(pageSize),
			from: String(start),
		});
		// API documentation: https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md#get-v1search
		const query = `https://registry.npmjs.org/-/v1/search?${urlParams.toString()}`;
		const result = await fetch(query);
		const json: unknown = await result.json();
		validateResponse(json);
		return json;
	};

	const packageInfos: PackageInfo[] = [];
	const addPackageInfos = (response: SearchResponse) => {
		for (const object of response.objects) {
			packageInfos.push(object.package);
		}
	};

	const firstResponse = await makeRequest(0);
	let total = firstResponse.total;
	addPackageInfos(firstResponse);

	for (let page = 1; packageInfos.length < total; page++) {
		// Cap the maximum number of requests: Fail early in the case where the search query breaks
		// in the future.
		if (page >= 100) {
			throw new Error('More requests sent than expected. Does maximumRequests need to be increased?');
		}

		const response = await makeRequest(page * pageSize);
		total = response.total;
		addPackageInfos(response);
	}

	return packageInfos;
};

export default searchPlugins;
