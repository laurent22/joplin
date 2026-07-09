export default function formatSqlCipherHexKeyLiteral(databaseKeyHex: string) {
	return `"x'${databaseKeyHex}'"`;
}
