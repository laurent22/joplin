import { scriptType } from '../../string-utils';

// Splits a note body into chunks sized to the embedding model's context
// window. Chunk size = TARGET_TOKENS × CHARS_PER_TOKEN; CHARS_PER_TOKEN
// varies by script (Latin tokenises looser than CJK), so we pick a profile
// from the text. 10% overlap matches common vector-search practice.

const TARGET_TOKENS_PER_CHUNK = 500;
const OVERLAP_RATIO = 0.10;

// Conservative for Latin scripts (French/German tokenise denser than English).
const DEFAULT_CHARS_PER_TOKEN = 3.5;

// CJK is much denser per character.
const CJK_CHARS_PER_TOKEN = 1.2;

// CJK profile kicks in only when CJK is the dominant script — a single
// loanword in an English note shouldn't switch profiles.
const CJK_DOMINANCE_THRESHOLD = 0.3;

export interface ChunkOptions {
	chunkSize: number;
	chunkOverlap: number;
}

const makeOptions = (charsPerToken: number): ChunkOptions => {
	const chunkSize = Math.round(TARGET_TOKENS_PER_CHUNK * charsPerToken);
	const chunkOverlap = Math.round(chunkSize * OVERLAP_RATIO);
	return { chunkSize, chunkOverlap };
};

export const defaultChunkOptions: ChunkOptions = makeOptions(DEFAULT_CHARS_PER_TOKEN);
export const cjkChunkOptions: ChunkOptions = makeOptions(CJK_CHARS_PER_TOKEN);

// Hiragana + Katakana, CJK Unified Ideographs (incl. Extension A),
// Hangul Syllables, CJK Compatibility Ideographs. Escapes keep the source
// ASCII-safe across encoding changes.
const cjkRegex = /[\u{3040}-\u{30FF}\u{3400}-\u{4DBF}\u{4E00}-\u{9FFF}\u{AC00}-\u{D7AF}\u{F900}-\u{FAFF}]/u;

const isCjkDominant = (text: string): boolean => {
	const script = scriptType(text);
	if (script !== 'zh' && script !== 'ja' && script !== 'ko') return false;

	let cjkCount = 0;
	for (const ch of text) {
		if (cjkRegex.test(ch)) cjkCount++;
	}
	return cjkCount / text.length >= CJK_DOMINANCE_THRESHOLD;
};

export const optionsForText = (text: string): ChunkOptions => {
	return isCjkDominant(text) ? cjkChunkOptions : defaultChunkOptions;
};

const stepFromOptions = (options: ChunkOptions): number => {
	const step = options.chunkSize - options.chunkOverlap;
	if (step <= 0) throw new Error('chunkOverlap must be smaller than chunkSize');
	return step;
};

export const chunkText = (text: string, options?: ChunkOptions): string[] => {
	const normalised = (text ?? '').trim();
	if (!normalised) return [];
	const effective = options ?? optionsForText(normalised);
	if (normalised.length <= effective.chunkSize) return [normalised];

	const step = stepFromOptions(effective);
	const chunks: string[] = [];
	for (let start = 0; start < normalised.length; start += step) {
		const end = Math.min(start + effective.chunkSize, normalised.length);
		chunks.push(normalised.slice(start, end));
		if (end === normalised.length) break;
	}
	return chunks;
};
