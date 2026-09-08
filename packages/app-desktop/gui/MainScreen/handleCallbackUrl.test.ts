import { utils as commandUtils } from '@joplin/lib/services/CommandService';
import executeCallbackUrl from './handleCallbackUrl';
import { withWarningSilenced } from '@joplin/lib/testing/test-utils';

const mockOpenExternal = jest.fn();

jest.mock('../../services/bridge', () => ({
	__esModule: true,
	default: () => ({
		openExternal: (url: string) => mockOpenExternal(url),
	}),
}));

const setSelectedNoteId = (noteId: string | null) => {
	// executeCallbackUrl reads the selected note id via commandUtils.store; a
	// null id makes handleGetCurrentNote take its x-error branch, which routes
	// the caller-supplied target through respond() without touching the DB.
	commandUtils.store = {
		getState: () => ({ selectedNoteIds: noteId ? [noteId] : [] }),
	};
};

describe('handleCallbackUrl', () => {
	beforeEach(() => {
		mockOpenExternal.mockClear();
		setSelectedNoteId(null);
	});

	test.each([
		'x-custom-scheme://arbitrary-scheme-reached',
		'file:///etc/passwd',
		'ms-msdt://something',
		'mailto:someone@example.com',
		'not a url',
	])('should not dispatch a callback target with a disallowed scheme (%s)', async (target) => {
		await withWarningSilenced(/Rejected malformed callback|Rejected callback target with disallowed scheme/, async () => {
			await executeCallbackUrl(`joplin://x-callback-url/getCurrentNote?x-error=${encodeURIComponent(target)}`);
		}, { requireWarning: true });
		expect(mockOpenExternal).not.toHaveBeenCalled();
	});

	test.each([
		'http://example.com/cb',
		'https://example.com/cb',
	])('should dispatch a callback target with an allowed scheme (%s)', async (target) => {
		await executeCallbackUrl(`joplin://x-callback-url/getCurrentNote?x-error=${encodeURIComponent(target)}`);
		expect(mockOpenExternal).toHaveBeenCalledTimes(1);
		expect(mockOpenExternal.mock.calls[0][0]).toContain(`${target}?`);
	});

	it('should not leak the raw error message on the error path', async () => {
		// Force a throw inside the try block so the catch path builds the response.
		commandUtils.store = {
			getState: () => { throw new Error('secret path /home/victim/.config/joplin/database.sqlite'); },
		};

		await withWarningSilenced(/Error handling callback URL command "getCurrentNote":.*secret path \/home\/victim/, async () => {
			await executeCallbackUrl(`joplin://x-callback-url/getCurrentNote?x-error=${encodeURIComponent('https://example.com/cb')}`);
		}, { requireWarning: true });

		expect(mockOpenExternal).toHaveBeenCalledTimes(1);
		const responseUrl = mockOpenExternal.mock.calls[0][0];
		expect(responseUrl).not.toContain('secret path');
		expect(responseUrl).not.toContain('database.sqlite');
		expect(new URL(responseUrl).searchParams.get('errorMessage')).toBe('The command could not be completed');
	});
});
