// This script generates a permanent archive of Contributor Licence Agreement (CLA) signatures for
// the Joplin project. It reads a list of signed contributors, retrieves the associated pull request
// and its comments from GitHub, and saves them as JSON files. This ensures a verifiable record is
// preserved even if the original pull request or comments are later deleted. It validates that each
// CLA comment was made by the correct contributor.

import { getRootDir } from '@joplin/utils';
import { githubOauthToken } from './tool-utils';
import { mkdirp, pathExists } from 'fs-extra';
import { readdir, readFile, writeFile } from 'fs/promises';

interface Issue {
	user: {
		id: number;
		login: string;
	};
	pull_request: {
		merged_at: string|null;
	};
	number: number;
}

interface IssueComment {
	user: {
		id: number;
		login: string;
	};
	body: string;
}

interface SignedContributor {
	name: string;
	id: number;
	comment_id: number;
	created_at: string;
	repoId: number;
	pullRequestNo: number;
}

const signature = 'I have read the CLA Document and I hereby sign the CLA';

const getSignedContributors = async () => {
	const filePath = `${await getRootDir()}/readme/cla/signatures.json`;
	const content = await readFile(filePath, 'utf-8');
	return JSON.parse(content).signedContributors as SignedContributor[];
};

const runRequest = async (path: string) => {
	const oauthToken = await githubOauthToken();

	const url = `https://api.github.com/repos/laurent22/joplin/${path}`;

	const headers = {
		'Authorization': `token ${oauthToken}`,
		'Accept': 'application/vnd.github.v3+json',
	};

	const response = await fetch(url, { headers });
	if (!response.ok) throw new Error(`Error: ${path}: ${await response.text()}`);

	return response.json();
};

const getIssue = async (issueNumber: number) => {
	return (await runRequest(`issues/${issueNumber}`)) as Issue;
};

const getIssueComments = async (issueNumber: number) => {
	return (await runRequest(`issues/${issueNumber}/comments`)) as IssueComment[];
};

const validateComments = (comments: IssueComment[], expectedClaAuthorId: number) => {
	const okSignatures = [
		signature,
		`${signature}.`,
	];
	for (const comment of comments) {
		if (okSignatures.includes(comment.body.trim())) {
			if (comment.user.id === expectedClaAuthorId) return true;
		}
	}

	return false;
};

const findDuplicates = (array: (string|number|symbol)[])=> {
	const counts: Record<string|number|symbol, number> = {};
	const dupes = [];

	for (const item of array) {
		counts[item] = (counts[item] || 0) + 1;
		if (counts[item] === 2) {
			dupes.push(item);
		}
	}

	return dupes;
};

const main = async () => {
	console.info('⚠️ To generate an accurate record, remember to merge the cla_signatures branch into dev first ⚠️');

	const consentRecordsDir = `${await getRootDir()}/readme/cla/consent_records`;
	await mkdirp(consentRecordsDir);

	// Issues that are referenced in the signatures.json file but that do not contain a
	// signature. In that case, the pull request should not have been merged.
	const excludedIssueIds = [
		7785, // Not merged
		8531, // Not merged
		11567, // Changed year on license file: https://github.com/laurent22/joplin/commit/2b43a9a4d667fe6b81bc97b66e0b3700688ec3cf
		13790, // Manually added for Linkosed
	];

	const signedContributors = await getSignedContributors();

	for (const signedContributor of signedContributors) {
		if (excludedIssueIds.includes(signedContributor.pullRequestNo)) continue;

		const filePath = `${consentRecordsDir}/${signedContributor.name}_${signedContributor.id}.json`;
		if (await pathExists(filePath)) continue;

		const issue = await getIssue(signedContributor.pullRequestNo);
		const comments = await getIssueComments(issue.number);
		const ok = validateComments(comments, issue.user.id);

		if (!ok) throw new Error(`Could not find the signature on PR ${issue.number}`);

		console.info(`Creating: ${filePath}`);
		await writeFile(filePath, JSON.stringify({ issue, comments }, null, '\t'));
	}

	const files = await readdir(consentRecordsDir);
	const contributorCount = signedContributors.length - excludedIssueIds.length;

	if (files.length !== contributorCount) {
		const notOk = [];

		for (const contributor of signedContributors) {
			let found = false;
			for (const file of files) {
				if (file.startsWith(contributor.name)) {
					found = true;
					break;
				}
			}

			if (!found) {
				if (!excludedIssueIds.includes(contributor.pullRequestNo)) {
					notOk.push(contributor);
				}
			}
		}

		if (notOk.length) {
			console.info('In signatures.json but not in archived issues:', notOk);
		}

		const userIds = signedContributors.map(s => s.id);
		const duplicates = findDuplicates(userIds);

		if (duplicates.length) {
			console.info('Duplicate user Ids in signatures.json:', duplicates);
		}

		throw new Error(`‼️ Found ${contributorCount} contributors in signatures.json but ${files.length} archived issues.`);
	} else {
		console.info(`👍 Found ${contributorCount} contributors in signatures.json and ${files.length} archived issues.`);
	}
};

if (require.main === module) {
	// eslint-disable-next-line promise/prefer-await-to-then
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
