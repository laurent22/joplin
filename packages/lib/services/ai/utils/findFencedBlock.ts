import { pregQuote } from '../../../string-utils';

const fencedBlockRegex = (tag: string) =>
	new RegExp(`\`\`\`${pregQuote(tag)}\\s*\\n([\\s\\S]*?)\\n?\`\`\``, 'gi');

// Cursor=0 fallback (no selection) makes the first match win naturally.
const findFencedBlock = (body: string, tag: string, cursorPos: number) => {
	const re = fencedBlockRegex(tag);
	let best: RegExpExecArray | null = null;
	let bestDistance = Infinity;
	let match: RegExpExecArray | null;
	while ((match = re.exec(body)) !== null) {
		const distance = Math.abs(match.index - cursorPos);
		if (distance < bestDistance) {
			bestDistance = distance;
			best = match;
		}
		// Defensive against zero-width matches looping forever.
		if (match.index === re.lastIndex) re.lastIndex++;
	}
	return best;
};

export default findFencedBlock;
