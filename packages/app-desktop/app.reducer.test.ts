import { ChatRole, ChatToolCall, ChatToolMessage } from '@joplin/lib/services/ai/types';
import { AiChatMessage, AppState, createAppDefaultWindowState } from './app.reducer';
import appReducer, { createAppDefaultState } from './app.reducer';
import { defaultWindowId } from '@joplin/lib/reducer';

describe('app.reducer', () => {

	it('should handle DIALOG_OPEN', async () => {
		const state: AppState = createAppDefaultState({});

		let newState = appReducer(state, {
			type: 'DIALOG_OPEN',
			name: 'syncWizard',
		});

		expect(newState.dialogs.length).toBe(1);
		expect(newState.dialogs[0].name).toBe('syncWizard');

		expect(() => appReducer(newState, {
			type: 'DIALOG_OPEN',
			name: 'syncWizard',
		})).toThrow();

		newState = appReducer(newState, {
			type: 'DIALOG_CLOSE',
			name: 'syncWizard',
		});

		expect(newState.dialogs.length).toBe(0);

		expect(() => appReducer(newState, {
			type: 'DIALOG_CLOSE',
			name: 'syncWizard',
		})).toThrow();

		newState = appReducer(newState, {
			type: 'DIALOG_OPEN',
			name: 'syncWizard',
		});

		newState = appReducer(newState, {
			type: 'DIALOG_OPEN',
			name: 'setPassword',
		});

		expect(newState.dialogs).toEqual([
			{ name: 'syncWizard', props: {} },
			{ name: 'setPassword', props: {} },
		]);
	});

	it('aI_STATUS_UPDATE merges a partial payload without clobbering unrelated fields', () => {
		const state: AppState = {
			...createAppDefaultState({}),
			aiStatus: { degraded: true, tokensUsed: 500, tokensBudget: 1000, lastToastShownAt: 12345 },
		};

		const afterUsage = appReducer(state, {
			type: 'AI_STATUS_UPDATE',
			payload: { tokensUsed: 600 },
		});

		expect(afterUsage.aiStatus).toEqual({
			degraded: true,
			tokensUsed: 600,
			tokensBudget: 1000,
			lastToastShownAt: 12345,
		});

		const afterToast = appReducer(afterUsage, {
			type: 'AI_STATUS_UPDATE',
			payload: { lastToastShownAt: 67890 },
		});

		expect(afterToast.aiStatus).toEqual({
			degraded: true,
			tokensUsed: 600,
			tokensBudget: 1000,
			lastToastShownAt: 67890,
		});
	});

	it('showing a dialog in one window should hide dialogs with the same ID in background windows', () => {
		const state: AppState = {
			...createAppDefaultState({}),
			backgroundWindows: {
				testWindow: {
					...createAppDefaultWindowState(),
					windowId: 'testWindow',

					visibleDialogs: {
						testDialog: true,
					},
				},
			},
		};

		const newState = appReducer(state, {
			type: 'VISIBLE_DIALOGS_ADD',
			name: 'testDialog',
		});

		expect(newState.backgroundWindows.testWindow.visibleDialogs).toEqual({});
		expect(newState.visibleDialogs).toEqual({ testDialog: true });
	});

	it('should build AI chat history', () => {
		let state: AppState = {
			...createAppDefaultState({}),
		};

		let idCounter = 0;
		const buildMessage = (role: ChatRole.User | ChatRole.Assistant, content: string, toolCalls: ChatToolCall[]) => ({
			id: `id-${idCounter++}`,
			role,
			text: content,
			raw: [
				{
					role,
					content: content,
					...(toolCalls.length ? { toolCalls } : {}),
				},
			],
		} satisfies AiChatMessage);

		state = appReducer(state, {
			type: 'AI_CHAT_APPEND',
			windowId: defaultWindowId,
			message: buildMessage(ChatRole.User, 'Test', []),
		});
		state = appReducer(state, {
			type: 'AI_CHAT_APPEND',
			windowId: defaultWindowId,
			message: buildMessage(
				ChatRole.Assistant,
				'Testing',
				[{ toolName: 'testTool', callId: 'call-1', arguments: { arg: 1 }, parseError: null }],
			),
		});
		state = appReducer(state, {
			type: 'AI_CHAT_ADD_TOOL_RESULT',
			windowId: defaultWindowId,
			toolCall: ({
				role: ChatRole.Tool,
				toolName: 'testTool',
				toolCallId: 'call-1',
				userDescription: '',
				isError: false,
				content: 'Result',
			} satisfies ChatToolMessage),
		});

		expect(state.aiChatMessages).toMatchObject([
			{ id: 'id-0', role: 'user', text: 'Test', raw: [{ role: 'user' }] },
			{ id: 'id-1', role: 'assistant', text: 'Testing', editsApplied: 1, editsMissed: 0 },
		]);


		state = appReducer(state, {
			type: 'AI_CHAT_RESET',
			windowId: defaultWindowId,
		});

		expect(state.aiChatMessages).toEqual([]);
	});
});
