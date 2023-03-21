import { readFile } from 'fs-extra';
import { rootDir } from '@joplin/utils';
import { fetchWithRetry } from '@joplin/utils/net';

const sponsorsPath = `${rootDir}/packages/tools/sponsors.json`;

export interface GithubSponsor {
	name: string;
	id: string;
}

export interface Sponsors {
	github: GithubSponsor[];
	orgs: OrgSponsor[];
}

export interface OrgSponsor {
	url: string;
	urlWebsite?: string;
	title: string;
	imageName: string;
}

export const loadSponsors = async (): Promise<Sponsors> => {
	const output: Sponsors = JSON.parse(await readFile(sponsorsPath, 'utf8'));

	output.orgs = output.orgs.map(o => {
		if (o.urlWebsite) o.url = o.urlWebsite;
		return o;
	});

	for (const ghSponsor of output.github) {
		const userResponse = await fetchWithRetry(`https://api.github.com/users/${ghSponsor.name}`);
		const user = await userResponse.json();
		ghSponsor.id = user.id;
	}

	return output;
};
