// Validates the PR title and acts on the result.
//
// - Renovate is filtered out at the workflow level (job `if:`).
// - Translation-only PRs (every changed file is a .po) are skipped.
// - Users in `softCheckUsers` get a relaxed check (issue number optional)
//   and only ever receive a comment, never a close.
// - Everyone else must match the strict format. Invalid titles get a
//   comment and the PR is closed. We also apply a marker label so that
//   we can later tell our closures apart from any other closure.
// - If the title becomes valid and the marker label is present, the PR
//   is reopened and the label is removed. Closures by humans (or by
//   another workflow) lack the label and are never overturned.
//
// Invoked from .github/workflows/check-pr-title.yml via actions/github-script.
// Required inputs come from `env`: PR_AUTHOR, PR_NUMBER. The title is
// fetched from the API rather than passed via env to avoid YAML expansion
// silently stripping leading whitespace from `${{ ... }}`.

module.exports = async ({ github, context, core }) => {
	const softCheckUsers = ['laurent22', 'personalizedrefrigerator', 'mrjo118', 'tessus', 'CalebJohn', 'Rygaa'];
	const autoClosedLabel = 'auto-closed: invalid-title';

	const prefix = '(Desktop|Mobile|All|Cli|Tools|Chore|Clipper|Server|Android|iOS|Plugins|CI|Plugin Repo|Doc)';
	const prefixList = `${prefix}(,\\s*${prefix})*`;
	const strictRegex = new RegExp(`^${prefixList}: (Fixes|Resolves) #[0-9]+: .+`);
	const softRegex = new RegExp(`^${prefixList}: ((Fixes|Resolves) #[0-9]+: )?.+`);

	const author = process.env.PR_AUTHOR;
	const prNumber = Number(process.env.PR_NUMBER);

	const { data: pr } = await github.rest.pulls.get({
		owner: context.repo.owner,
		repo: context.repo.repo,
		pull_number: prNumber,
	});
	const title = pr.title;
	core.info(`Title (length=${title.length}): ${JSON.stringify(title)}`);

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

		// If we previously closed this PR for an invalid title and the
		// title is now valid, reopen it. We only reopen if our marker
		// label is present, so closures by humans (or other workflows)
		// are never overturned. A maintainer can also remove the label
		// by hand to lock a PR closed regardless of future fixes.
		const wasAutoClosed = pr.state === 'closed' && pr.labels.some(l => l.name === autoClosedLabel);
		if (wasAutoClosed) {
			try {
				await github.rest.pulls.update({
					owner: context.repo.owner,
					repo: context.repo.repo,
					pull_number: prNumber,
					state: 'open',
				});
			} catch (error) {
				// GitHub refuses to reopen a PR when another open PR
				// already exists from the same head→base branch pair.
				// In that case the contributor has already opened a
				// replacement, so leave this PR closed.
				if (error.status === 422) {
					core.info('Cannot reopen — another PR is already open from the same branch.');
					return;
				}
				throw error;
			}
			await github.rest.issues.removeLabel({
				owner: context.repo.owner,
				repo: context.repo.repo,
				issue_number: prNumber,
				name: autoClosedLabel,
			});
			await github.rest.issues.createComment({
				owner: context.repo.owner,
				repo: context.repo.repo,
				issue_number: prNumber,
				body: `@${author} thanks for fixing the title — this PR has been reopened.`,
			});
			core.info('PR reopened after title was fixed.');
		}
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
			: '_This PR has been closed automatically. Once you update the title to match the format above, the PR will be reopened automatically._',
	].join('\n');

	await github.rest.issues.createComment({
		owner: context.repo.owner,
		repo: context.repo.repo,
		issue_number: prNumber,
		body: helpMessage,
	});

	if (!isSoft) {
		// Label first so the marker is set before the close event lands.
		await github.rest.issues.addLabels({
			owner: context.repo.owner,
			repo: context.repo.repo,
			issue_number: prNumber,
			labels: [autoClosedLabel],
		});
		await github.rest.pulls.update({
			owner: context.repo.owner,
			repo: context.repo.repo,
			pull_number: prNumber,
			state: 'closed',
		});
	}

	core.setFailed('Pull request title does not match the required format.');
};
