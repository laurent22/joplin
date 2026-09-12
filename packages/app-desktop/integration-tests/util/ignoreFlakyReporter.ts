import type { Reporter, FullResult, TestCase } from '@playwright/test/reporter';

// Treats a run as successful when the only "failures" are flaky tests
// (tests that failed initially but passed on retry).
class IgnoreFlakyReporter implements Reporter {
	private hasRealFailure = false;

	public onTestEnd(test: TestCase) {
		const status = test.outcome();
		if (status === 'unexpected') {
			this.hasRealFailure = true;
		}
	}

	public async onEnd(result: FullResult) {
		if (result.status === 'failed' && !this.hasRealFailure) {
			return { status: 'passed' as const };
		}
		return undefined;
	}

	public printsToStdio() {
		return false;
	}
}

export default IgnoreFlakyReporter;
