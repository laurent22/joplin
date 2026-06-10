import Setting from '../../models/Setting';
import shim from '../../shim';
import { _ } from '../../locale';
import deriveClassification from './classification';
import { ProviderType } from './types';

// Inspects a pending set of setting changes and applies the AI-specific
// transition logic before settings are persisted:
//
// 1. Confirm "no silent enablement" (spec §4). When the user enables remote
//    access, or when their changes cause the active provider to flip from
//    local to remote, show a clear prompt naming the destination.
//
// 2. Mark `providerType.configured = true` when the user explicitly picked a
//    provider in the UI. This guards against the first-enable default
//    overwriting their choice if they later toggle AI off and on again.
//
// Returns `true` to proceed, `false` to abort the save (the caller should not
// persist the changes).

interface PendingChanges {
	changedKeys: string[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ConfigScreen passes a heterogeneous settings map keyed by setting name
	settings: Record<string, any>;
}

const providerLabel = (providerType: ProviderType, baseUrl: string): string => {
	if (providerType === 'joplin-cloud') return _('Joplin Cloud AI');
	if (providerType === 'anthropic') return _('Anthropic');
	if (providerType === 'openai-compatible') return baseUrl || _('the configured AI server');
	return providerType;
};

const aiSettingsTransition = async (pending: PendingChanges): Promise<boolean> => {
	const aiKeys = pending.changedKeys.filter(k => k.startsWith('ai.'));
	if (!aiKeys.length) return true;

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

	// Confirmation: detect a local→remote flip OR ai.allowRemote turning on.
	const newProviderType = (pending.settings['ai.chat.providerType'] ?? Setting.value('ai.chat.providerType')) as ProviderType;
	const newBaseUrl = (pending.settings['ai.chat.baseUrl'] ?? Setting.value('ai.chat.baseUrl')) as string;
	const newAllowRemote = !!(pending.settings['ai.allowRemote'] ?? Setting.value('ai.allowRemote'));
	const newAiEnabled = !!(pending.settings['ai.enabled'] ?? Setting.value('ai.enabled'));

	const previousClassification = deriveClassification(
		Setting.value('ai.chat.providerType') as ProviderType,
		Setting.value('ai.chat.baseUrl') as string,
	);
	const newClassification = deriveClassification(newProviderType, newBaseUrl);

	const turnedOnAllowRemote = aiKeys.includes('ai.allowRemote') && !Setting.value('ai.allowRemote') && newAllowRemote;
	const flippedToRemote = previousClassification === 'local' && newClassification === 'remote';

	// Only prompt if AI is (or will be) enabled — no point asking permission
	// for a feature that's off.
	if (newAiEnabled && (turnedOnAllowRemote || flippedToRemote)) {
		const label = providerLabel(newProviderType, newBaseUrl);
		const message = newProviderType === 'joplin-cloud'
			? _('AI features will use Joplin Cloud AI. Your note content will be sent to Joplin Cloud for processing. Continue?')
			: _('AI features will send note content to %s. Continue?', label);

		const ok = await shim.showConfirmationDialog(message);
		if (!ok) return false;
	}

	return true;
};

export default aiSettingsTransition;
