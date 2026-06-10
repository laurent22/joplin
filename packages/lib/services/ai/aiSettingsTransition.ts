import Setting from '../../models/Setting';
import { ProviderType } from './types';

// Inspects a pending set of setting changes and applies the AI-specific
// transition logic before settings are persisted:
//
// 1. Mark `providerType.configured = true` when the user explicitly picked a
//    provider in the UI. This guards against the first-enable default
//    overwriting their choice if they later toggle AI off and on again.
//
// 2. Reset the token-usage counters when the active provider endpoint changes
//    (provider type or base URL). Counters represent usage for whichever
//    provider is currently active.

interface PendingChanges {
	changedKeys: string[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ConfigScreen passes a heterogeneous settings map keyed by setting name
	settings: Record<string, any>;
}

const aiSettingsTransition = (pending: PendingChanges): void => {
	const aiKeys = pending.changedKeys.filter(k => k.startsWith('ai.'));
	if (!aiKeys.length) return;

	// Mark provider as explicitly configured if the user touched any
	// provider-shaping setting. After this point, sync target changes will
	// not influence the AI provider.
	const explicitProviderKeys = ['ai.chat.providerType', 'ai.chat.baseUrl', 'ai.chat.apiKey', 'ai.chat.model'];
	if (aiKeys.some(k => explicitProviderKeys.includes(k))) {
		pending.settings['ai.chat.providerType.configured'] = true;
		if (!pending.changedKeys.includes('ai.chat.providerType.configured')) {
			pending.changedKeys.push('ai.chat.providerType.configured');
		}
	}

	// Reset usage counters whenever the user points at a different endpoint.
	// Same provider type with a new baseUrl (e.g. switching from OpenAI to
	// Mistral) also counts as a different endpoint.
	const newProviderType = (pending.settings['ai.chat.providerType'] ?? Setting.value('ai.chat.providerType')) as ProviderType;
	const newBaseUrl = (pending.settings['ai.chat.baseUrl'] ?? Setting.value('ai.chat.baseUrl')) as string;
	const oldProviderType = Setting.value('ai.chat.providerType');
	const oldBaseUrl = Setting.value('ai.chat.baseUrl');
	if (newProviderType !== oldProviderType || newBaseUrl !== oldBaseUrl) {
		pending.settings['ai.usage.inputTokens'] = 0;
		pending.settings['ai.usage.outputTokens'] = 0;
		if (!pending.changedKeys.includes('ai.usage.inputTokens')) pending.changedKeys.push('ai.usage.inputTokens');
		if (!pending.changedKeys.includes('ai.usage.outputTokens')) pending.changedKeys.push('ai.usage.outputTokens');
	}
};

export default aiSettingsTransition;
