let runtimeDatabaseKeyHex: string | null = null;

export const setRuntimeDatabaseKeyHex = (databaseKeyHex: string | null) => {
	runtimeDatabaseKeyHex = databaseKeyHex;
};

export const getRuntimeDatabaseKeyHex = () => {
	return runtimeDatabaseKeyHex;
};

export const clearRuntimeDatabaseKeyHex = () => {
	runtimeDatabaseKeyHex = null;
};
