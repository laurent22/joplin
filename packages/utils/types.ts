export interface Size {
	width?: number;
	height?: number;
}

export interface Link {
	title: string;
	url: string;
}

export type EmptyObject = Record<string, never>;

// This utility allows creating types that are intended to act somewhat like `unknown`, but
// are more type safe.
// See https://github.com/microsoft/TypeScript/issues/202
export type VirtualOpaqueType<Id extends string> = {
	readonly __virtualOpaqueType: Id;
};
