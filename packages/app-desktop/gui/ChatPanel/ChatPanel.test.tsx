import * as React from 'react';
import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import BaseModel from '@joplin/lib/BaseModel';
import Note from '@joplin/lib/models/Note';
import CommandService from '@joplin/lib/services/CommandService';
import { runNoteChat } from '@joplin/lib/services/ai/noteChat';
import { ChatRole } from '@joplin/lib/services/ai/types';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import appReducer, { AiChatMessage, createAppDefaultState, createAppDefaultWindowState } from '../../app.reducer';
import ChatPanel from './ChatPanel';
import { WindowIdContext } from '../NewWindowOrIFrame';
import dialogs from '../dialogs';
import '../../utils/window/eventHandlerOverrides';

jest.mock('@joplin/lib/services/ai/noteChat', () => ({ runNoteChat: jest.fn() }));
jest.mock('./ChatMessageItem', () => ({ message }: { message: { text: string } }) => <div>{message.text}</div>);

const Panel = ChatPanel.WrappedComponent;
const message: AiChatMessage = { id: 'question', role: 'user', text: 'Question', raw: [], noteId: 'note-a', noteTitle: 'A' };

const renderPanel = (props: Partial<React.ComponentProps<typeof Panel>> = {}) => render(
	<WindowIdContext.Provider value='second'><Panel
		themeId={1} available={true} unavailableHint='' providerType='joplin-cloud'
		noteId={null} noteTitle='' noteIsEncrypted={false} messages={[]} aiDegraded={false} dispatch={jest.fn()}
		{...props}
	/></WindowIdContext.Provider>,
);

const openHistory = async (view: ReturnType<typeof render>) => {
	await act(async () => { fireEvent.click(view.getByText('Chat history')); });
};

const saveConversation = async (id: string, title: string, updatedTime = 1) => {
	await BaseModel.db().exec('INSERT INTO chat_conversations (id, title, created_time, updated_time) VALUES (?, ?, 1, ?)', [id, title, updatedTime]);
};

const saveMessage = async (conversationId: string, text: string) => {
	await BaseModel.db().exec('INSERT INTO chat_messages (id, conversation_id, role, text, position, created_time) VALUES (?, ?, ?, ?, 0, 1)', [conversationId, conversationId, 'user', text]);
};

