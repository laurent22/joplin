
interface DatabaseOptions {
	name: string;
}
export type DatabaseOpenOptions = DatabaseOptions;
export type DatabaseCloseOptions = DatabaseOptions;

export type SqlSelectParams = (string|number|boolean)[];

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Partial refactor of old code from before rule was applied
export type SelectResult = any;

interface DatabaseDriver {
	open(options: DatabaseOpenOptions): Promise<void>;
	deleteDatabase(options: DatabaseCloseOptions): Promise<void>;

	selectOne(sql: string, params: SqlSelectParams): Promise<SelectResult>;
	selectAll(sql: string, params: SqlSelectParams): Promise<SelectResult>;

	// May or may not return the output of the command
	// TODO: Make this consistent
	exec(sql: string, params: SqlSelectParams): Promise<void|SelectResult>;
}

export default DatabaseDriver;
