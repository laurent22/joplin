import { RequestInit } from 'node-fetch';

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
    body?: string | Buffer;
}

export class HttpUtil {


	public static convertNodeFetchOptions(requestBody: WrappedRequest): RequestInit {
		const options: RequestInit = {
			headers: requestBody.headers,
			method: requestBody.method,
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

	public static convertWrappedRequest(status: number,headers: Record<string, string[]>, resBody: string | Buffer<ArrayBufferLike> | undefined): WrappedResponse {
		const result: WrappedResponse = {
			headers: headers,
			status: status,
			base64Encoded: false,
		};

		if (resBody) {
			if (Buffer.isBuffer(resBody)) {
				result.body = resBody.toString('base64');
				result.base64Encoded = true;
			} else {
				result.body = resBody;
				result.base64Encoded = false;
			}
		}
		return result;
	}
}
