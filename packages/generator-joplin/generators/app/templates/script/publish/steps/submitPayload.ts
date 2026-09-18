import { authenticate, clearCachedToken } from './authenticate';
import logger from '../utils/logger';

interface GitHubIssueResponse {
	html_url: string;
	number: number;
}

export interface PluginMetadata {
	name: string;
	version: string;
	repositoryUrl: string;
}

const registryRepo = 'joplin/plugins-test';
const submissionTimeoutMs = 30_000;

const createSubmissionIssue = async (issueTitle: string, issueBody: string, token: string) => {
	return await fetch(`https://api.github.com/repos/${registryRepo}/issues`, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${token}`,
			'Accept': 'application/vnd.github.v3+json',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			title: issueTitle,
			body: issueBody,
		}),
		signal: AbortSignal.timeout(submissionTimeoutMs),
	});
};

// Creates an issue on the joplin/plugins-test repository for the plugin submission
const submitPayload = async (metadata: PluginMetadata, commitHash: string, token: string) => {
	const issueTitle = `[Plugin Submission] ${metadata.name} v${metadata.version}`;
	const payload = {
		plugin_name: metadata.name,
		version: metadata.version,
		repository_url: metadata.repositoryUrl,
		commit_hash: commitHash,
	};
	const issueBody = `\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;

	logger.info('Submitting to Joplin registry...');

	let response = await createSubmissionIssue(issueTitle, issueBody, token);

	if (response.status === 401) {
		logger.warn('Cached GitHub credentials are no longer valid. Re-authenticating...');
		await clearCachedToken();
		const refreshedToken = await authenticate();
		response = await createSubmissionIssue(issueTitle, issueBody, refreshedToken);
	}

	// If the issue is not created show the response message and status on terminal
	if (response.status !== 201) {
		const errorBody = await response.text();
		logger.error(`Status: ${response.status}`);
		logger.error(`Response: ${errorBody}`);
		throw new Error('Submission failed. See the error above.');
	}

	const issue = await response.json() as GitHubIssueResponse;

	logger.success('------ Submission Successful! ------');
	logger.info(`Track your submission here:\n${issue.html_url}`);
	logger.info('Your plugin will appear in the registry once a maintainer approves it.');
};

export default submitPayload;
