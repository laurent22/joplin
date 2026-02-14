import { Node } from 'prosemirror-model';

const getTextBetween = (doc: Node, from: number, to: number) => {
	const blockSeparator = '\n\n';
	return doc.textBetween(from, to, blockSeparator);
};

export default getTextBetween;
