import Setting from '@joplin/lib/models/Setting';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { makeAiStatusListener, _internal, AiStatusStore } from './aiStatusBridge';
import { AppState, AiStatus, defaultAiStatus } from '../app.reducer';

interface DispatchedAction { type: string; [key: string]: unknown }

const makeStore = (aiStatus: AiStatus) => {
	const state = { aiStatus, toast: null } as unknown as AppState;
	const dispatched: DispatchedAction[] = [];
	const dispatch = (action: DispatchedAction) => {
		dispatched.push(action);
		if (action.type === 'AI_STATUS_UPDATE') {
			state.aiStatus = { ...state.aiStatus, ...(action.payload as Partial<AiStatus>) };
		}
		return action;
	};
	const store: AiStatusStore = { dispatch, getState: () => state };
	return { store, dispatched };
};

const localTs = (y: number, m: number, d: number, h = 0, min = 0) =>
	new Date(y, m, d, h, min, 0, 0).getTime();

describe('aiStatusBridge', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('isSameLocalDay treats same-day timestamps as equal, cross-midnight as different', () => {
		const yesterdayLate = localTs(2026, 6, 4, 23, 59);
		const todayEarly = localTs(2026, 6, 5, 0, 1);
		const todayLate = localTs(2026, 6, 5, 23, 59);

		expect(_internal.isSameLocalDay(todayEarly, todayLate)).toBe(true);
		expect(_internal.isSameLocalDay(yesterdayLate, todayEarly)).toBe(false);
	});

	it('fires the toast on the first degraded reply after local midnight', () => {
		const yesterday = localTs(2026, 6, 4, 23, 59);
		const now = localTs(2026, 6, 5, 0, 1);
		jest.useFakeTimers().setSystemTime(now);

		const { store, dispatched } = makeStore({ ...defaultAiStatus(), lastToastShownAt: yesterday });
		const listener = makeAiStatusListener(store);

		listener({ degraded: true, tokensUsed: 100, tokensBudget: 50 });

		expect(dispatched.some(a => a.type === 'TOAST_SHOW')).toBe(true);

		const toastTimeSet = dispatched
			.filter(a => a.type === 'AI_STATUS_UPDATE')
			.some(a => (a.payload as Partial<AiStatus>).lastToastShownAt === now);
		expect(toastTimeSet).toBe(true);

		const persisted = Setting.value('ai.status') as Partial<AiStatus>;
		expect(persisted.lastToastShownAt).toBe(now);
	});

	it('does not fire the toast when a degraded reply arrives later the same local day', () => {
		const morning = localTs(2026, 6, 5, 0, 1);
		const evening = localTs(2026, 6, 5, 23, 59);
		jest.useFakeTimers().setSystemTime(evening);

		const { store, dispatched } = makeStore({ ...defaultAiStatus(), degraded: true, lastToastShownAt: morning });
		const listener = makeAiStatusListener(store);

		listener({ degraded: true, tokensUsed: 200, tokensBudget: 50 });

		expect(dispatched.some(a => a.type === 'TOAST_SHOW')).toBe(false);
		// lastToastShownAt must not be bumped when the toast doesn't fire.
		const toastTimeChanged = dispatched
			.filter(a => a.type === 'AI_STATUS_UPDATE')
			.some(a => 'lastToastShownAt' in (a.payload as object));
		expect(toastTimeChanged).toBe(false);
	});

	it('does not fire the toast for a non-degraded reply', () => {
		jest.useFakeTimers().setSystemTime(localTs(2026, 6, 5, 12, 0));
		const { store, dispatched } = makeStore(defaultAiStatus());
		const listener = makeAiStatusListener(store);

		listener({ degraded: false, tokensUsed: 10, tokensBudget: 1000 });

		expect(dispatched.some(a => a.type === 'TOAST_SHOW')).toBe(false);
	});
});
