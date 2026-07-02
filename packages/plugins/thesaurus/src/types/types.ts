// TS-Python API contract (NDJSON over stdio)

export interface RankRequest {
	id: string; // UUID — correlates request to response
	word: string;
	context?: string; // surrounding sentence, for MiniLM ranking
	topN?: number; // default 10
}

export interface SynonymEntry {
	word: string;
	score: number; // 0–1
	pos?: string; // 'n' | 'v' | 'a' | 'r'
}

export interface RankResponse {
	id: string;
	results: SynonymEntry[];
	error?: string;
}

export interface PendingRequest {
	resolve: (value: RankResponse)=> void;
	reject: (reason: Error)=> void;
}
