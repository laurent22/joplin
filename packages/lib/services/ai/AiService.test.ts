import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import Setting from '../../models/Setting';
import AiService from './AiService';
import deriveClassification from './classification';
import { ChatRole } from './types';

describe('AiService', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		AiService.instance().invalidateProvider();
	});

	it('throws when AI is disabled', async () => {
		Setting.setValue('ai.enabled', false);
		await expect(AiService.instance().chat([{ role: ChatRole.User, content: 'hi' }]))
			.rejects.toMatchObject({ code: 'aiDisabled' });
	});

	it('throws when remote provider is selected but allowRemote is off', async () => {
		Setting.setValue('ai.enabled', true);
		Setting.setValue('ai.allowRemote', false);
		Setting.setValue('ai.chat.providerType', 'anthropic');
		Setting.setValue('ai.chat.apiKey', 'sk-test');
		Setting.setValue('ai.chat.model', 'claude-3-5-sonnet-latest');

		await expect(AiService.instance().chat([{ role: ChatRole.User, content: 'hi' }]))
			.rejects.toMatchObject({ code: 'aiRemoteNotAllowed' });
	});

	it.each([
		['http://localhost:11434/v1', 'local'],
		['http://127.0.0.1:11434/v1', 'local'],
		['http://[::1]:11434/v1', 'local'],
		// Obfuscated loopback: new URL() resolves these to 127.0.0.1.
		['http://0177.0.0.1:11434/v1', 'local'],
		['http://2130706433:11434/v1', 'local'],
		['http://127.1:11434/v1', 'local'],
		// LAN and internal-only hosts are off-device, so they need consent.
		['http://10.0.0.5:11434/v1', 'remote'],
		['http://172.16.3.9:11434/v1', 'remote'],
		['http://192.168.1.50:11434/v1', 'remote'],
		['http://169.254.1.1:11434/v1', 'remote'],
		['http://ollama.internal:11434/v1', 'remote'],
		['http://ollama.home.arpa:11434/v1', 'remote'],
		['http://[fd12:3456::1]:11434/v1', 'remote'],
		['http://[fe80::1]:11434/v1', 'remote'],
		['http://ollama.local:11434/v1', 'remote'],
		['http://[fec0::1]:11434/v1', 'remote'],
		// Leading zero makes this octal, so it resolves to the public 8.0.0.5.
		['http://010.0.0.5:11434/v1', 'remote'],
		['http://8.8.8.8:11434/v1', 'remote'],
		['https://api.openai.com/v1', 'remote'],
		['not a url', 'remote'],
		['', 'remote'],
	])('classifies openai-compatible %s as %s', (baseUrl, expected) => {
		expect(deriveClassification('openai-compatible', baseUrl)).toBe(expected);
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
