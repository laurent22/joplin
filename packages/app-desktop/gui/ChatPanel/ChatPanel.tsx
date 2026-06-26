import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { _ } from '@joplin/lib/locale';
import Setting from '@joplin/lib/models/Setting';
import Note from '@joplin/lib/models/Note';
import CommandService from '@joplin/lib/services/CommandService';
import Logger from '@joplin/utils/Logger';
import { defaultWindowId, stateUtils } from '@joplin/lib/reducer';
import { AiChatMessage, AppState } from '../../app.reducer';
import { runNoteChat, ChatTurn } from '@joplin/lib/services/ai/noteChat';
import { applyAnchorEdits } from '@joplin/lib/services/ai/applyNoteEdits';

const logger = Logger.create('ChatPanel');

interface Props {
	themeId: number;
	aiEnabled: boolean;
	providerType: string;
	noteId: string | null;
	noteTitle: string;
	noteIsEncrypted: boolean;
	messages: AiChatMessage[];
	dispatch: Dispatch;
}

const disclosureSetting = 'ai.chat.disclosureAcknowledged';

let nextMessageId = 0;
const makeId = () => `m-${Date.now()}-${++nextMessageId}`;

const editsSummary = (applied: number, missed: number) => {
	if (applied + missed === 0) return '';
	if (missed === 0) return _('%d edit(s) applied.', applied);
	return _('%d edit(s) applied, %d could not be placed automatically.', applied, missed);
};

