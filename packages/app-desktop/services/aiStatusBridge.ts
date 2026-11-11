import { _ } from '@joplin/lib/locale';
import Setting from '@joplin/lib/models/Setting';
import Logger from '@joplin/utils/Logger';
import { setAiStatusListener, AiStatusUpdate } from '@joplin/lib/services/ai/AiService';
import { ToastType } from '@joplin/lib/services/plugins/api/types';
import { AiStatus, AppState, defaultAiStatus } from '../app.reducer';

// Minimal store shape the bridge needs. The desktop app's own store is
// typed against the base State (Store<State>) even though it dispatches
// app-level actions; accepting this narrower interface avoids a caller-side
// cast at the boot site.
export interface AiStatusStore {
	dispatch: (action: { type: string; [key: string]: unknown })=> unknown;
	getState: ()=> AppState;
}

const logger = Logger.create('aiStatusBridge');

// Two local timestamps are on the same calendar day when their year, month
// and date match in the local timezone. Using components rather than a UTC
// diff means DST transitions don't accidentally count as a same-day match
// or push the boundary into the wrong day.
const isSameLocalDay = (a: number, b: number): boolean => {
	const da = new Date(a);
	const db = new Date(b);
	return da.getFullYear() === db.getFullYear()
		&& da.getMonth() === db.getMonth()
		&& da.getDate() === db.getDate();
};

const readPersistedStatus = (): AiStatus => {
	try {
		const raw = Setting.value('ai.status') as Partial<AiStatus> | undefined;
		if (!raw) return defaultAiStatus();
		return { ...defaultAiStatus(), ...raw };
	} catch (error) {
		logger.warn('Failed to read ai.status:', error);
		return defaultAiStatus();
	}
};

// Exported for tests: takes a store and returns the same function that
// installAiStatusBridge would register on AiService. Kept separate so a test
// can drive it without spinning up the real AiService.
export const makeAiStatusListener = (store: AiStatusStore) => (update: AiStatusUpdate) => {
	store.dispatch({ type: 'AI_STATUS_UPDATE', payload: update });

	if (update.degraded !== true) return;

	const now = Date.now();
	const state = store.getState();
	const last = state.aiStatus?.lastToastShownAt ?? null;
	const alreadyShownToday = last !== null && isSameLocalDay(last, now);
	if (alreadyShownToday) return;

	// Toast content is plain text — the popup renderer only accepts a string.
	// The clickable link lives in the persistent surfaces (ChatPanel, Settings)
	// where JSX is available.
	store.dispatch({
		type: 'TOAST_SHOW',
		value: {
			message: _('AI usage has exceeded your monthly allowance — responses are using a reduced-quality model. Credits replenish on a rolling 30-day basis. Buy more at %s.', 'https://joplincloud.com/users/me'),
			type: ToastType.Info,
		},
	});
	store.dispatch({ type: 'AI_STATUS_UPDATE', payload: { lastToastShownAt: now } });
	try {
		const persisted = Setting.value('ai.status') as unknown as Record<string, unknown>;
		Setting.setValue('ai.status', { ...persisted, lastToastShownAt: now } as never);
	} catch (error) {
		logger.warn('Failed to persist lastToastShownAt:', error);
	}
};

export const installAiStatusBridge = (store: AiStatusStore) => {
	// Seed the slice from the persisted setting so a plugin call made while
	// the sidebar and settings screen were both closed still shows a fresh
	// status the next time either is opened.
	store.dispatch({ type: 'AI_STATUS_UPDATE', payload: readPersistedStatus() });
	setAiStatusListener(makeAiStatusListener(store));
};

export const _internal = { isSameLocalDay, readPersistedStatus };
