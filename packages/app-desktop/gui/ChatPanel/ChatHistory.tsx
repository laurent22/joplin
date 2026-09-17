import * as React from 'react';
import { useState } from 'react';
import { _ } from '@joplin/lib/locale';
import { formatMsToRelativeTime } from '@joplin/utils/time';

export interface Conversation {
	id: string;
	title: string;
	updated_time: number;
	messageTexts: string[];
}

interface Props {
	conversations: Conversation[];
	currentConversationId?: string;
	onToggle: (event: React.SyntheticEvent<HTMLDetailsElement>)=> void;
	onOpen: (conversationId: string)=> void;
	onRename: (conversation: Conversation)=> void;
	onDelete: (conversationId: string)=> void;
}

const ChatHistory: React.FC<Props> = props => {
	const [search, setSearch] = useState('');
	const searchQuery = search.trim().toLowerCase();
	const conversations = props.conversations.filter(conversation => conversation.title.toLowerCase().includes(searchQuery)
		|| conversation.messageTexts.some(text => text.toLowerCase().includes(searchQuery)));

	return <details className='chat-history history' onToggle={props.onToggle}>
		<summary className='toggle' onClick={event => event.stopPropagation()}>{_('Chat history')}</summary>
		<input
			className='search'
			type='search'
			aria-label={_('Search conversations')}
			placeholder={_('Search conversations')}
			value={search}
			onChange={event => setSearch(event.target.value)}
		/>
		<ul className='conversations' aria-label={_('Conversations')}>
			{conversations.map(conversation => {
				const current = conversation.id === props.currentConversationId;
				const title = conversation.title || _('(untitled)');
				return <li key={conversation.id} className={`conversation${current ? ' -current' : ''}`} aria-current={current ? 'true' : undefined}>
					<button className='open' type='button' onClick={() => props.onOpen(conversation.id)}>
						<span className='title'>{title}</span>
						<span className='timestamp'>{formatMsToRelativeTime(conversation.updated_time)}</span>
					</button>
					<details className='menu' onToggle={event => event.stopPropagation()}>
						<summary className='toggle' onClick={event => event.stopPropagation()} aria-label={_('Actions for %s', title)}>{_('Actions')}</summary>
						<button className='action' type='button' onClick={() => props.onRename(conversation)}>{_('Rename')}</button>
						<button className='action' type='button' onClick={() => props.onDelete(conversation.id)}>{_('Delete')}</button>
					</details>
				</li>;
			})}
		</ul>
	</details>;
};

export default ChatHistory;
