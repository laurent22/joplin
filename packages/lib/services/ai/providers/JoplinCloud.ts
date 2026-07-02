import Setting from '../../../models/Setting';
import JoplinError from '../../../JoplinError';
import JoplinServerApi, { Session } from '../../../JoplinServerApi';
import SyncTargetRegistry from '../../../SyncTargetRegistry';
import { ChatMessage, ChatOptions, ChatResult, ProviderClassification } from '../types';
import ChatProviderBase from './ChatProviderBase';

const joplinCloudSyncTarget = () => SyncTargetRegistry.nameToId('joplinCloud');

interface JoplinCloudUsage {
	prompt_tokens?: number;
	completion_tokens?: number;
}

interface JoplinCloudChoice {
	message?: { content?: string };
}

interface JoplinCloudResponse {
	choices?: JoplinCloudChoice[];
	usage?: JoplinCloudUsage;
	joplin?: { degraded?: boolean; tokens_used?: number; tokens_budget?: number };
}

// Maps the server-side errors thrown by the Joplin Cloud AI route to messages
// the user can act on. See joplin-server/packages/server/src/routes/api/ai.ts.
const mapErrorByStatus = (status: number, detail: string): JoplinError => {
	if (status === 401) return new JoplinError('Sign in to Joplin Cloud to use AI', status);
	if (status === 403) return new JoplinError('Joplin Cloud AI has been disabled for this account', status);
	if (status === 429) return new JoplinError('Joplin Cloud AI rate limit or token budget exceeded', status);
	if (status === 501) return new JoplinError('Joplin Cloud AI is not enabled on this server', status);
	if (status === 502) return new JoplinError('Joplin Cloud AI upstream error', status);
	return new JoplinError(`Joplin Cloud AI returned ${status}${detail ? `: ${detail}` : ''}`, status);
};

export default class JoplinCloudProvider extends ChatProviderBase {

	public id = 'joplin-cloud';
	public classification: ProviderClassification = 'remote';

	private buildApi(): JoplinServerApi {
		// Build a fresh API object per call so re-auth survives without drift.
		// JoplinServerApi caches its session internally on the instance, so
		// we can't safely keep one across logout/login transitions.
		const id = joplinCloudSyncTarget();
		return new JoplinServerApi({
			baseUrl: () => Setting.value(`sync.${id}.path`),
			userContentBaseUrl: () => Setting.value(`sync.${id}.userContentPath`),
			username: () => Setting.value(`sync.${id}.username`),
			password: () => Setting.value(`sync.${id}.password`),
			apiKey: () => Setting.value(`sync.${id}.apiKey`),
			session: (): Session | null => null,
		});
	}

	protected async doChat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult> {
		if (Setting.value('sync.target') !== joplinCloudSyncTarget()) {
			throw new JoplinError('Joplin Cloud AI requires Joplin Cloud sync', 'aiJoplinCloudSyncRequired');
		}

		const api = this.buildApi();
		// Body deliberately omits `model` — the Joplin Cloud server picks the
		// model based on quota / degraded state. Sending one would be ignored.
		const body: Record<string, unknown> = {
			messages: messages.map(m => ({ role: m.role, content: m.content })),
		};
		if (options?.maxTokens !== undefined) body.max_tokens = options.maxTokens;
		if (options?.temperature !== undefined) body.temperature = options.temperature;

		// JoplinServerApi.exec() returns the parsed JSON object directly when
		// the response format is JSON (the default). No need to JSON.parse.
		let json: JoplinCloudResponse;
		try {
			json = await api.exec('POST', 'api/ai/chat/completions', null, body) as JoplinCloudResponse;
		} catch (error) {
			const status = typeof error?.code === 'number' ? error.code : 0;
			const detail = error?.message ?? '';
			throw mapErrorByStatus(status, detail);
		}

		const content = json?.choices?.[0]?.message?.content ?? '';
		const inputTokens = json?.usage?.prompt_tokens ?? 0;
		const outputTokens = json?.usage?.completion_tokens ?? 0;

		return { text: content, usage: { inputTokens, outputTokens } };
	}
}
