import { RequestInit } from "node-fetch";

export interface WrappedRequest {
    headers: Record<string, string>;
    url: string;
    method: string;
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
}
