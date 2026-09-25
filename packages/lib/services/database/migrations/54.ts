import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		`CREATE TABLE chat_conversations (
			id TEXT PRIMARY KEY NOT NULL,
			title TEXT NOT NULL DEFAULT "",
			created_time INT NOT NULL,
			updated_time INT NOT NULL
		)`,
		`CREATE TABLE chat_messages (
			id TEXT PRIMARY KEY NOT NULL,
			conversation_id TEXT NOT NULL,
			role TEXT NOT NULL,
			text TEXT NOT NULL DEFAULT "",
			raw TEXT NOT NULL DEFAULT "[]",
			hide INT NOT NULL DEFAULT 0,
			position INT NOT NULL,
			created_time INT NOT NULL,
			note_id TEXT NOT NULL DEFAULT "",
			note_title TEXT NOT NULL DEFAULT ""
		)`,
		'CREATE UNIQUE INDEX chat_messages_conversation_position ON chat_messages (conversation_id, position)',
	];
};
