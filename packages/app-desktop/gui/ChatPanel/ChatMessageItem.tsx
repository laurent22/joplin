import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { AiChatMessage } from '../../app.reducer';
import InlineMarkdownDisplay from '../InlineMarkdownDisplay';
import { ChatMessage, ChatRole, ChatToolMessage } from '@joplin/lib/services/ai/types';


const toolResultSummary = (actions: ChatMessage[]) => {
	const toolResults = actions.filter(action => action.role === ChatRole.Tool);

	const editSummary = () => {
		let applied = 0;
		let missed = 0;
		let lastEdit: ChatToolMessage|null = null;
		for (const result of toolResults) {
			if (!result.isEdit) continue;

			if (result.isError) {
				missed ++;
			} else {
				applied ++;
				lastEdit = result;
			}
		}

		if (applied + missed === 0) return '';
		if (missed === 0 && applied > 1) return _('%d edit(s) applied.', applied);
		if (missed === 0 && lastEdit) return lastEdit.userDescription;
		return _('%d edit(s) applied, %d could not be placed automatically.', applied, missed);
	};

	return [
		...toolResults
			.filter(result => !result.isEdit)
			.map(result => result.userDescription),
		editSummary(),
	]
		.filter(item => !!item)
		.join('\n');
};

const hasToolError = (actions: ChatMessage[]) => {
	return actions.some(action => action.role === ChatRole.Tool && action.isError);
};

interface Props {
	message: AiChatMessage;
}

const ChatMessageItem: React.FC<Props> = ({ message }) => {
	if (message.role === 'separator') {
		return <div className='separator'>{message.text}</div>;
	}
	if (message.role === 'error') {
		return <div className='error'>{message.text}</div>;
	}

	const summary = message.role === 'assistant' ? toolResultSummary(message.raw) : '';
	// Always show something in the message box:
	const textContent = !message.text && !summary ? _('(no message)') : message.text;

	const renderMarkdown = message.role === 'assistant';
	const content = renderMarkdown
		? <InlineMarkdownDisplay
			className='content'
			markdown={textContent}
			allowLinks={false} />
		: <div className='content'>{textContent}</div>;

	return (
		<div className={`chat-message turn -${message.role}`}>
			{content}
			{summary && (
				<div className='meta'>
					{hasToolError(message.raw)
						? <span className='warning'>{summary}</span>
						: <span>{summary}</span>}
				</div>
			)}
		</div>
	);
};

export default ChatMessageItem;
