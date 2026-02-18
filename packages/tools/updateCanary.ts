import { execFileSync } from 'child_process';
import { writeFile, remove } from 'fs-extra';
import { dirname, join } from 'path';
import { createInterface, Interface as ReadlineInterface } from 'readline';

const rootDir = dirname(dirname(__dirname));
const canaryFile = join(rootDir, 'readme', 'canary.txt');

function formatDate(date: Date): string {
	const day = date.getUTCDate();
	const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
	const year = date.getUTCFullYear();
	return `${day} ${month} ${year}`;
}

function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setUTCDate(result.getUTCDate() + days);
	return result;
}

function prompt(rl: ReadlineInterface, question: string): Promise<string> {
	return new Promise(resolve => {
		rl.question(question, answer => resolve(answer));
	});
}

async function promptNonEmpty(rl: ReadlineInterface, question: string): Promise<string> {
	while (true) {
		const answer = (await prompt(rl, question)).trim();
		if (answer) return answer;
		console.log('This field cannot be empty. Please try again.');
	}
}

function buildCanaryContent(statementDate: Date, headline1: string, headline2: string): string {
	const validUntil = addDays(statementDate, 60);
	return `Joplin Warrant Canary

Statement date: ${formatDate(statementDate)}
Valid until: ${formatDate(validUntil)}

This warrant canary is updated every 60 days.
If this document has not been updated within 75 days of the
Statement date above, it should be considered expired.

As of the Statement date:

* No National Security Letters have been received by the project or its maintainer.
* No orders under the USA PATRIOT Act or the Foreign Intelligence Surveillance Act have been received by the project or its maintainer.
* No government request accompanied by a gag order has been received by the project or its maintainer.
* No government agency or law enforcement body has required the introduction of backdoors into Joplin software, infrastructure, or services.
* No government agency or law enforcement body has compelled the project or its maintainer to provide access to user data, servers, or infrastructure associated with Joplin.

If any such order is received, and we are legally permitted to do so,
this statement will be updated accordingly. If we are not legally
permitted to disclose the existence of such an order, this statement
will not be updated.

The public key is available at:

https://github.com/laurent22/joplin/raw/dev/Assets/keys/joplin-canary-signing-key.asc

To prevent backdating, this statement includes current public events:

Current international events:

1. ${headline1}
2. ${headline2}

Canary signing key fingerprint:

F820 F830 6DD0 05A1 02D1  8CD5 946A E9FA 5915 EF53
`;
}

async function main() {
	const rl = createInterface({ input: process.stdin, output: process.stdout });

	try {
		console.log('Enter the current international event headlines to include in the canary.\n');
		const headline1 = await promptNonEmpty(rl, 'Headline 1: ');
		const headline2 = await promptNonEmpty(rl, 'Headline 2: ');

		const statementDate = new Date();
		const content = buildCanaryContent(statementDate, headline1, headline2);

		const tmpFile = `${canaryFile}.tmp`;
		await writeFile(tmpFile, content, 'utf8');
		execFileSync(
			'gpg',
			[
				'--yes',
				'--armor',
				'--clearsign',
				'--local-user',
				'canary@joplinapp.org',
				'--output',
				canaryFile,
				tmpFile,
			],
			{ stdio: 'inherit' },
		);
		await remove(tmpFile);

		console.log(`Updated: ${canaryFile}`);
	} finally {
		rl.close();
	}
}

main().catch(error => {
	console.error(error.message || error);
	process.exit(1);
});
