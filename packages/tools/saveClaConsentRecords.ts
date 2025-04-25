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
	if (!response.ok) throw new Error(`Error fetching issue: ${await response.text()}`);

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

const main = async () => {
	const consentRecordsDir = `${await getRootDir()}/readme/cla/consent_records`;
	await mkdirp(consentRecordsDir);

	// Issues that are referenced in the signatures.json file but that do not contain a
	// signature. In that case, the pull request should not have been merged.
	const excludedIssueIds = [
		7785, // Not merged
		8531, // Not merged
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
