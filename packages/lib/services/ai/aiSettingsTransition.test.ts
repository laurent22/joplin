import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import Setting from '../../models/Setting';
import shim from '../../shim';
import aiSettingsTransition from './aiSettingsTransition';

describe('aiSettingsTransition', () => {

	let confirmAnswer = true;
	let confirmCalls: string[] = [];
	let originalConfirm: typeof shim.showConfirmationDialog;

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		confirmAnswer = true;
		confirmCalls = [];
		originalConfirm = shim.showConfirmationDialog;
		shim.showConfirmationDialog = async (message: string) => {
			confirmCalls.push(message);
			return confirmAnswer;
		};
	});

	afterEach(() => {
		shim.showConfirmationDialog = originalConfirm;
	});

	it('marks providerType as configured when the user changes a provider field', async () => {
		Setting.setValue('ai.enabled', true);
		Setting.setValue('ai.allowRemote', true);
		Setting.setValue('ai.chat.providerType', 'openai-compatible');
		Setting.setValue('ai.chat.providerType.configured', false);

		const pending: { changedKeys: string[]; settings: Record<string, unknown> } = {
			changedKeys: ['ai.chat.providerType'],
			settings: { 'ai.chat.providerType': 'anthropic', 'ai.chat.apiKey': 'sk-x' },
		};
		const ok = await aiSettingsTransition(pending);
		expect(ok).toBe(true);
		expect(pending.settings['ai.chat.providerType.configured']).toBe(true);
		expect(pending.changedKeys).toContain('ai.chat.providerType.configured');
	});

	it('prompts the user when flipping to a remote provider', async () => {
		Setting.setValue('ai.enabled', true);
		Setting.setValue('ai.allowRemote', true);
		Setting.setValue('ai.chat.providerType', 'openai-compatible');
		Setting.setValue('ai.chat.baseUrl', 'http://localhost:11434/v1');

		const pending = {
			changedKeys: ['ai.chat.baseUrl'],
			settings: {
				'ai.chat.providerType': 'openai-compatible',
				'ai.chat.baseUrl': 'https://api.openai.com/v1',
			},
		};
		const ok = await aiSettingsTransition(pending);
		expect(ok).toBe(true);
		expect(confirmCalls.length).toBe(1);
		expect(confirmCalls[0]).toContain('api.openai.com');
	});

	it('aborts when the user declines the remote-flip confirmation', async () => {
		Setting.setValue('ai.enabled', true);
		Setting.setValue('ai.allowRemote', true);
		Setting.setValue('ai.chat.providerType', 'openai-compatible');
		Setting.setValue('ai.chat.baseUrl', 'http://localhost:11434/v1');

		confirmAnswer = false;

		const pending = {
			changedKeys: ['ai.chat.providerType'],
			settings: { 'ai.chat.providerType': 'anthropic' as const, 'ai.chat.apiKey': 'sk-x' },
		};
		const ok = await aiSettingsTransition(pending);
		expect(ok).toBe(false);
	});

	it('does not prompt when AI is disabled', async () => {
		Setting.setValue('ai.enabled', false);
		Setting.setValue('ai.allowRemote', false);
		Setting.setValue('ai.chat.providerType', 'openai-compatible');
		Setting.setValue('ai.chat.baseUrl', 'http://localhost:11434/v1');

		const pending = {
			changedKeys: ['ai.chat.providerType'],
			settings: { 'ai.chat.providerType': 'anthropic' as const },
		};
		const ok = await aiSettingsTransition(pending);
		expect(ok).toBe(true);
		expect(confirmCalls.length).toBe(0);
	});

	it('uses Joplin-Cloud-specific copy when switching to joplin-cloud', async () => {
		Setting.setValue('ai.enabled', true);
		Setting.setValue('ai.allowRemote', true);
		Setting.setValue('ai.chat.providerType', 'openai-compatible');
		Setting.setValue('ai.chat.baseUrl', 'http://localhost:11434/v1');

		const pending = {
			changedKeys: ['ai.chat.providerType'],
			settings: { 'ai.chat.providerType': 'joplin-cloud' as const },
		};
		const ok = await aiSettingsTransition(pending);
		expect(ok).toBe(true);
		expect(confirmCalls[0]).toContain('Joplin Cloud');
	});
});
