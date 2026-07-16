import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { AiChatMessage } from '../../app.reducer';
import InlineMarkdownDisplay from '../InlineMarkdownDisplay';
import { ChatMessage, ChatRole } from '@joplin/lib/services/ai/types';


const editsSummary = (actions: ChatMessage[], applied: number, missed: number) => {
	if (applied + missed === 0) return '';
	if (missed === 0 && applied > 1) return _('%d edit(s) applied.', applied);
	if (missed === 0) {
		const toolResults = actions.filter(action => action.role === ChatRole.Tool);
		return toolResults.map(result => result.userDescription).join('\n');
	}
	return _('%d edit(s) applied, %d could not be placed automatically.', applied, missed);
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

	const summary = message.role === 'assistant' ? editsSummary(message.raw, message.editsApplied ?? 0, message.editsMissed ?? 0) : '';
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
					{(message.editsMissed ?? 0) > 0
						? <span className='warning'>{summary}</span>
						: <span>{summary}</span>}
				</div>
			)}
		</div>
	);
};

export default ChatMessageItem;
