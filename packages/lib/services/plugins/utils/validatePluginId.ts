export default function(id: string): void {
	if (!id) throw new Error('ID cannot be empty');
	if (id.length > 256) throw new Error('ID cannot be longer than 256 characters');

	const whitelist = '0-9a-zA-Z._-';
	const regex = new RegExp(`^[${whitelist}]+$`);
	if (!id.match(regex)) throw new Error(`ID "${id}" contains invalid characters. Only the characters "${whitelist}" are allowed.`);

	if (!id[0].match(/[0-9a-zA-Z]/)) throw new Error('ID can only start with a number or letter');
	if (!id[id.length - 1].match(/[0-9a-zA-Z]/)) throw new Error('ID can only end with a number or letter');
}
