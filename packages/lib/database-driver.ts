
interface DatabaseOptions {
	name: string;
}
export type DatabaseOpenOptions = DatabaseOptions;
export type DatabaseCloseOptions = DatabaseOptions;

export type SqlSelectParams = (string|number|boolean)[];

// SQLite driver results are heterogeneous: selectOne returns a single row object,
// selectAll returns an array of row objects, and rows have arbitrary column shapes.
// Callers narrow further via the underlying model entity types.
export type SelectResult = unknown;

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
