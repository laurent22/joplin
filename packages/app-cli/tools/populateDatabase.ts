// This script can be used to simulate a running production environment, by
// having multiple users in parallel changing notes and synchronising.
//
// To get it working:
//
// - Run the Postgres database -- `sudo docker-compose --file docker-compose.db-dev.yml up`
// - Update the DB parameters in ~/joplin-credentials/server.env to use the dev
//   database
// - Run the server - `JOPLIN_IS_TESTING=1 yarn run start-dev`
// - Then run this script - `node populateDatabase.js`
//
// Currently it doesn't actually create the users, so that should be done using:
//
// curl --data '{"action": "createTestUsers", "count": 400, "fromNum": 1}' -H 'Content-Type: application/json' http://api.joplincloud.local:22300/api/debug
//
// That will create n users with email `user<n>@example.com`

import * as fs from 'fs-extra';
import { homedir } from 'os';
import { execCommand2 } from '@joplin/tools/tool-utils';
import { chdir } from 'process';

const minUserNum = 1;
const maxUserNum = 400;

const cliDir = `${__dirname}/..`;
const tempDir = `${__dirname}/temp`;

function randomInt(min: number, max: number) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

const processing_: Record<number, boolean> = {};

const processUser = async (userNum: number) => {
	if (processing_[userNum]) {
		console.info(`User already being processed: ${userNum} - skipping`);
		return;
	}

	processing_[userNum] = true;

	try {
		const userEmail = `user${userNum}@example.com`;
		const userPassword = '111111';
		const commandFile = `${tempDir}/populateDatabase-${userNum}.txt`;
		const profileDir = `${homedir()}/.config/joplindev-populate/joplindev-testing-${userNum}`;

		const commands: string[] = [];
		const jackpot = Math.random() >= 0.95 ? 100 : 1;

		commands.push(`testing createRandomNotes ${randomInt(1, 500 * jackpot)}`);
		commands.push(`testing updateRandomNotes ${randomInt(1, 1500 * jackpot)}`);
		commands.push(`testing deleteRandomNotes ${randomInt(1, 200 * jackpot)}`);
		commands.push('config keychain.supported 0');
		commands.push('config sync.target 10');
		commands.push(`config sync.10.username ${userEmail}`);
		commands.push(`config sync.10.password ${userPassword}`);
		commands.push('sync');

		await fs.writeFile(commandFile, commands.join('\n'), 'utf8');

		await chdir(cliDir);

		await execCommand2(['yarn', 'run', 'start-no-build', '--', '--profile', profileDir, 'batch', commandFile]);
	} catch (error) {
		console.error(`Could not process user ${userNum}:`, error);
	} finally {
		delete processing_[userNum];
	}
};

const waitForProcessing = (count: number) => {
	return new Promise((resolve) => {
		const iid = setInterval(() => {
			if (Object.keys(processing_).length <= count) {
				clearInterval(iid);
				resolve(null);
			}
		}, 100);
	});
};

const main = async () => {
	await fs.mkdirp(tempDir);

	// Build the app once before starting, because we'll use start-no-build to
	// run the scripts (faster)
	await execCommand2(['yarn', 'run', 'build']);

	const focusUserNum = 0;

	while (true) {
		let userNum = randomInt(minUserNum, maxUserNum);

		if (focusUserNum && Math.random() >= .7) userNum = focusUserNum;

		void processUser(userNum);
		await waitForProcessing(10);
	}
};

main().catch((error) => {
	console.error('Fatal error', error);
	process.exit(1);
});
