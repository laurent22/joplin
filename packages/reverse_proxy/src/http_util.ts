import { RequestInit, Response } from 'node-fetch';
import crypto from 'crypto';
import fs from 'fs';
export interface WrappedRequest {
    headers: Record<string, string>;
    url: string;
    method: string;
    base64Encoded: boolean;
    body?: string;
}

export interface WrappedResponse {
	status: number;
	headers: Record<string, string[]>;
	base64Encoded: boolean;
	body?: string;
}

export interface NodeFetchRequest {
    headers: Record<string, string>;
    method: string;
	target: string;
	timeout: number;
    body?: string | Buffer;
}

export class HttpUtil {

	private static secretKey: Buffer | null = fs.readFileSync('../../secret.key'); // 32 bytes for AES-256

	public static isEncrypte(): boolean {
		return !!process.env.ENABLE_ENCRYPTION;
	}

	public static getSecretKey(): Buffer {
		if (!this.secretKey) {
			throw new Error('Secret key not initialized');
		}
		return this.secretKey;
	}

	public static convertNodeFetchOptions(requestBody: WrappedRequest): RequestInit {
		const options: RequestInit = {
			headers: requestBody.headers,
			method: requestBody.method,
			redirect: 'manual',
		};

		if (requestBody.body) {
			if (requestBody.base64Encoded) {
				options.body = Buffer.from(requestBody.body, 'base64');
			} else {
				options.body = requestBody.body;
			}
		}
		return options;
	}

	public static async convertWrappedRequest(result: Response): Promise<WrappedResponse> {
		const headers = result.headers.raw();
		const status = result.status;
		const contentType = result.headers.get('content-type') || '';

		const response: WrappedResponse = {
			headers: headers,
			status: status,
			base64Encoded: false,
		};

		// Content-Typeでテキストかバイナリか判定
		const isTextContent = contentType.includes('text/') ||
						contentType.includes('application/json') ||
						contentType.includes('application/xml') ||
						contentType.includes('application/javascript');

		if (isTextContent) {
			// テキストの場合はそのまま
			response.body = await result.text();
			response.base64Encoded = false;
		} else {
			// バイナリの場合はbase64エンコード
			const resBody = await result.arrayBuffer();
			if (resBody && resBody.byteLength > 0) {
				const buffer = Buffer.from(resBody);
				response.body = buffer.toString('base64');
				response.base64Encoded = true;
			}
		}

		return response;
	}



	public static encrypt(plainText: string) {
		const key = this.secretKey;
		if (!key || key.length !== 32) throw new Error('Key must be 32 bytes for AES-256-GCM.');

		const iv = crypto.randomBytes(12); // 12 bytes recommended for GCM
		const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

		const ciphertext = Buffer.concat([
			cipher.update(plainText, 'utf8'),
			cipher.final(),
		]);

		const authTag = cipher.getAuthTag();

		// Return a single string you can store/transmit
		// format: iv:authTag:ciphertext (all base64)
		return [
			iv.toString('base64'),
			authTag.toString('base64'),
			ciphertext.toString('base64'),
		].join(':');
	}

	public static decrypt(payload: string) {
		const key = this.secretKey;
		if (!key || key.length !== 32) throw new Error('Key must be 32 bytes for AES-256-GCM.');

		const [ivB64, authTagB64, ciphertextB64] = payload.split(':');
		const iv = Buffer.from(ivB64, 'base64');
		const authTag = Buffer.from(authTagB64, 'base64');
		const ciphertext = Buffer.from(ciphertextB64, 'base64');

		const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
		decipher.setAuthTag(authTag);

		const plain = Buffer.concat([
			decipher.update(ciphertext),
			decipher.final(),
		]);

		return plain.toString('utf8');
	}

}
