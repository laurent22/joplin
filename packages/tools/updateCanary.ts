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

function ordinal(day: number): string {
	const mod100 = day % 100;
	if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
	switch (day % 10) {
	case 1: return `${day}st`;
	case 2: return `${day}nd`;
	case 3: return `${day}rd`;
	default: return `${day}th`;
	}
}

function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setUTCDate(result.getUTCDate() + days);
	return result;
}

// The canary is on a fixed bi-monthly schedule anchored to the 19th of
// even-parity months (Feb, Apr, Jun, Aug, Oct, Dec). "Valid until" is the
// next scheduled slot strictly after today, so observers know when to start
// worrying regardless of whether the signer was a few days late.
const scheduleDay = 19;
const scheduleMonthParity = 1; // 0=Jan, 1=Feb, ... — Feb/Apr/Jun/Aug/Oct/Dec.

function nextScheduledDate(today: Date): Date {
	const year = today.getUTCFullYear();
	for (let y = year; y <= year + 1; y++) {
		for (let m = 0; m < 12; m++) {
			if (m % 2 !== scheduleMonthParity) continue;
			const candidate = new Date(Date.UTC(y, m, scheduleDay));
			if (candidate.getTime() > today.getTime()) return candidate;
		}
	}
	throw new Error('Could not compute next scheduled canary date');
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
	const validUntil = nextScheduledDate(statementDate);
	const expiresAt = addDays(validUntil, 15);
	const dayOfMonth = ordinal(scheduleDay);
	return `Joplin Warrant Canary

Statement date: ${formatDate(statementDate)}
Valid until: ${formatDate(validUntil)}

This warrant canary is updated on the ${dayOfMonth} of every other month.
If this document has not been updated by ${formatDate(expiresAt)},
it should be considered expired.

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
