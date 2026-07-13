import * as React from 'react';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { _ } from '@joplin/lib/locale';
import Setting from '@joplin/lib/models/Setting';
import Note from '@joplin/lib/models/Note';
import CommandService from '@joplin/lib/services/CommandService';
import Logger from '@joplin/utils/Logger';
import { stateUtils } from '@joplin/lib/reducer';
import { AiChatMessage, AppState } from '../../app.reducer';
import { runNoteChat } from '@joplin/lib/services/ai/noteChat';
import { chatAvailability } from '@joplin/lib/services/ai/availability';
import { WindowIdContext } from '../NewWindowOrIFrame';
import AiDegradedNotice from '../AiDegradedNotice';
import { ChatMessage, ChatRole, ChatToolMessage } from '@joplin/lib/services/ai/types';
import JoplinError from '@joplin/lib/JoplinError';
import eventManager, { EventName, ItemChangeEvent } from '@joplin/lib/eventManager';
import { Second } from '@joplin/utils/time';
import InlineMarkdownDisplay from '../InlineMarkdownDisplay';

const logger = Logger.create('ChatPanel');

interface Props {
	themeId: number;
	available: boolean;
	unavailableHint: string;
	providerType: string;
	noteId: string | null;
	noteTitle: string;
	noteIsEncrypted: boolean;
	messages: AiChatMessage[];
	aiDegraded: boolean;
	dispatch: Dispatch;
}

const disclosureSetting = 'ai.chat.disclosureAcknowledged';

let nextMessageId = 0;
const makeId = () => `m-${Date.now()}-${++nextMessageId}`;

const editsSummary = (actions: ChatMessage[], applied: number, missed: number) => {
	if (applied + missed === 0) return '';
	if (missed === 0 && applied > 1) return _('%d edit(s) applied.', applied);
	if (missed === 0) {
		const toolResults = actions.filter(action => action.role === ChatRole.Tool);
		return toolResults.map(result => result.userDescription).join('\n');
	}
	return _('%d edit(s) applied, %d could not be placed automatically.', applied, missed);
};

const waitForNextNoteChangeOrTimeout = (noteId: string, timeout: number) => {
	return new Promise<void>((resolve) => {
		const listener = (event: ItemChangeEvent) => {
			if (event.itemId === noteId) {
				onComplete();
			}
		};
		const onComplete = () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
			eventManager.off(EventName.ItemChange, listener);
			resolve();
		};
		eventManager.on(EventName.ItemChange, listener);

		let timeoutId = setTimeout(() => {
			onComplete();
		}, timeout);
	});
};

const useCancelCallback = () => {
	const abortControllerRef = useRef(new AbortController());

	const cancelRequest = useCallback(() => {
		abortControllerRef.current.abort();
		abortControllerRef.current = new AbortController();
	}, []);

	// Cancel on Reset / unmount so an in-flight reply can detect it should
	// abort instead of landing in a cleared or destroyed conversation.
	const cancelRequestRef = useRef(cancelRequest);
	cancelRequestRef.current = cancelRequest;
	useEffect(() => () => {
		cancelRequestRef.current();
	}, []);

	return { abortControllerRef, cancelRequest };
};

