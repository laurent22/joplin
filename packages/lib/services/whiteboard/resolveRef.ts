// Classifies the `file` value of a JSONCanvas file-node as a Joplin note ref,
// resource ref, or external path. The Joplin extension to the spec is that
// values starting with `:/` are internal IDs.

export enum RefKind {
	Note = 'note',
	Resource = 'resource',
	External = 'external',
}

export interface ResolvedRef {
	kind: RefKind;
	// For Note/Resource: the bare ID without the leading `:/`.
	// For External: the original value unchanged.
	id: string;
}

const internalIdRegex = /^:\/([0-9a-f]{32})(?:#.*)?$/i;

// `kindHint` is needed because note IDs and resource IDs share the same
// 32-char hex format — we can't tell them apart from the string alone. The
// caller knows the context (e.g. it just looked up an item by ID and got
// either a note or a resource back) and passes the result back here.
export const resolveFileRef = (
	value: string,
	kindHint?: RefKind.Note | RefKind.Resource,
): ResolvedRef => {
	const m = value.match(internalIdRegex);
	if (m) {
		return { kind: kindHint ?? RefKind.Resource, id: m[1] };
	}
	return { kind: RefKind.External, id: value };
};

export const isInternalRef = (value: string): boolean => {
	return internalIdRegex.test(value);
};
