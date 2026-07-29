import Setting from '../../../models/Setting';
import JoplinError from '../../../JoplinError';
import SyncTargetRegistry from '../../../SyncTargetRegistry';
import { ChatMessage, ChatOptions, ChatResult, ProviderClassification } from '../types';
import OpenAiCompatibleProvider, { ChatRequestOptions, OpenAiChatResponse } from './OpenAiCompatible';
import { msleep, Second } from '@joplin/utils/time';
import Logger from '@joplin/utils/Logger';
import { reg } from '../../../registry';
import SyncTargetJoplinCloud from '../../../SyncTargetJoplinCloud';
import FileApiDriverJoplinServer from '../../../file-api-driver-joplinServer';

const logger = Logger.create('ai/providers/JoplinCloud');

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

interface JoplinCloudChatRequestOptions extends ChatRequestOptions {
	retry?: number;
}

// Maps the server-side errors thrown by the Joplin Cloud AI route to messages
// the user can act on. See joplin-server/packages/server/src/routes/api/ai.ts.
//
// Code match wins over status match; codes are camelCase, matching the
// ErrorCode enum in packages/server/src/utils/errors.ts.
export const mapErrorByCode = (code: string | number | null, status: number, detail: string): JoplinError => {
	if (code === 'aiRateLimitExceeded') return new JoplinError('You\'re sending requests too quickly. Try again in a moment.', code);
	if (code === 'aiBudgetExhausted') return new JoplinError('You\'ve reached your AI usage budget for this billing period.', code);
	if (code === 'aiAccountDisabled') return new JoplinError('AI access is disabled for your account. Contact support.', code);
	if (code === 'aiUpstreamError') return new JoplinError('The AI provider is temporarily unavailable. Try again shortly.', code);

	if (status === 401) return new JoplinError('Please sign in to use AI features.', status);
	if (status === 501) return new JoplinError('AI is not enabled on this server.', status);

	// Unknown string code (e.g. a code added server-side that this client
	// version doesn't know yet): preserve it on both the message and the
	// error's `code` field so callers switching on error.code and log
	// scrapers looking at the message can still distinguish it.
	if (typeof code === 'string') {
		return new JoplinError(`Joplin Cloud AI returned ${code}${detail ? `: ${detail}` : ''}`, code);
	}

	return new JoplinError(`Joplin Cloud AI returned ${status}${detail ? `: ${detail}` : ''}`, status);
};

// If too many events are received in a short window, Joplin Cloud starts rejecting events.
// For now, avoid more than one event every second or two.
const minimumTimeBetweenEvents = Second;

type ApiError = Error & { code?: number|string; retryAfterSeconds?: number };

const isRateLimitError = (error: ApiError) => (
	(error.code === 429 || error.code === 'aiRateLimitExceeded') && typeof error.retryAfterSeconds === 'number'
);

const canAutoRetryError = (error: ApiError) => {
	return isRateLimitError(error) && error.retryAfterSeconds < 10;
};

export default class JoplinCloudProvider extends OpenAiCompatibleProvider {

	public id = 'joplin-cloud';
	public classification: ProviderClassification = 'remote';
	private lastEventTime_ = 0;
	private lastJoplinMeta_: JoplinCloudResponse['joplin'] | null = null;

	public constructor() {
		super({
			baseUrl: '',
			model: 'joplin-cloud',
			classification: 'remote',
			apiKey: '',
		});
	}

	private async api() {
		// Fetch the API from the registry, rather than caching the API locally.
		// This avoids authentication drift if the user changes the sync target credentials.
		// Note that recreating the API each time can cause the user to quickly encounter login rate limiting.
		const id = joplinCloudSyncTarget();
		const syncTarget = reg.syncTarget(id) as SyncTargetJoplinCloud;
		const driver: FileApiDriverJoplinServer = (await syncTarget.fileApi()).driver();
		const api = driver.api();
		return api;
	}

	protected override async sendChatRequest(body: Record<string, unknown>, options: JoplinCloudChatRequestOptions): Promise<OpenAiChatResponse> {
		if (Setting.value('sync.target') !== joplinCloudSyncTarget()) {
			throw new JoplinError('Joplin Cloud AI requires Joplin Cloud sync', 'aiJoplinCloudSyncRequired');
		}

		const timeSinceLastEvent = Date.now() - this.lastEventTime_;
		if (timeSinceLastEvent < minimumTimeBetweenEvents) {
			await msleep(minimumTimeBetweenEvents - timeSinceLastEvent);
		}

		const api = await this.api();

		// JoplinServerApi.exec() returns the parsed JSON object directly when
		// the response format is JSON (the default). No need to JSON.parse.
		let json: JoplinCloudResponse;
		try {
			const execOptions = {
				signal: options.signal,
				// Rate limit errors happen during normal use and don't need to be logged as warnings
				ignoreError: isRateLimitError,
			};
			json = await api.exec(
				'POST', 'api/ai/chat/completions', null, body, null, execOptions,
			) as JoplinCloudResponse;
		} catch (error) {
			const retry = options.retry ?? 0;
			if (canAutoRetryError(error) && retry < 3) {
				logger.info('Retrying AI request after', error.retryAfterSeconds, 's...');
				await msleep(error.retryAfterSeconds * Second);
				return this.sendChatRequest(body, { ...options, retry: retry + 1 });
			}

			// JoplinServerApi stores the server's `code` field on error.code
			// (string) and falls back to the HTTP status (number) when no code
			// was returned. Preserve that distinction.
			const rawCode = error?.code;
			const code = typeof rawCode === 'string' ? rawCode : null;
			const status = typeof rawCode === 'number' ? rawCode : 0;
			const detail = error?.message ?? '';
			throw mapErrorByCode(code, status, detail);
		}

		this.lastEventTime_ = Date.now();
		this.lastJoplinMeta_ = json?.joplin ?? null;

		return { response: { status: 200 }, json };
	}

	protected override async doChat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult> {
		this.lastJoplinMeta_ = null;
		const result = await super.doChat(messages, options);
		const meta = this.lastJoplinMeta_;
		if (meta) {
			if (typeof meta.degraded === 'boolean') result.degraded = meta.degraded;
			if (typeof meta.tokens_used === 'number') result.tokensUsed = meta.tokens_used;
			if (typeof meta.tokens_budget === 'number') result.tokensBudget = meta.tokens_budget;
		}
		return result;
	}
}
