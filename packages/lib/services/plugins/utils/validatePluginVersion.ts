export default function(version: string): void {
	if (!version || !version.length) throw new Error('Version number cannot be empty');

	const maxLength = 64;
	if (version.length > 64) throw new Error(`Version number cannot be longer than ${maxLength} characters`);

	const patternStart = '^[0-9a-zA-Z].*$';
	const patternEnd = '^.*[0-9a-zA-Z]$';
	const pattern = '^[0-9a-zA-Z-.]+$';

	if (!version.match(new RegExp(patternStart))) throw new Error(`Version number must match pattern /${patternStart}/`);
	if (!version.match(new RegExp(patternEnd))) throw new Error(`Version number must match pattern /${patternEnd}/`);
	if (!version.match(new RegExp(pattern))) throw new Error(`Version number must match pattern /${pattern}/`);
}