// v1 scope: the panel is single-window. mapStateToProps reads `defaultWindowId`
// and the toggle command writes to the app-wide layout. `aiChatMessages`
// lives in window state for future multi-window support, but a second window
// would currently mirror the main window's conversation.

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
	// noteIdRef mirrors props.noteId so async work can detect note switches
	// without re-running its closure each time the prop changes.
	const noteIdRef = useRef(props.noteId);
	noteIdRef.current = props.noteId;
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Bumped whenever the user resets the conversation or the panel
	// unmounts. handleSend captures the generation at start and bails before
	// appending if it no longer matches — prevents an in-flight reply from
	// landing in a cleared conversation.
	const generationRef = useRef(0);
	useEffect(() => () => { generationRef.current++; }, []);

	const appendMessage = useCallback((message: AiChatMessage) => {
		dispatch({ type: 'AI_CHAT_APPEND', message });
	}, [dispatch]);

	// When the active note changes mid-conversation, drop a separator so the
	// user can see the context shifted. Don't reset history — that's the
	// sticky-conversation model.
	//
	// Guard: skip when the previous noteId was null (first-ever opened note
	// after the panel mounted — no prior context to separate from).
	useEffect(() => {
		const prev = lastNoteIdRef.current;
		lastNoteIdRef.current = props.noteId;
		if (prev === null || prev === props.noteId || !props.noteId) return;
		if (messagesLengthRef.current === 0) return;
		appendMessage({
			id: makeId(),
			role: 'separator',
			text: _('— now viewing: %s —', props.noteTitle || _('(untitled)')),
		});
	}, [props.noteId, props.noteTitle, appendMessage]);

	useEffect(() => {
		if (messages.length === 0) return;
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const conversationTurns = useMemo<ChatTurn[]>(() => {
		return messages
			.filter(m => m.role === 'user' || m.role === 'assistant')
			.map(m => ({ role: m.role as 'user' | 'assistant', content: m.text }));
	}, [messages]);

	// "Remote" from the user's perspective: a destination they may not have
	// already consented to. Joplin Cloud is technically remote but the user
	// opted into it as part of sync setup, so we don't repeat the disclosure.
	const requiresDisclosure = props.providerType !== 'joplin-cloud';
	const showDisclosure = requiresDisclosure && !disclosureShown && messages.length === 0;

	const handleSend = useCallback(async () => {
		const text = input.trim();
		if (!text || sending) return;
		if (!props.noteId) {
			appendMessage({ id: makeId(), role: 'error', text: _('Open a note to start chatting.') });
			return;
		}

		const startGeneration = generationRef.current;
		const noteIdAtStart = props.noteId;
		setSending(true);
		setInput('');

		// Capture the user-turn id so we can roll it back on failure. If we
		// left a failed user turn in history, the next attempt (a retry with
		// the same prompt) would re-send it: the prior user message in
		// `conversationTurns` plus the fresh `text` argument = same prompt
		// twice.
		const userTurnId = makeId();
		appendMessage({ id: userTurnId, role: 'user', text });

		try {
			const note = await Note.load(props.noteId);
			if (!note) throw new Error(`Note not found: ${props.noteId}`);

			let selection = '';
			try {
				selection = await CommandService.instance().execute('selectedText') || '';
			} catch {
				// Editor may not be ready; treat as no selection.
			}

			const reply = await runNoteChat({
				title: note.title || '',
				body: note.body || '',
				selection: selection || null,
			}, conversationTurns, text);

			if (generationRef.current !== startGeneration) return;

			let editsApplied = 0;
			let editsMissed = 0;
			if (reply.edits.length > 0) {
				// If the user switched notes while the request was in flight,
				// the editor commands below (replaceSelection / editor.setText)
				// would run against the new note's editor, silently mutating
				// it. Refuse to apply and tell the user.
				if (noteIdRef.current !== noteIdAtStart) {
					appendMessage({
						id: makeId(),
						role: 'error',
						text: _('You switched notes while the request was running; edits were not applied. Try again.'),
					});
				} else {
					// Re-read the live body just before applying. If the user
					// typed in the editor while the request was in flight, the
					// body we read at send time is stale and writing newBody
					// would silently overwrite those keystrokes.
					const fresh = await Note.load(noteIdAtStart);
					const liveBody = fresh?.body ?? '';

					if (liveBody !== (note.body || '')) {
						appendMessage({
							id: makeId(),
							role: 'error',
							text: _('The note changed while the request was running; edits were not applied. Try again.'),
						});
					} else {
						const selectionEdits = reply.edits.filter(e => e.op === 'replaceSelection');
						const anchorEdits = reply.edits.filter(e => e.op !== 'replaceSelection');

						for (const edit of selectionEdits) {
							if (edit.op !== 'replaceSelection') continue;
							if (!selection) {
								editsMissed++;
								continue;
							}
							await CommandService.instance().execute('replaceSelection', edit.text);
							editsApplied++;
						}

						if (anchorEdits.length > 0) {
							const cursorPos = selection ? Math.max(0, liveBody.indexOf(selection)) : 0;
							const { newBody, appliedEdits } = applyAnchorEdits(liveBody, anchorEdits, cursorPos);
							const missed = appliedEdits.filter(e => e.status !== 'applied').length;
							editsMissed += missed;
							editsApplied += appliedEdits.length - missed;
							if (newBody !== liveBody) {
								await CommandService.instance().execute('editor.setText', newBody);
							}
						}
					}
				}
			}

			if (generationRef.current !== startGeneration) return;

			appendMessage({
				id: makeId(),
				role: 'assistant',
				text: reply.reply || _('(no message)'),
				editsApplied,
				editsMissed,
			});
		} catch (error) {
			logger.warn('Chat failed:', error);
			if (generationRef.current !== startGeneration) return;
			// Drop the optimistic user turn so a retry doesn't re-send it as
			// history alongside the new prompt.
			dispatch({ type: 'AI_CHAT_REMOVE', id: userTurnId });
			// Restore the user's prompt so they can edit and retry instead
			// of re-typing it.
			setInput(text);
			appendMessage({ id: makeId(), role: 'error', text: error.message || _('Something went wrong.') });
		} finally {
			setSending(false);
		}
	}, [input, sending, props.noteId, conversationTurns, appendMessage, dispatch]);

	const handleAcknowledgeDisclosure = useCallback(() => {
		Setting.setValue(disclosureSetting, true);
		setDisclosureShown(true);
	}, []);

	const handleReset = useCallback(() => {
		generationRef.current++;
		dispatch({ type: 'AI_CHAT_RESET' });
	}, [dispatch]);

	const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// Allow Shift+Enter for newlines; ignore plain Enter while sending so
		// the user can keep typing without their next keystroke firing.
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			if (!sending) void handleSend();
		}
	}, [handleSend, sending]);

	if (!props.aiEnabled) {
		return (
			<div className='chat-panel'>
				<div className='header'>
					<span className='title'>{_('AI Chat')}</span>
				</div>
				<div className='disabled-message'>
					{_('AI features are disabled. Enable them in Settings → AI.')}
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
					const summary = m.role === 'assistant' ? editsSummary(m.editsApplied ?? 0, m.editsMissed ?? 0) : '';
					return (
						<div key={m.id} className={`turn -${m.role}`}>
							<div className='content'>{m.text}</div>
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

const mapStateToProps = (state: AppState) => {
	const windowState = stateUtils.windowStateById(state, defaultWindowId);
	const noteId = stateUtils.selectedNoteId(windowState);
	const note = noteId ? windowState.notes.find(n => n.id === noteId) : null;
	return {
		themeId: state.settings.theme,
		aiEnabled: !!state.settings['ai.enabled'],
		providerType: state.settings['ai.chat.providerType'] || 'openai-compatible',
		noteId,
		noteTitle: note?.title || '',
		noteIsEncrypted: !!note?.encryption_applied,
		messages: windowState.aiChatMessages || [],
	};
};

export default connect(mapStateToProps)(ChatPanel);
