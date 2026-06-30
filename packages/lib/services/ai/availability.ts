import Setting from '../../models/Setting';
import SyncTargetRegistry from '../../SyncTargetRegistry';
import { _ } from '../../locale';
import deriveClassification from './classification';
import { ProviderType } from './types';
import NoteEmbedding from '../../models/NoteEmbedding';
import AiService from './AiService';

export enum AvailabilityReason {
	Disabled = 'disabled',
	RemoteNotAllowed = 'remote-not-allowed',
	JoplinCloudWithoutSync = 'joplin-cloud-without-sync',
	MissingBaseUrl = 'missing-base-url',
	MissingApiKey = 'missing-api-key',
	MissingModel = 'missing-model',
	WebClipperDisabled = 'web-clipper-disabled',
	NoEmbeddingProvider = 'no-embedding-provider',
	VectorSearchUnavailable = 'vector-search-unavailable',
}

export interface Availability {
	available: boolean;
	reason?: AvailabilityReason;
	hint?: string;
}

const available = (): Availability => ({ available: true });
const unavailable = (reason: AvailabilityReason, hint: string): Availability => ({ available: false, reason, hint });

const aiEnabled = () => !!Setting.value('ai.enabled');

// Mirrors AiService.chat()'s runtime checks so callers can surface the
// precise problem before the user types, not as a generic error after send.
export const chatAvailability = (): Availability => {
	if (!aiEnabled()) {
		return unavailable(AvailabilityReason.Disabled, _('AI features are disabled. Enable them in Settings → AI.'));
	}

	const providerType = Setting.value('ai.chat.providerType') as ProviderType;
	const baseUrl = providerType === 'openai-compatible' ? Setting.value('ai.chat.baseUrl') as string : '';

	if (providerType === 'joplin-cloud') {
		if (Setting.value('sync.target') !== SyncTargetRegistry.nameToId('joplinCloud')) {
			return unavailable(AvailabilityReason.JoplinCloudWithoutSync, _('Joplin Cloud AI requires Joplin Cloud sync. Pick a different provider or restore Joplin Cloud sync.'));
		}
	} else if (providerType === 'openai-compatible') {
		if (!baseUrl) return unavailable(AvailabilityReason.MissingBaseUrl, _('The OpenAI-compatible provider needs a base URL. Set it in Settings → AI.'));
		if (!Setting.value('ai.chat.apiKey')) return unavailable(AvailabilityReason.MissingApiKey, _('The API key is missing. Set it in Settings → AI.'));
		if (!Setting.value('ai.chat.model')) return unavailable(AvailabilityReason.MissingModel, _('The model name is missing. Set it in Settings → AI.'));
	} else if (providerType === 'anthropic') {
		if (!Setting.value('ai.chat.apiKey')) return unavailable(AvailabilityReason.MissingApiKey, _('The API key is missing. Set it in Settings → AI.'));
		if (!Setting.value('ai.chat.model')) return unavailable(AvailabilityReason.MissingModel, _('The model name is missing. Set it in Settings → AI.'));
	}

	const classification = deriveClassification(providerType, baseUrl);
	if (classification === 'remote' && !Setting.value('ai.allowRemote')) {
		return unavailable(AvailabilityReason.RemoteNotAllowed, _('This provider sends data off your device. Turn on "Allow remote AI providers" in Settings → AI.'));
	}

	return available();
};

export const embeddingAvailability = (): Availability => {
	if (!aiEnabled()) {
		return unavailable(AvailabilityReason.Disabled, _('AI features are disabled. Enable them in Settings → AI.'));
	}
	if (!Setting.value('ai.embedding.enabled')) {
		return unavailable(AvailabilityReason.Disabled, _('Note indexing is turned off in Settings → AI.'));
	}
	if (!NoteEmbedding.vectorSearchAvailable()) {
		return unavailable(AvailabilityReason.VectorSearchUnavailable, _('Vector search is unavailable on this platform (sqlite-vec extension not loaded).'));
	}
	if (!AiService.instance().getActiveEmbeddingProvider()) {
		return unavailable(AvailabilityReason.NoEmbeddingProvider, _('No embedding model is installed. It is downloaded automatically on first use — check Settings → AI for progress.'));
	}
	return available();
};

// Reflects configured intent, not live connectivity — we don't probe the
// Web Clipper port from here. Callers that need "is the socket open" should
// ask the clipper service directly.
export const mcpAvailability = (): Availability => {
	if (!Setting.value('mcp.enabled')) {
		return unavailable(AvailabilityReason.Disabled, _('The MCP server is disabled. Enable it in Settings → MCP.'));
	}
	if (!Setting.value('clipperServer.autoStart')) {
		return unavailable(AvailabilityReason.WebClipperDisabled, _('MCP requires the Web Clipper service. Enable it in Settings → Web Clipper.'));
	}
	return available();
};
