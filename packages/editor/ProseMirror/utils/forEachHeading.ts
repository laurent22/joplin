import uslug from '@joplin/fork-uslug/lib/uslug';
import { Node } from 'prosemirror-model';
import normalizeHeadingForHash from '../../utils/normalizeHeadingForHash';

type OnHeading = (node: Node, hashes: string[], pos: number)=> boolean|void;

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
	const seenLegacyHashes = new Set<string>();
	doc.descendants((node, pos) => {
		if (node.type.name === 'heading') {
			const canonicalHash = uniqueHash(
				uslug(normalizeHeadingForHash(node.textContent)),
				seenCanonicalHashes,
			);
			const legacyHash = uniqueHash(
				uslug(node.textContent),
				seenLegacyHashes,
			);

			const hashes = [canonicalHash];
			if (legacyHash !== canonicalHash) {
				hashes.push(legacyHash);
			}

			done = !!callback(node, hashes, pos);
		}
		return !done;
	});
};

export default forEachHeading;
