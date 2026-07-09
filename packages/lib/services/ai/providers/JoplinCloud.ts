import Setting from '../../../models/Setting';
import JoplinError from '../../../JoplinError';
import JoplinServerApi, { Session } from '../../../JoplinServerApi';
import SyncTargetRegistry from '../../../SyncTargetRegistry';
import { ProviderClassification } from '../types';
import OpenAiCompatibleProvider, { ChatRequestOptions } from './OpenAiCompatible';
import { msleep, Second } from '@joplin/utils/time';

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

// If too many events are received in a short window, Joplin Cloud starts rejecting events.
// For now, avoid more than one event every few seconds:
const minimumTimeBetweenEvents = 3 * Second;

export default class JoplinCloudProvider extends OpenAiCompatibleProvider {

	public id = 'joplin-cloud';
	public classification: ProviderClassification = 'remote';
	private lastEventTime_ = 0;

	public constructor() {
		super({
			baseUrl: '',
			model: 'joplin-cloud',
			classification: 'remote',
			apiKey: '',
		});
	}

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

	protected override async sendChatRequest(body: Record<string, unknown>, options: ChatRequestOptions) {
		if (Setting.value('sync.target') !== joplinCloudSyncTarget()) {
			throw new JoplinError('Joplin Cloud AI requires Joplin Cloud sync', 'aiJoplinCloudSyncRequired');
		}

		const timeSinceLastEvent = Date.now() - this.lastEventTime_;
		if (timeSinceLastEvent < minimumTimeBetweenEvents) {
			await msleep(minimumTimeBetweenEvents - timeSinceLastEvent);
		}

		const api = this.buildApi();

		// JoplinServerApi.exec() returns the parsed JSON object directly when
		// the response format is JSON (the default). No need to JSON.parse.
		let json: JoplinCloudResponse;
		try {
			json = await api.exec('POST', 'api/ai/chat/completions', null, body, null, { signal: options.signal }) as JoplinCloudResponse;
		} catch (error) {
			const status = typeof error?.code === 'number' ? error.code : 0;
			const detail = error?.message ?? '';
			throw mapErrorByStatus(status, detail);
		}

		this.lastEventTime_ = Date.now();

		return { response: { status: 200 }, json };
	}
}
