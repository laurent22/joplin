import Setting from '../../models/Setting';
import SyncTargetRegistry from '../../SyncTargetRegistry';
import { ProviderType } from './types';

// Inspects a pending set of setting changes and applies the AI-specific
// transition logic before settings are persisted:
//
// 1. When ai.enabled flips from off to on AND the user has never picked a
//    provider, write the sync-aware default (joplin-cloud if on Joplin Cloud
//    sync, otherwise leave as the metadata default). The flag is then
//    marked configured so subsequent toggles don't re-apply.
//
// 2. Mark `providerType.configured = true` when the user explicitly picked a
//    provider in the UI. This guards against the first-enable default
//    overwriting their choice if they later toggle AI off and on again.
//
// 3. Reset the token-usage counters when the active provider endpoint changes
//    (provider type or base URL). Counters represent usage for whichever
//    provider is currently active.

interface PendingChanges {
	changedKeys: string[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ConfigScreen passes a heterogeneous settings map keyed by setting name
	settings: Record<string, any>;
}

const markChanged = (pending: PendingChanges, key: string) => {
	if (!pending.changedKeys.includes(key)) pending.changedKeys.push(key);
};

const aiSettingsTransition = (pending: PendingChanges): void => {
	const aiKeys = pending.changedKeys.filter(k => k.startsWith('ai.'));
	if (!aiKeys.length) return;

	// First-enable default. If the user just turned AI on and hasn't picked
	// a provider yet, pick Joplin Cloud AI when they're on Joplin Cloud sync.
	// updateSettingValue applies the same logic to the form state on toggle so
	// the UI updates immediately; this branch is the safety net for paths that
	// reach save-time without the live hook running.
	const enablingNow = aiKeys.includes('ai.enabled') && pending.settings['ai.enabled'] === true && !Setting.value('ai.enabled');
	if (enablingNow && !Setting.value('ai.chat.providerType.configured')) {
		if (Setting.value('sync.target') === SyncTargetRegistry.nameToId('joplinCloud')) {
			pending.settings['ai.chat.providerType'] = 'joplin-cloud';
			markChanged(pending, 'ai.chat.providerType');
		}
		pending.settings['ai.chat.providerType.configured'] = true;
		markChanged(pending, 'ai.chat.providerType.configured');
	}

	// Re-read the aiKeys list because we may have just added new entries above.
	const aiKeysAfter = pending.changedKeys.filter(k => k.startsWith('ai.'));

	// Mark provider as explicitly configured if the user touched any
	// provider-shaping setting. After this point, sync target changes will
	// not influence the AI provider.
	const explicitProviderKeys = ['ai.chat.baseUrl', 'ai.chat.apiKey', 'ai.chat.model'];
	// Treat a providerType change as explicit only when it doesn't match the
	// auto-default we just wrote (avoids re-flagging on the first-enable path).
	const explicitProviderTypeChange = aiKeysAfter.includes('ai.chat.providerType') && !enablingNow;
	if (explicitProviderTypeChange || aiKeysAfter.some(k => explicitProviderKeys.includes(k))) {
		pending.settings['ai.chat.providerType.configured'] = true;
		markChanged(pending, 'ai.chat.providerType.configured');
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
		markChanged(pending, 'ai.usage.inputTokens');
		markChanged(pending, 'ai.usage.outputTokens');
	}
};

export default aiSettingsTransition;
