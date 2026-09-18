import { ChatRole } from '../types';
import { _internal } from './Anthropic';

describe('ai/providers/Anthropic', () => {
	it('should make tool calls compatible with the Anthropic API', () => {
		const { turnMessages } = _internal.convertMessages([
			{ role: ChatRole.User, content: 'Do something' },
			{
				role: ChatRole.Assistant,
				content: 'okay',
				toolCalls: [
					{ toolName: 'replaceRange', callId: 'call-1', arguments: { text: 'test', anchor: 'original' }, parseError: null },
					{ toolName: 'replaceRange', callId: 'call-2', arguments: { text: 'test-2', anchor: 'other' }, parseError: null },
				],
			},
			{
				role: ChatRole.Tool,
				content: 'success',
				userDescription: 'replaced',
				toolCallId: 'call-1',
				toolName: 'replaceRange',
				isError: false,
				isEdit: true,
			},
			{
				role: ChatRole.Tool,
				userDescription: 'failed',
				content: 'anchor-not-found',
				toolCallId: 'call-2',
				toolName: 'replaceRange',
				isError: true,
				isEdit: true,
			},
			{
				role: ChatRole.User,
				content: 'testing...',
			},
		]);

		expect(turnMessages).toMatchObject([
			{ role: 'user', content: 'Do something' },
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'okay' },
					{ type: 'tool_use', name: 'replaceRange', id: 'call-1', input: { text: 'test', anchor: 'original' } },
					{ type: 'tool_use', name: 'replaceRange', id: 'call-2', input: { text: 'test-2', anchor: 'other' } },
				],
			},
			{
				role: 'user',
				content: [
					{ type: 'tool_result', tool_use_id: 'call-1', content: 'success' },
					{ type: 'tool_result', tool_use_id: 'call-2', content: 'anchor-not-found' },
				],
			},
			{
				role: 'user',
				content: 'testing...',
			},
		]);
	});
});
