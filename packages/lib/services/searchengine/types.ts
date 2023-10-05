import { ModelType } from '../../BaseModel';

export interface SearchResult {
	id: string; // Note ID
	offsets: string;
	user_updated_time: number;
	matchinfo: Buffer;
	item_id: string;
	item_type?: ModelType;
	fields?: string[];
	weight?: number;
	is_todo?: number;
	todo_completed?: number;
	title?: string;
}