describe('ChatPanel', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await BaseModel.db().exec('DELETE FROM chat_messages');
		await BaseModel.db().exec('DELETE FROM chat_conversations');
		Element.prototype.scrollIntoView = jest.fn();
		jest.mocked(runNoteChat).mockReset();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should search conversation titles and messages', async () => {
		await saveConversation('shopping', 'Shopping list');
		await saveConversation('travel', 'Travel plans');
		await saveMessage('travel', 'Visit Paris');
		const view = renderPanel();
		await openHistory(view);
		await view.findByText('Shopping list');
		const search = view.getByRole('searchbox', { name: 'Search conversations' });
		fireEvent.change(search, { target: { value: 'Shopping' } });
		expect(view.getAllByRole('listitem')).toHaveLength(1);
		expect(view.getByText('Shopping list')).toBeTruthy();
		fireEvent.change(search, { target: { value: 'Paris' } });
		expect(await view.findByText('Travel plans')).toBeTruthy();
		expect(view.getAllByRole('listitem')).toHaveLength(1);
		fireEvent.change(search, { target: { value: '' } });
		expect(await view.findByText('Shopping list')).toBeTruthy();
		expect(view.getAllByRole('listitem')).toHaveLength(2);
	});

	it('should save and display a renamed conversation title', async () => {
		await saveConversation('chat-1', 'Old title');
		jest.spyOn(dialogs, 'prompt').mockResolvedValue('New title');
		const view = renderPanel();
		await openHistory(view);
		const row = (await view.findByText('Old title')).closest('li');
		fireEvent.click(within(row).getByText('Actions'));
		await act(async () => { fireEvent.click(within(row).getByRole('button', { name: 'Rename' })); });
		expect(await view.findByText('New title')).toBeTruthy();
		expect(await BaseModel.db().selectOne('SELECT title FROM chat_conversations WHERE id = ?', ['chat-1'])).toEqual({ title: 'New title' });
	});

	it('should delete the selected conversation and its messages', async () => {
		await saveConversation('delete-chat', 'Delete this chat');
		await saveConversation('keep-chat', 'Keep this chat');
		await saveMessage('delete-chat', 'Delete this message');
		await saveMessage('keep-chat', 'Keep this message');
		const dispatch = jest.fn();
		const view = renderPanel({ conversationId: 'delete-chat', dispatch });
		await openHistory(view);
		const row = (await view.findByText('Delete this chat')).closest('li');
		fireEvent.click(within(row).getByText('Actions'));
		await act(async () => { fireEvent.click(within(row).getByRole('button', { name: 'Delete' })); });
		await waitFor(() => expect(view.queryByText('Delete this chat')).toBeNull());
		expect(view.getByText('Keep this chat')).toBeTruthy();
		expect(await BaseModel.db().selectAll('SELECT id FROM chat_conversations')).toEqual([{ id: 'keep-chat' }]);
		expect(await BaseModel.db().selectAll('SELECT text FROM chat_messages')).toEqual([{ text: 'Keep this message' }]);
		expect(dispatch).toHaveBeenCalledWith({ type: 'AI_CHAT_DELETE', conversationId: 'delete-chat' });
	});

	it('should keep history when New chat opens an empty conversation in the current window', async () => {
		const dispatch = jest.fn();
		const view = renderPanel({ conversationId: 'chat-1', messages: [message], dispatch });
		await act(async () => { fireEvent.click(view.getByRole('button', { name: 'New chat' })); });
		await waitFor(() => expect(dispatch).toHaveBeenCalled());
		expect(await BaseModel.db().selectOne('SELECT title FROM chat_conversations WHERE id = ?', ['chat-1'])).toEqual({ title: 'Question' });
		expect(await BaseModel.db().selectAll('SELECT text FROM chat_messages WHERE conversation_id = ?', ['chat-1'])).toEqual([{ text: 'Question' }]);
		const action = dispatch.mock.calls[0][0];
		expect(action).toEqual({ type: 'AI_CHAT_OPEN', windowId: 'second', conversationId: expect.any(String), messages: [] });
		expect(action.conversationId).not.toBe('chat-1');
		const state = createAppDefaultState({});
		state.aiChatConversationId = 'main-chat';
		state.aiChatMessages = [message];
		state.backgroundWindows = { second: { ...createAppDefaultWindowState(), windowId: 'second' } };
		const opened = appReducer(state, action);
		expect(opened.aiChatConversationId).toBe('main-chat');
		expect(opened.aiChatMessages).toEqual([message]);
		expect(opened.backgroundWindows.second.aiChatConversationId).toBe(action.conversationId);
		expect(opened.backgroundWindows.second.aiChatMessages).toEqual([]);
	});

	it('should save the current conversation and open the selected history row', async () => {
		await saveConversation('chat-1', 'Current chat');
		await saveConversation('chat-2', 'Saved chat');
		const execute = jest.spyOn(CommandService.instance(), 'executeInWindow').mockResolvedValue(undefined);
		const view = renderPanel({ conversationId: 'chat-1', messages: [message] });
		await openHistory(view);
		fireEvent.click(await view.findByRole('button', { name: /Saved chat/ }));
		await waitFor(() => expect(execute).toHaveBeenCalledWith('openAiChatConversation', { windowId: 'second', args: ['chat-2'] }));
		expect(await BaseModel.db().selectAll('SELECT text FROM chat_messages WHERE conversation_id = ?', ['chat-1'])).toEqual([{ text: 'Question' }]);
	});

	it('should capture the active note ID and title on the question and reply', async () => {
		jest.spyOn(Note, 'load').mockResolvedValue({ id: 'note-a', title: 'A', body: '' });
		jest.mocked(runNoteChat).mockImplementation(async (_context, _history, _text, _tools, onHistoryChanged) => {
			onHistoryChanged([{ role: ChatRole.System, content: '' }, { role: ChatRole.Assistant, content: 'Reply' }]);
			return [];
		});
		const dispatch = jest.fn();
		const view = renderPanel({ noteId: 'note-a', noteTitle: 'A', dispatch });
		fireEvent.change(view.getByRole('textbox'), { target: { value: 'Question' } });
		await act(async () => { fireEvent.click(view.getByRole('button', { name: 'Send' })); });
		expect(dispatch.mock.calls.map(([action]) => action.message)).toMatchObject([
			{ role: 'user', text: 'Question', noteId: 'note-a', noteTitle: 'A' },
			{ role: 'assistant', text: 'Reply', noteId: 'note-a', noteTitle: 'A' },
		]);
	});
});
