import * as React from 'react';
import { useState } from 'react';
import { _ } from '@joplin/lib/locale';
import { formatMsToRelativeTime } from '@joplin/utils/time';

export interface Conversation {
	id: string;
	title: string;
	updated_time: number;
}

interface Props {
	conversations: Conversation[];
	currentConversationId?: string|null;
	id: string;
	popupRef: React.Ref<HTMLDivElement>;
	onSearchChange: (search: string)=> void;
	onOpen: (conversationId: string)=> void;
	onRename: (conversation: Conversation, title: string)=> void;
	onDelete: (conversationId: string)=> void;
}

const ChatHistory: React.FC<Props> = props => {
	const [search, setSearch] = useState('');
	const [editingId, setEditingId] = useState<string|null>(null);
	const [draftTitle, setDraftTitle] = useState('');

	const startEditing = (conversation: Conversation) => {
		setEditingId(conversation.id);
		setDraftTitle(conversation.title);
	};

	const stopEditing = () => setEditingId(null);

	const onTitleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, conversation: Conversation) => {
		if (event.nativeEvent.isComposing || event.key !== 'Enter') return;
		event.preventDefault();
		props.onRename(conversation, draftTitle);
		stopEditing();
	};

	return <div className='chat-history' id={props.id} ref={props.popupRef}>
		<div className='conversation-search search'>
			<i className='icon icon-search' aria-hidden='true'/>
			<input
				className='field'
				type='search'
				aria-label={_('Search conversations')}
				placeholder={_('Search conversations')}
				value={search}
				onChange={event => {
					setSearch(event.target.value);
					props.onSearchChange(event.target.value);
				}}
			/>
		</div>
		<ul className='conversation-list' aria-label={_('Conversations')}>
			{props.conversations.map(conversation => {
				const current = conversation.id === props.currentConversationId;
				const title = conversation.title || _('(untitled)');
				const editing = conversation.id === editingId;
				return <li key={conversation.id} className={`conversation-row${current ? ' -current' : ''}`} aria-current={current ? 'true' : undefined}>
					{editing ? (
						<input
							className='title-input'
							type='text'
							autoFocus
							aria-label={_('Conversation title')}
							value={draftTitle}
							onChange={event => setDraftTitle(event.target.value)}
							onKeyDown={event => onTitleKeyDown(event, conversation)}
							onBlur={stopEditing}
						/>
					) : (
						<button className='conversation-link open' type='button' onClick={() => props.onOpen(conversation.id)}>
							<span className='title'>{title}</span>
							<span className='timestamp'>{formatMsToRelativeTime(conversation.updated_time)}</span>
						</button>
					)}
					<div className='conversation-actions actions'>
						<button className='button toolbar-button' type='button' title={_('Rename')} aria-label={_('Rename')} onClick={() => startEditing(conversation)}>
							<i className='toolbar-icon fa fa-pen' aria-hidden='true'/>
						</button>
						<button className='button toolbar-button' type='button' title={_('Delete')} aria-label={_('Delete')} onClick={() => props.onDelete(conversation.id)}>
							<i className='toolbar-icon fas fa-trash' aria-hidden='true'/>
						</button>
					</div>
				</li>;
			})}
		</ul>
	</div>;
};

export default ChatHistory;
