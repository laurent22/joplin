import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import Setting from '../../models/Setting';
import aiSettingsTransition from './aiSettingsTransition';

describe('aiSettingsTransition', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
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
		aiSettingsTransition(pending);
		expect(pending.settings['ai.chat.providerType.configured']).toBe(true);
		expect(pending.changedKeys).toContain('ai.chat.providerType.configured');
	});

	it('resets token usage counters when the active endpoint changes', async () => {
		Setting.setValue('ai.enabled', true);
		Setting.setValue('ai.allowRemote', true);
		Setting.setValue('ai.chat.providerType', 'openai-compatible');
		Setting.setValue('ai.chat.baseUrl', 'https://api.openai.com/v1');
		Setting.setValue('ai.usage.inputTokens', 1234);
		Setting.setValue('ai.usage.outputTokens', 5678);

		const pending: { changedKeys: string[]; settings: Record<string, unknown> } = {
			changedKeys: ['ai.chat.baseUrl'],
			settings: {
				'ai.chat.providerType': 'openai-compatible',
				'ai.chat.baseUrl': 'https://api.mistral.ai/v1',
			},
		};
		aiSettingsTransition(pending);
		expect(pending.settings['ai.usage.inputTokens']).toBe(0);
		expect(pending.settings['ai.usage.outputTokens']).toBe(0);
	});

	it('does not reset counters when only the API key changes', async () => {
		Setting.setValue('ai.enabled', true);
		Setting.setValue('ai.allowRemote', true);
		Setting.setValue('ai.chat.providerType', 'anthropic');
		Setting.setValue('ai.chat.baseUrl', '');
		Setting.setValue('ai.usage.inputTokens', 1234);

		const pending: { changedKeys: string[]; settings: Record<string, unknown> } = {
			changedKeys: ['ai.chat.apiKey'],
			settings: {
				'ai.chat.providerType': 'anthropic',
				'ai.chat.baseUrl': '',
				'ai.chat.apiKey': 'new-key',
			},
		};
		aiSettingsTransition(pending);
		expect(pending.settings['ai.usage.inputTokens']).toBeUndefined();
	});
});
