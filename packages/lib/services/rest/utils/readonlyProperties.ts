export default function readonlyProperties(requestMethod: string) {
	const output = ['created_time', 'updated_time', 'encryption_blob_encrypted', 'encryption_applied', 'encryption_cipher_text'];
	if (requestMethod !== 'POST') output.splice(0, 0, 'id');
	return output;
}
