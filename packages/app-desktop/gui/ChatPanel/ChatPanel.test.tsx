import * as React from 'react';
import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import BaseModel from '@joplin/lib/BaseModel';
import ChatConversation from '@joplin/lib/models/ChatConversation';
import Note from '@joplin/lib/models/Note';
import CommandService from '@joplin/lib/services/CommandService';
import { runNoteChat } from '@joplin/lib/services/ai/noteChat';
import { ChatRole } from '@joplin/lib/services/ai/types';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import appReducer, { AiChatMessage, createAppDefaultState, createAppDefaultWindowState } from '../../app.reducer';
import ChatPanel from './ChatPanel';
import { WindowIdContext } from '../NewWindowOrIFrame';
import uuid from '@joplin/lib/uuid';
import '../../utils/window/eventHandlerOverrides';

jest.mock('@joplin/lib/services/ai/noteChat', () => ({ runNoteChat: jest.fn() }));
jest.mock('./ChatMessageItem', () => ({ message }: { message: { text: string } }) => <div>{message.text}</div>);

const Panel = ChatPanel.WrappedComponent;
const message: AiChatMessage = { id: 'question', createdTime: 1, role: 'user', text: 'Question', raw: [], noteId: 'note-a', noteTitle: 'A' };

const renderPanel = (props: Partial<React.ComponentProps<typeof Panel>> = {}) => render(
	<WindowIdContext.Provider value='second'><Panel
		themeId={1} available={true} unavailableHint='' providerType='joplin-cloud'
		noteId={null} noteTitle='' noteIsEncrypted={false} messages={[]} aiDegraded={false} dispatch={jest.fn()}
		showToolbarButton={false}
		{...props}
	/></WindowIdContext.Provider>,
);

const openHistory = async (view: ReturnType<typeof render>) => {
	await act(async () => { fireEvent.click(view.getByTitle('Chat history')); });
};

const saveConversation = async (id: string, title: string, updatedTime = 1) => {
	await ChatConversation.save({ id, title, created_time: 1, updated_time: updatedTime }, { isNew: true, autoTimestamp: false });
};

const saveMessage = async (conversationId: string, text: string) => {
	await ChatConversation.addMessage(conversationId, { id: uuid.create(), createdTime: 1, role: 'user', text, raw: [], noteId: '', noteTitle: '' });
};

