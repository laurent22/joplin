// Some models emit reasoning inline instead of in a separate field. Gemma's
// pair is asymmetric, so generic special-token filters miss it.
const markerPairs = [
	{ open: '<|channel>', close: '<channel|>' },
	{ open: '<think>', close: '</think>' },
	{ open: '<thinking>', close: '</thinking>' },
];

interface ExtractedReasoning {
	text: string;
	reasoning: string;
}

// Only a leading marker counts: anything later is the model talking *about*
// these tags, and stripping it would corrupt the answer.
const extractReasoning = (content: string): ExtractedReasoning => {
	if (!content) return { text: '', reasoning: '' };

	const trimmed = content.trimStart();
	const pair = markerPairs.find(candidate => trimmed.startsWith(candidate.open));
	if (!pair) return { text: content.trim(), reasoning: '' };

	const bodyStart = pair.open.length;
	const closeIndex = trimmed.indexOf(pair.close, bodyStart);

	// Cut off mid-thought: keep it as reasoning rather than leak it as the reply.
	if (closeIndex === -1) {
		return { text: '', reasoning: trimmed.slice(bodyStart).trim() };
	}

	return {
		text: trimmed.slice(closeIndex + pair.close.length).trim(),
		reasoning: trimmed.slice(bodyStart, closeIndex).trim(),
	};
};

export default extractReasoning;
