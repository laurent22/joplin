import authenticate from './steps/authenticate';
import submitPayload from './steps/submitPayload';
import verifyBuild from './steps/verifyBuild';
import verifyGitState from './steps/verifyGitState';
import logger from './utils/logger';

// Central command to run all the steps of the `npm run publish` flow
async function publish() {
	logger.header('Starting Joplin Plugin Publication');

	logger.step('Phase 1: Metadata & Build Verification');
	const metadata = await verifyBuild();
	logger.divider();

	logger.step('Phase 2: Git State Validation');
	const commitHash = await verifyGitState();
	logger.divider();

	logger.step('Phase 3: GitHub Authentication');
	const token = await authenticate();
	logger.divider();

	logger.step('Phase 4: Submission');
	await submitPayload(metadata, commitHash, token);
}

void publish();