describe('ChatPanel', () => {
	let modelDispatch: jest.Mock;

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		Element.prototype.scrollIntoView = jest.fn();
		jest.mocked(runNoteChat).mockReset();
		modelDispatch = jest.fn();
		BaseModel.dispatch = modelDispatch;
	});

	afterEach(() => {
		jest.restoreAllMocks();
		BaseModel.dispatch = () => {};
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
		await waitFor(() => expect(view.getAllByRole('listitem')).toHaveLength(1));
		expect(view.getByText('Shopping list')).toBeTruthy();
		fireEvent.change(search, { target: { value: 'Paris' } });
		expect(await view.findByText('Travel plans')).toBeTruthy();
		expect(view.getAllByRole('listitem')).toHaveLength(1);
		fireEvent.change(search, { target: { value: '' } });
		expect(await view.findByText('Shopping list')).toBeTruthy();
		expect(view.getAllByRole('listitem')).toHaveLength(2);
	});

	it('should rename a conversation inline when Enter is pressed', async () => {
		await saveConversation('chat-1', 'Old title');
		const view = renderPanel();
		await openHistory(view);
		const row = (await view.findByText('Old title')).closest('li');
		fireEvent.click(within(row).getByRole('button', { name: 'Rename' }));
		const input = within(row).getByRole('textbox', { name: 'Conversation title' });
		fireEvent.change(input, { target: { value: 'New title' } });
		await act(async () => { fireEvent.keyDown(input, { key: 'Enter' }); });
		expect(await view.findByText('New title')).toBeTruthy();
		expect(view.queryByRole('textbox', { name: 'Conversation title' })).toBeNull();
		expect(await ChatConversation.load('chat-1')).toMatchObject({ title: 'New title' });
	});

	it('should close the history popup when clicking outside of it', async () => {
		await saveConversation('chat-1', 'Saved chat');
		const view = renderPanel();
		await openHistory(view);
		await view.findByText('Saved chat');
		fireEvent.mouseDown(view.getByRole('searchbox', { name: 'Search conversations' }));
		expect(view.getByText('Saved chat')).toBeTruthy();
		fireEvent.mouseDown(view.getByRole('textbox', { name: 'Chat message' }));
		await waitFor(() => expect(view.queryByText('Saved chat')).toBeNull());
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
		await act(async () => { fireEvent.click(within(row).getByRole('button', { name: 'Delete' })); });
		await waitFor(() => expect(view.queryByText('Delete this chat')).toBeNull());
		expect(view.getByText('Keep this chat')).toBeTruthy();
		expect((await ChatConversation.history()).map(conversation => conversation.id)).toEqual(['keep-chat']);
		expect(await ChatConversation.messages('keep-chat')).toMatchObject([{ text: 'Keep this message' }]);
		await saveConversation('delete-chat', 'Recreated chat');
		expect(await ChatConversation.messages('delete-chat')).toEqual([]);
		expect(dispatch).toHaveBeenCalledWith({ type: 'AI_CHAT_DELETE', conversationId: 'delete-chat' });
	});

	it('should keep history when New chat opens an empty conversation in the current window', async () => {
		await saveConversation('chat-1', 'Current chat');
		const dispatch = jest.fn();
		const view = renderPanel({ conversationId: 'chat-1', messages: [message], dispatch });
		await act(async () => { fireEvent.click(view.getByRole('button', { name: 'New chat' })); });
		await waitFor(() => expect(dispatch).toHaveBeenCalled());
		expect(await ChatConversation.load('chat-1')).toMatchObject({ title: 'Current chat' });
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

	it('should not add an empty conversation to history', async () => {
		await saveConversation('chat-1', 'Current chat');
		const before = await ChatConversation.history();
		const dispatch = jest.fn();
		const view = renderPanel({ conversationId: 'chat-1', messages: [message], dispatch });
		await act(async () => { fireEvent.click(view.getByRole('button', { name: 'New chat' })); });
		await waitFor(() => expect(dispatch).toHaveBeenCalled());
		const after = await ChatConversation.history();
		expect(after).toHaveLength(before.length);
	});

	it('should open the selected history row in the current window', async () => {
		await saveConversation('chat-1', 'Current chat');
		await saveConversation('chat-2', 'Saved chat');
		const execute = jest.spyOn(CommandService.instance(), 'executeInWindow').mockResolvedValue(undefined);
		const view = renderPanel({ conversationId: 'chat-1', messages: [message] });
		await openHistory(view);
		fireEvent.click(await view.findByRole('button', { name: /Saved chat/ }));
		await waitFor(() => expect(execute).toHaveBeenCalledWith('openAiChatConversation', { windowId: 'second', args: ['chat-2'] }));
	});

	it('should save the question and reply with the active note ID and title as they are created', async () => {
		jest.spyOn(Note, 'load').mockResolvedValue({ id: 'note-a', title: 'A', body: '' });
		jest.mocked(runNoteChat).mockImplementation(async (_context, _history, _text, _tools, onHistoryChanged) => {
			onHistoryChanged([{ role: ChatRole.System, content: '' }, { role: ChatRole.Assistant, content: 'Reply' }]);
			return [];
		});
		const view = renderPanel({ conversationId: 'chat-1', noteId: 'note-a', noteTitle: 'A' });
		fireEvent.change(view.getByRole('textbox'), { target: { value: 'Question' } });
		await act(async () => { fireEvent.click(view.getByRole('button', { name: 'Send' })); });
		const expected = [
			{ role: 'user', text: 'Question', noteId: 'note-a', noteTitle: 'A' },
			{ role: 'assistant', text: 'Reply', noteId: 'note-a', noteTitle: 'A' },
		];
		await waitFor(async () => expect(await ChatConversation.messages('chat-1')).toMatchObject(expected));
		expect(await ChatConversation.load('chat-1')).toMatchObject({ title: 'Question' });
		const appended = modelDispatch.mock.calls.map(([action]) => action).filter(action => action.type === 'AI_CHAT_APPEND');
		expect(appended).toMatchObject(expected.map(message => ({ conversationId: 'chat-1', message })));
	});

	it('should remove the saved question when the request fails before any reply', async () => {
		jest.spyOn(Note, 'load').mockResolvedValue({ id: 'note-a', title: 'A', body: '' });
		jest.mocked(runNoteChat).mockRejectedValue(new Error('Network down'));
		const view = renderPanel({ conversationId: 'chat-1', noteId: 'note-a', noteTitle: 'A', dispatch: jest.fn() });
		fireEvent.change(view.getByRole('textbox'), { target: { value: 'Question' } });
		await act(async () => { fireEvent.click(view.getByRole('button', { name: 'Send' })); });
		await waitFor(async () => expect(await ChatConversation.messages('chat-1')).toMatchObject([{ role: 'error', text: 'Network down' }]));
	});

	it('should assign an ID before messages are added to a new conversation', async () => {
		const dispatch = jest.fn();
		renderPanel({ dispatch });
		await waitFor(() => expect(dispatch).toHaveBeenCalledWith({
			type: 'AI_CHAT_OPEN', windowId: 'second', conversationId: expect.any(String), messages: [],
		}));
	});
});
