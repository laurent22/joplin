import uslug from '@joplin/fork-uslug/lib/uslug';
import { Node } from 'prosemirror-model';
import normalizeHeadingForHash from '../../utils/normalizeHeadingForHash';

type OnHeading = (node: Node, hashes: string[], pos: number)=> boolean|void;

interface HeadingInfo {
	node: Node;
	pos: number;
	canonicalBaseHash: string;
	canonicalHash: string;
	legacyBaseHash: string;
}

const uniqueHash = (baseHash: string, seenHashes: Set<string>) => {
	let hash = baseHash;
	let counter = 1;
	while (seenHashes.has(hash)) {
		counter++;
		hash = `${baseHash}-${counter}`;
	}
	seenHashes.add(hash);

	return hash;
};

const forEachHeading = (doc: Node, callback: OnHeading) => {
	let done = false;
	const seenCanonicalHashes = new Set<string>();
	const headings: HeadingInfo[] = [];

	doc.descendants((node, pos) => {
		if (node.type.name === 'heading') {
			const canonicalBaseHash = uslug(normalizeHeadingForHash(node.textContent));
			headings.push({
				node,
				pos,
				canonicalBaseHash,
				canonicalHash: uniqueHash(canonicalBaseHash, seenCanonicalHashes),
				legacyBaseHash: uslug(node.textContent),
			});
		}
		return true;
	});

	const seenHashes = new Set<string>(seenCanonicalHashes);
	for (const heading of headings) {
		const hashes = [heading.canonicalHash];

		if (heading.legacyBaseHash !== heading.canonicalBaseHash) {
			hashes.push(uniqueHash(heading.legacyBaseHash, seenHashes));
		}

		done = !!callback(heading.node, hashes, heading.pos);
		if (done) break;
	}
};

export default forEachHeading;