// Single-window for v1: mapStateToProps hard-codes defaultWindowId and the
// toggle writes to the app-wide layout. A second window would mirror the main.
const ChatPanel: React.FC<Props> = (props) => {
	const { dispatch, messages } = props;
	const [input, setInput] = useState('');
	const [sending, setSending] = useState(false);
	const [disclosureShown, setDisclosureShown] = useState<boolean>(() => {
		try {
			return !!Setting.value(disclosureSetting);
		} catch {
			return false;
		}
	});

	const lastNoteIdRef = useRef<string | null>(props.noteId);
	const messagesLengthRef = useRef(messages.length);
	messagesLengthRef.current = messages.length;
	// Lets async work detect note switches without re-running its closure.
	const noteIdRef = useRef(props.noteId);
	noteIdRef.current = props.noteId;
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const { abortControllerRef, cancelRequest } = useCancelCallback();

	const windowId = useContext(WindowIdContext);

	const appendMessage = useCallback((message: AiChatMessage) => {
		dispatch({ type: 'AI_CHAT_APPEND', windowId, message });
	}, [dispatch, windowId]);

	const addToolResult = useCallback((result: ChatToolMessage) => {
		dispatch({ type: 'AI_CHAT_ADD_TOOL_RESULT', windowId, toolCall: result });
	}, [dispatch, windowId]);

	// Drop a separator when the active note changes mid-conversation. Skip
	// the first ever opened note (no prior context to separate from).
	useEffect(() => {
		const prev = lastNoteIdRef.current;
		lastNoteIdRef.current = props.noteId;
		if (prev === null || prev === props.noteId || !props.noteId) return;
		if (messagesLengthRef.current === 0) return;
		appendMessage({
			id: makeId(),
			role: 'separator',
			text: _('— now viewing: %s —', props.noteTitle || _('(untitled)')),
			raw: [],
		});
	}, [props.noteId, props.noteTitle, appendMessage]);

	useEffect(() => {
		if (messages.length === 0) return;
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const conversationTurns = useMemo<ChatMessage[]>(() => {
		return messages
			.map(m => m.raw)
			.flat();
	}, [messages]);

	// Joplin Cloud is remote but the user already consented via sync setup.
	const requiresDisclosure = props.providerType !== 'joplin-cloud';
	const showDisclosure = requiresDisclosure && !disclosureShown && messages.length === 0;

	const handleSend = useCallback(async () => {
		const text = input.trim();
		if (!text || sending) return;
		if (!props.noteId) {
			appendMessage({
				id: makeId(), role: 'error', text: _('Open a note to start chatting.'), raw: [],
			});
			return;
		}
		const abortController = abortControllerRef.current;

		const noteIdAtStart = props.noteId;
		setSending(true);
		setInput('');

		// Captured so we can roll it back on failure — otherwise a retry would
		// send the prior user turn as history alongside the new prompt.
		const userTurnId = makeId();
		let hadSuccessfulResponse = false;
		appendMessage({ id: userTurnId, role: 'user', text, raw: [] });

		try {
			const note = await Note.load(props.noteId);
			if (!note) throw new Error(`Note not found: ${props.noteId}`);

			const getContext = async () => {
				let selection = '';
				try {
					selection = await CommandService.instance().executeInWindow(
						'selectedText', { windowId, args: [] },
					) as string || '';
				} catch {
					// Editor may not be ready; treat as no selection.
				}

				const note = await Note.load(props.noteId);
				if (!note) throw new Error(`Note not found: ${props.noteId}`);

				return {
					body: note.body,
					title: note.title,
					selection,
				};
			};

			let lastHistory = [
				{ role: ChatRole.System, content: 'placeholder' },
				...conversationTurns,
			];

			const onHistoryChanged = (history: ChatMessage[]) => {
				if (abortController.signal.aborted) return;

				for (let i = lastHistory.length; i < history.length; i++) {
					const entry = history[i];

					// User messages are added elsewhere, when the user submits the chat
					if (entry.role === ChatRole.User) continue;
					// System messages are not shown in the UI
					if (entry.role === ChatRole.System) continue;

					hadSuccessfulResponse = true;

					if (entry.role === ChatRole.Tool) {
						addToolResult(entry);
					} else {
						appendMessage({
							id: makeId(),
							role: entry.role,
							text: entry.content,
							raw: [entry],
						});
					}
				}

				lastHistory = history;
			};

			const assertSameNote = () => {
				if (noteIdAtStart !== noteIdRef.current) {
					cancelRequest();
					throw new JoplinError(
						_('You switched notes while the request was running; edits were not applied. Try again.'), 'aiNoteChanged',
					);
				}
			};

			await runNoteChat(
				getContext, conversationTurns, text, {
					replaceSelection: async (text, oldText) => {
						if (text === oldText) return;
						assertSameNote();

						const changeListener = waitForNextNoteChangeOrTimeout(props.noteId, Second);
						await CommandService.instance().executeInWindow('replaceSelection', {
							windowId,
							args: [text],
						});
						await changeListener;
					},
					updateNoteBody: async (newBody, oldBody) => {
						if (newBody === oldBody) return;
						assertSameNote();

						const changeListener = waitForNextNoteChangeOrTimeout(props.noteId, Second);
						await CommandService.instance().executeInWindow('editor.setText', {
							windowId,
							args: [newBody],
						});
						await changeListener;
					},
					displayError: (message) => {
						appendMessage({ id: makeId(), role: 'error', text: message, raw: [] });
					},
				}, onHistoryChanged, abortController.signal,
			);
		} catch (error) {
			logger.warn('Chat failed:', error);
			if (abortController.signal.aborted) return;

			if (!hadSuccessfulResponse) {
				dispatch({ type: 'AI_CHAT_REMOVE', windowId, id: userTurnId });
				setInput(text);
			}
			appendMessage({ id: makeId(), role: 'error', text: error.message || _('Something went wrong.'), raw: [] });
		} finally {
			setSending(false);
		}
	}, [input, sending, props.noteId, conversationTurns, windowId, addToolResult, appendMessage, dispatch, cancelRequest, abortControllerRef]);

	const handleAcknowledgeDisclosure = useCallback(() => {
		Setting.setValue(disclosureSetting, true);
		setDisclosureShown(true);
	}, []);

	const handleReset = useCallback(() => {
		cancelRequest();

		dispatch({ type: 'AI_CHAT_RESET', windowId: windowId });
	}, [dispatch, windowId, cancelRequest]);

	const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// Don't send while an IME composition is in flight — Enter commits
		// the composition for CJK / accented input.
		if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
			e.preventDefault();
			if (!sending) void handleSend();
		}
	}, [handleSend, sending]);

	if (!props.available) {
		return (
			<div className='chat-panel'>
				<div className='header'>
					<span className='title'>{_('AI Chat')}</span>
				</div>
				<div className='disabled-message'>
					{props.unavailableHint}
				</div>
			</div>
		);
	}

	if (props.noteIsEncrypted) {
		return (
			<div className='chat-panel'>
				<div className='header'>
					<span className='title'>{_('AI Chat')}</span>
				</div>
				<div className='disabled-message'>
					{_('This note is encrypted and cannot be used with AI Chat.')}
				</div>
			</div>
		);
	}

	return (
		<div className='chat-panel'>
			<div className='header'>
				<span className='title'>{_('AI Chat')}</span>
				{messages.length > 0 && (
					<button type='button' className='reset' onClick={handleReset}>{_('Reset')}</button>
				)}
			</div>
			{props.aiDegraded && <AiDegradedNotice className='degraded-status' />}
			<div className='messages'>
				{messages.length === 0 && (
					<div className='empty'>
						{_('Ask about this note, or request changes. Select text in the editor first to scope the request to that selection.')}
					</div>
				)}
				{messages.map(m => {
					if (m.role === 'separator') {
						return <div key={m.id} className='separator'>{m.text}</div>;
					}
					if (m.role === 'error') {
						return <div key={m.id} className='error'>{m.text}</div>;
					}

					const summary = m.role === 'assistant' ? editsSummary(m.raw, m.editsApplied ?? 0, m.editsMissed ?? 0) : '';
					// Always show something in the message box:
					const textContent = !m.text && !summary ? _('(no message)') : m.text;

					const renderMarkdown = m.role === 'assistant';
					const content = renderMarkdown
						? <InlineMarkdownDisplay
							className='content'
							markdown={textContent}
							allowLinks={false} />
						: <div className='content'>{textContent}</div>;

					return (
						<div key={m.id} className={`turn -${m.role}`}>
							{content}
							{summary && (
								<div className='meta'>
									{(m.editsMissed ?? 0) > 0
										? <span className='warning'>{summary}</span>
										: <span>{summary}</span>}
								</div>
							)}
						</div>
					);
				})}
				<div ref={messagesEndRef} />
			</div>
			<div className='composer'>
				{showDisclosure && (
					<div className='disclosure'>
						{_('Your note will be sent to the configured AI provider (%s).', props.providerType)}
						{' '}
						<a href='#' onClick={(e) => { e.preventDefault(); handleAcknowledgeDisclosure(); }}>{_('Don\'t show again')}</a>
					</div>
				)}
				<div className='input-wrapper'>
					<textarea
						className='input'
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={_('Ask about this note, or request a change…')}
						aria-label={_('Chat message')}
					/>
					<button
						type='button'
						className='send'
						onClick={() => { void handleSend(); }}
						disabled={sending || !input.trim()}
						aria-label={sending ? _('Sending') : _('Send')}
						title={sending ? _('Sending…') : _('Send')}
					>
						<i className={sending ? 'fas fa-spinner' : 'fas fa-paper-plane'} aria-hidden='true' />
					</button>
				</div>
			</div>
		</div>
	);
};

interface OwnProps {
	windowId: string;
}

const mapStateToProps = (state: AppState, ownProps: OwnProps) => {
	const windowState = stateUtils.windowStateById(state, ownProps.windowId);
	const noteId = stateUtils.selectedNoteId(windowState);
	const note = noteId ? windowState.notes.find(n => n.id === noteId) : null;
	const availability = chatAvailability();
	return {
		themeId: state.settings.theme,
		available: availability.available,
		unavailableHint: availability.hint ?? '',
		providerType: state.settings['ai.chat.providerType'] || 'openai-compatible',
		noteId,
		noteTitle: note?.title || '',
		noteIsEncrypted: !!note?.encryption_applied,
		messages: windowState.aiChatMessages || [],
		aiDegraded: !!state.aiStatus?.degraded,
	};
};

export default connect(mapStateToProps)(ChatPanel);
