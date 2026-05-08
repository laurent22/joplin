// Validates the PR title and acts on the result.
//
// - Renovate is filtered out at the workflow level (job `if:`).
// - Translation-only PRs (every changed file is a .po) are skipped.
// - Users in `softCheckUsers` get a relaxed check (issue number optional)
//   and only ever receive a comment, never a close.
// - Everyone else must match the strict format. Invalid titles get a
//   comment and the PR is closed.
//
// Invoked from .github/workflows/check-pr-title.yml via actions/github-script.
// Required inputs come from `env`: PR_AUTHOR, PR_NUMBER, PR_TITLE.

module.exports = async ({ github, context, core }) => {
	const softCheckUsers = ['laurent22', 'personalizedrefrigerator', 'mrjo118', 'tessus', 'CalebJohn', 'Rygaa'];

	const prefix = '(Desktop|Mobile|All|Cli|Tools|Chore|Clipper|Server|Android|iOS|Plugins|CI|Plugin Repo|Doc)';
	const prefixList = `${prefix}(,\\s*${prefix})*`;
	const strictRegex = new RegExp(`^${prefixList}: (Fixes|Resolves) #[0-9]+: .+`);
	const softRegex = new RegExp(`^${prefixList}: ((Fixes|Resolves) #[0-9]+: )?.+`);

	const author = process.env.PR_AUTHOR;
	const prNumber = Number(process.env.PR_NUMBER);
	const title = process.env.PR_TITLE;
	const isSoft = softCheckUsers.includes(author);

	// listFiles returns up to 30 files per page; a pure translation PR is
	// small, so checking the first page is enough.
	const { data: files } = await github.rest.pulls.listFiles({
		owner: context.repo.owner,
		repo: context.repo.repo,
		pull_number: prNumber,
	});
	const isTranslationOnly = files.length > 0 && files.every(f => f.filename.endsWith('.po'));
	if (isTranslationOnly) {
		core.info('Translation-only PR — skipping title check.');
		return;
	}

	// Doc-only PRs do not require an issue number.
	const isDocOnly = /^Doc(,\s*Doc)*:/.test(title);
	const regex = isSoft || isDocOnly ? softRegex : strictRegex;
	if (regex.test(title)) {
		core.info('Title is valid.');
		return;
	}

	const helpMessage = [
		`@${author} the pull request title does not match the required format.`,
		'',
		'Please prefix the title with the area you are targeting, then add the issue you are addressing. For example:',
		'',
		'- `Desktop: Resolves #123: Added new setting to change font`',
		'- `Mobile, Desktop: Fixes #456: Fixed config screen error`',
		'- `All: Resolves #777: Made synchronisation faster`',
		'',
		'See the [pull request template](https://github.com/laurent22/joplin/blob/dev/.github/PULL_REQUEST_TEMPLATE) for the list of valid prefixes and the full specification.',
		'',
		isSoft
			? '_This PR has been left open — please update the title when you have a moment._'
			: '_This PR has been closed automatically. Please update the title and reopen it, or open a new pull request._',
	].join('\n');

	await github.rest.issues.createComment({
		owner: context.repo.owner,
		repo: context.repo.repo,
		issue_number: prNumber,
		body: helpMessage,
	});

	if (!isSoft) {
		await github.rest.pulls.update({
			owner: context.repo.owner,
			repo: context.repo.repo,
			pull_number: prNumber,
			state: 'closed',
		});
	}

	core.setFailed('Pull request title does not match the required format.');
};
