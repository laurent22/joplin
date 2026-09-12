import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import Setting from '../../models/Setting';
import { chatAvailability, embeddingAvailability, mcpAvailability, AvailabilityReason } from './availability';

describe('availability', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	test('chatAvailability reports disabled when ai.enabled is off', () => {
		Setting.setValue('ai.enabled', false);
		const r = chatAvailability();
		expect(r.available).toBe(false);
		expect(r.reason).toBe(AvailabilityReason.Disabled);
	});

	test('chatAvailability reports missing-api-key for anthropic without key', () => {
		Setting.setValue('ai.enabled', true);
		Setting.setValue('ai.allowRemote', true);
		Setting.setValue('ai.chat.providerType', 'anthropic');
		Setting.setValue('ai.chat.apiKey', '');
		Setting.setValue('ai.chat.model', 'claude-3-5-sonnet-latest');
		expect(chatAvailability().reason).toBe(AvailabilityReason.MissingApiKey);
	});

	test('chatAvailability reports missing-model for openai-compatible without model', () => {
		Setting.setValue('ai.enabled', true);
		Setting.setValue('ai.allowRemote', false);
		Setting.setValue('ai.chat.providerType', 'openai-compatible');
		Setting.setValue('ai.chat.baseUrl', 'http://localhost:11434/v1');
		Setting.setValue('ai.chat.apiKey', 'unused');
		Setting.setValue('ai.chat.model', '');
		expect(chatAvailability().reason).toBe(AvailabilityReason.MissingModel);
	});

	test.each([
		['http://localhost:11434/v1'],
		['http://127.0.0.1:11434/v1'],
	])('chatAvailability does not require an API key for %s', (baseUrl) => {
		Setting.setValue('ai.enabled', true);
		Setting.setValue('ai.allowRemote', false);
		Setting.setValue('ai.chat.providerType', 'openai-compatible');
		Setting.setValue('ai.chat.baseUrl', baseUrl);
		Setting.setValue('ai.chat.apiKey', '');
		Setting.setValue('ai.chat.model', 'llama3');
		expect(chatAvailability().available).toBe(true);
	});

	test('chatAvailability requires consent for a LAN endpoint', () => {
		Setting.setValue('ai.enabled', true);
		Setting.setValue('ai.allowRemote', false);
		Setting.setValue('ai.chat.providerType', 'openai-compatible');
		Setting.setValue('ai.chat.baseUrl', 'http://192.168.1.50:11434/v1');
		Setting.setValue('ai.chat.apiKey', 'unused');
		Setting.setValue('ai.chat.model', 'llama3');
		expect(chatAvailability().reason).toBe(AvailabilityReason.RemoteNotAllowed);
	});

	test('chatAvailability reports missing-api-key for a remote openai-compatible endpoint', () => {
		Setting.setValue('ai.enabled', true);
		Setting.setValue('ai.allowRemote', true);
		Setting.setValue('ai.chat.providerType', 'openai-compatible');
		Setting.setValue('ai.chat.baseUrl', 'https://api.openai.com/v1');
		Setting.setValue('ai.chat.apiKey', '');
		Setting.setValue('ai.chat.model', 'gpt-4o');
		expect(chatAvailability().reason).toBe(AvailabilityReason.MissingApiKey);
	});

	test('chatAvailability reports remote-not-allowed when provider is remote and switch is off', () => {
		Setting.setValue('ai.enabled', true);
		Setting.setValue('ai.allowRemote', false);
		Setting.setValue('ai.chat.providerType', 'anthropic');
		Setting.setValue('ai.chat.apiKey', 'sk-test');
		Setting.setValue('ai.chat.model', 'claude-3-5-sonnet-latest');
		expect(chatAvailability().reason).toBe(AvailabilityReason.RemoteNotAllowed);
	});

	test('chatAvailability is true for a fully configured local provider', () => {
		Setting.setValue('ai.enabled', true);
		Setting.setValue('ai.allowRemote', false);
		Setting.setValue('ai.chat.providerType', 'openai-compatible');
		Setting.setValue('ai.chat.baseUrl', 'http://localhost:11434/v1');
		Setting.setValue('ai.chat.apiKey', 'unused');
		Setting.setValue('ai.chat.model', 'llama3');
		const r = chatAvailability();
		expect(r.available).toBe(true);
		expect(r.reason).toBeUndefined();
		expect(r.hint).toBeUndefined();
	});

	test('embeddingAvailability requires ai.enabled', () => {
		Setting.setValue('ai.enabled', false);
		expect(embeddingAvailability().reason).toBe(AvailabilityReason.Disabled);
	});

	test('mcpAvailability reports disabled when mcp.enabled is off', () => {
		Setting.setValue('mcp.enabled', false);
		expect(mcpAvailability().reason).toBe(AvailabilityReason.Disabled);
	});

	test('mcpAvailability reports web-clipper-disabled when MCP is on but clipper is off', () => {
		Setting.setValue('mcp.enabled', true);
		Setting.setValue('clipperServer.autoStart', false);
		expect(mcpAvailability().reason).toBe(AvailabilityReason.WebClipperDisabled);
	});

});
