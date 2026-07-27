import * as React from 'react';
import { useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
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
import ChatMessageItem from './ChatMessageItem';

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

const useHasFocus = () => {
	const [hasFocus, setHasFocus] = useState(false);
	const onFocus = useCallback(() => setHasFocus(true), []);
	const onBlur: React.FocusEventHandler<HTMLDivElement> = useCallback((event) => {
		const chatPanelContainer = event.currentTarget;
		const newElementWithFocus = event.relatedTarget;
		const movingFocusOut = !chatPanelContainer.contains(newElementWithFocus);

		// Avoid quickly toggling hasFocus: onBlur/onFocus are emitted when moving focus between
		// elements within the container.
		if (movingFocusOut) {
			setHasFocus(false);
		}
	}, []);

	return { hasFocus, onFocus, onBlur };
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

	const { hasFocus, onFocus, onBlur } = useHasFocus();

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

		const text = _('— now viewing: %s —', props.noteTitle || _('(untitled)'));
		appendMessage({
			id: makeId(),
			role: 'separator',
			text,
			raw: [{ role: ChatRole.User, content: _('Switched notes: %s', text) }],
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

	const handleCancel = useCallback(() => {
		cancelRequest();
		appendMessage({ id: makeId(), role: 'assistant', text: _('(Cancelled)'), raw: [] });
	}, [cancelRequest, appendMessage]);

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
		let hadVisibleResponse = false;
		appendMessage({
			id: userTurnId,
			role: 'user',
			text,
			raw: [{ role: ChatRole.User, content: text }],
		});

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

					if (entry.role === ChatRole.Tool) {
						addToolResult(entry);
					} else {
						hadVisibleResponse ||= !entry.hide;

						appendMessage({
							id: makeId(),
							role: entry.role,
							text: entry.content,
							hide: entry.hide,
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

			if (!hadVisibleResponse) {
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

	const renderContent = () => {
		if (!props.available) {
			const content = (
				<div className='disabled-message'>
					{props.unavailableHint}
				</div>
			);
			return { content, showingMessages: false };
		}
		if (props.noteIsEncrypted) {
			const content = (
				<div className='disabled-message'>
					{_('This note is encrypted and cannot be used with AI Chat.')}
				</div>
			);
			return { content, showingMessages: false };
		}

		const visibleMessages = messages.filter(m => !m.hide);

		const content = <>
			{props.aiDegraded && <AiDegradedNotice className='degraded-status' />}
			<div className='messages' aria-live={hasFocus ? 'polite' : undefined}>
				{visibleMessages.length === 0 && (
					<div className='empty'>
						{_('Ask about this note, or request changes. Select text in the editor first to scope the request to that selection.')}
					</div>
				)}
				{visibleMessages.map(m => <ChatMessageItem key={m.id} message={m}/>)}
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
						onClick={sending ? handleCancel : handleSend}
						disabled={!sending && !input.trim()}
						aria-label={sendButtonLabel}
						title={sendButtonLabel}
					>
						<i className={sending ? 'fas fa-stop' : 'fas fa-paper-plane'} aria-hidden='true' />
					</button>
				</div>
			</div>
		</>;

		return { content, showingMessages: visibleMessages.length > 0 };
	};

	const sendButtonLabel = sending ? _('Stop generating') : _('Send');
	const headerId = useId();
	const { content, showingMessages } = renderContent();

	return (
		<div
			className='chat-panel'
			role='region'
			aria-labelledby={headerId}
			onFocus={onFocus}
			onBlur={onBlur}
		>
			<div className='header'>
				<h1 className='title' id={headerId}>{_('AI Chat')}</h1>
				{showingMessages && (
					<button type='button' className='reset' onClick={handleReset}>{_('Reset')}</button>
				)}
			</div>
			{content}
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
