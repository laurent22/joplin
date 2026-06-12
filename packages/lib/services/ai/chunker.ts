import { scriptType } from '../../string-utils';

// Splits a note body into roughly-equal chunks with overlap.
//
// Chunk sizes derive from three knobs:
//
// - TARGET_TOKENS_PER_CHUNK: how many tokens we want each chunk to contain.
//   Sized to fit inside the 512-token context window of the small embedding
//   models we plan to ship first (bge-small, nomic-embed-text,
//   mxbai-embed-small). Larger chunks would be silently truncated by those
//   models.
// - OVERLAP_RATIO: fraction of each chunk that's also present in the next
//   chunk. ~10% is the common default in vector-search literature.
// - CHARS_PER_TOKEN: how many characters one token covers, which varies by
//   language. We pick a conservative value per profile to avoid truncation.

const TARGET_TOKENS_PER_CHUNK = 500;
const OVERLAP_RATIO = 0.10;

// Conservative chars/token estimate for English and other Latin-script
// languages. English is closer to 4 chars/token but French / Spanish /
// German tokenize denser — we pick the worst case so European-language users
// don't see truncation.
const DEFAULT_CHARS_PER_TOKEN = 3.5;

// CJK (Chinese / Japanese / Korean) characters are much more
// information-dense per character. ~1.2 chars/token covers all three.
const CJK_CHARS_PER_TOKEN = 1.2;

// A note must be at least this fraction of CJK characters to be chunked with
// the CJK profile. Catches dominantly-CJK notes while letting English notes
// with a loanword or two stay on the default profile.
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

// Counts CJK characters in the text and returns true if they make up a
// substantial fraction. `scriptType()` flags any presence of CJK characters,
// which is too eager — a note with one Chinese loanword in an English page
// shouldn't use the CJK chunking profile.
//
// Codepoint ranges: Hiragana + Katakana (U+3040–U+30FF), CJK Unified
// Ideographs Extension A (U+3400–U+4DBF), CJK Unified Ideographs
// (U+4E00–U+9FFF), Hangul Syllables (U+AC00–U+D7AF), CJK Compatibility
// Ideographs (U+F900–U+FAFF). Using \u{...} escapes so the source file is
// ASCII-safe — literal CJK characters here would be vulnerable to encoding
// changes at save/transfer time.
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
