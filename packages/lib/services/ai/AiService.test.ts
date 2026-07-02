import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import Setting from '../../models/Setting';
import AiService from './AiService';
import deriveClassification from './classification';

describe('AiService', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		AiService.instance().invalidateProvider();
	});

	it('throws when AI is disabled', async () => {
		Setting.setValue('ai.enabled', false);
		await expect(AiService.instance().chat([{ role: 'user', content: 'hi' }]))
			.rejects.toMatchObject({ code: 'aiDisabled' });
	});

	it('throws when remote provider is selected but allowRemote is off', async () => {
		Setting.setValue('ai.enabled', true);
		Setting.setValue('ai.allowRemote', false);
		Setting.setValue('ai.chat.providerType', 'anthropic');
		Setting.setValue('ai.chat.apiKey', 'sk-test');
		Setting.setValue('ai.chat.model', 'claude-3-5-sonnet-latest');

		await expect(AiService.instance().chat([{ role: 'user', content: 'hi' }]))
			.rejects.toMatchObject({ code: 'aiRemoteNotAllowed' });
	});

	it('classifies localhost openai-compatible as local', () => {
		expect(deriveClassification('openai-compatible', 'http://localhost:11434/v1')).toBe('local');
		expect(deriveClassification('openai-compatible', 'http://127.0.0.1:11434/v1')).toBe('local');
	});

	it('classifies LAN openai-compatible as remote', () => {
		expect(deriveClassification('openai-compatible', 'http://192.168.1.50:11434/v1')).toBe('remote');
	});

	it('classifies anthropic and joplin-cloud as remote regardless of baseUrl', () => {
		expect(deriveClassification('anthropic', '')).toBe('remote');
		expect(deriveClassification('joplin-cloud', '')).toBe('remote');
	});

	it('writes joplin-cloud default on first ai.enabled if sync target is Joplin Cloud', () => {
		Setting.setValue('sync.target', 10);
		Setting.setValue('ai.chat.providerType.configured', false);
		Setting.setValue('ai.chat.providerType', 'openai-compatible');

		AiService.instance().applyFirstEnableDefault();

		expect(Setting.value('ai.chat.providerType')).toBe('joplin-cloud');
		expect(Setting.value('ai.chat.providerType.configured')).toBe(true);
	});

	it('does not touch providerType on first enable when not on Joplin Cloud', () => {
		Setting.setValue('sync.target', 7);
		Setting.setValue('ai.chat.providerType.configured', false);
		Setting.setValue('ai.chat.providerType', 'openai-compatible');

		AiService.instance().applyFirstEnableDefault();

		expect(Setting.value('ai.chat.providerType')).toBe('openai-compatible');
		expect(Setting.value('ai.chat.providerType.configured')).toBe(true);
	});

	it('does not overwrite an explicit provider choice on subsequent enable', () => {
		Setting.setValue('sync.target', 10);
		Setting.setValue('ai.chat.providerType.configured', true);
		Setting.setValue('ai.chat.providerType', 'anthropic');

		AiService.instance().applyFirstEnableDefault();

		expect(Setting.value('ai.chat.providerType')).toBe('anthropic');
	});
});
