export type ImportErrors = Record<string, string>;

export interface NpmPackage {
	name: string;
	version: string;
	date: Date;
}
