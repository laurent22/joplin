import { RequestInit, Response } from 'node-fetch';

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
}
