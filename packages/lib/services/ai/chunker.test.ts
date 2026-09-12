import { chunkText, defaultChunkOptions, cjkChunkOptions, optionsForText } from './chunker';

describe('chunker', () => {

	it('returns no chunks for empty or whitespace-only input', () => {
		expect(chunkText('')).toEqual([]);
		expect(chunkText('   \n\t ')).toEqual([]);
	});

	it('returns the whole text as a single chunk when shorter than chunkSize', () => {
		const body = 'A short note that fits in one chunk.';
		expect(chunkText(body)).toEqual([body]);
	});

	it('produces overlapping chunks for long input', () => {
		// Pick a smaller chunk size for the test so we can reason about boundaries.
		const options = { chunkSize: 100, chunkOverlap: 20 };
		const body = 'a'.repeat(250);
		const chunks = chunkText(body, options);

		// step = 80; chunks at 0..100, 80..180, 160..250
		expect(chunks.length).toBe(3);
		expect(chunks[0].length).toBe(100);
		expect(chunks[1].length).toBe(100);
		expect(chunks[2].length).toBe(90);
	});

	it('preserves overlap content across consecutive chunks', () => {
		const options = { chunkSize: 50, chunkOverlap: 10 };
		const body = '0123456789'.repeat(20); // 200 chars
		const chunks = chunkText(body, options);

		// The last 10 chars of chunk[i] must equal the first 10 chars of chunk[i+1].
		for (let i = 0; i < chunks.length - 1; i++) {
			expect(chunks[i].slice(-options.chunkOverlap)).toBe(chunks[i + 1].slice(0, options.chunkOverlap));
		}
	});

	it('throws when overlap is not smaller than chunk size', () => {
		expect(() => chunkText('long text'.repeat(1000), { chunkSize: 10, chunkOverlap: 10 })).toThrow();
		expect(() => chunkText('long text'.repeat(1000), { chunkSize: 10, chunkOverlap: 20 })).toThrow();
	});

	it('default chunk size leaves headroom for 512-token embedding models', () => {
		// At ~3.5 chars/token (worst major Latin-script case: French, Spanish,
		// German), the default chunk size must stay below 512 × 3.5 = 1792 chars
		// so chunks aren't truncated. Overlap should stay around 10%.
		expect(defaultChunkOptions.chunkSize).toBeGreaterThanOrEqual(1500);
		expect(defaultChunkOptions.chunkSize).toBeLessThanOrEqual(1800);
		expect(defaultChunkOptions.chunkOverlap).toBeGreaterThan(0);
		expect(defaultChunkOptions.chunkOverlap).toBeLessThan(defaultChunkOptions.chunkSize);
		const overlapRatio = defaultChunkOptions.chunkOverlap / defaultChunkOptions.chunkSize;
		expect(overlapRatio).toBeGreaterThanOrEqual(0.05);
		expect(overlapRatio).toBeLessThanOrEqual(0.20);
	});

	it('cJK chunk size leaves headroom for 512-token embedding models on dense scripts', () => {
		// At ~1.2 chars/token for Chinese, 512 tokens covers ~615 chars.
		expect(cjkChunkOptions.chunkSize).toBeGreaterThanOrEqual(500);
		expect(cjkChunkOptions.chunkSize).toBeLessThanOrEqual(700);
		const overlapRatio = cjkChunkOptions.chunkOverlap / cjkChunkOptions.chunkSize;
		expect(overlapRatio).toBeGreaterThanOrEqual(0.05);
		expect(overlapRatio).toBeLessThanOrEqual(0.20);
	});

	it('selects the default profile for English text', () => {
		expect(optionsForText('The quick brown fox jumps over the lazy dog.')).toBe(defaultChunkOptions);
	});

	it('selects the default profile for European-language text', () => {
		// cSpell:disable
		expect(optionsForText('Le renard brun rapide saute par-dessus le chien paresseux.')).toBe(defaultChunkOptions);
		expect(optionsForText('Der schnelle braune Fuchs springt über den faulen Hund.')).toBe(defaultChunkOptions);
		// cSpell:enable
	});

	it('selects the CJK profile for dominantly-CJK text', () => {
		// A sentence that's mostly Chinese — should land in the CJK profile.
		expect(optionsForText('快速的棕色狐狸跳过了懒惰的狗。')).toBe(cjkChunkOptions);
		// Japanese with kanji + kana — should also land in CJK.
		expect(optionsForText('素早い茶色のキツネが怠け者の犬を飛び越える。')).toBe(cjkChunkOptions);
		// Korean Hangul.
		expect(optionsForText('빠른 갈색 여우가 게으른 개를 뛰어넘습니다.')).toBe(cjkChunkOptions);
	});

	it('does not pick the CJK profile for English text with a few stray CJK characters', () => {
		// A long English note with one Chinese loanword should NOT be chunked as
		// CJK — the dominant script is still English.
		const body = `${'The quick brown fox jumps over the lazy dog. '.repeat(40)} 中文`;
		expect(optionsForText(body)).toBe(defaultChunkOptions);
	});
});
