import fetch from 'node-fetch';

interface ApiConfig {
	baseUrl: string;
	key: string;
	username: string;
	newsCategoryId: number;
}

export enum HttpMethod {
	GET = 'GET',
	POST = 'POST',
	DELETE = 'DELETE',
	PUT = 'PUT',
	PATCH = 'PATCH',
}

interface ForumTopPost {
	id: number;
	raw: string;
	title: string;
}

interface ForumTopic {
	id: number;
	topic_id: string;
}

export const config: ApiConfig = {
	baseUrl: 'https://discourse.joplinapp.org',
	key: '',
	username: '',
	newsCategoryId: 9,
};

export const execApi = async (method: HttpMethod, path: string, body: Record<string, string | number> = null) => {
	interface Request {
		method: HttpMethod;
		headers: Record<string, string>;
		body?: string;
	}

	const headers: Record<string, string> = {
		'Api-Key': config.key,
		'Api-Username': config.username,
	};

	if (method !== HttpMethod.GET) headers['Content-Type'] = 'application/json;';

	const request: Request = {
		method,
		headers,
	};

	if (body) request.body = JSON.stringify(body);

	const response = await fetch(`${config.baseUrl}/${path}`, request);

	if (!response.ok) {
		const errorText = await response.text();
		const error = new Error(`On ${method} ${path}: ${errorText}`);
		let apiObject = null;
		try {
			apiObject = JSON.parse(errorText);
		} catch (error) {
			// Ignore - it just means that the error object is a plain string
		}
		(error as any).apiObject = apiObject;
		(error as any).status = response.status;
		throw error;
	}

	return response.json() as any;
};

export const getForumTopPostByExternalId = async (externalId: string): Promise<ForumTopPost> => {
	try {
		const existingForumTopic = await execApi(HttpMethod.GET, `t/external_id/${externalId}.json`);
		const existingForumPost = await execApi(HttpMethod.GET, `posts/${existingForumTopic.post_stream.posts[0].id}.json`);
		return {
			id: existingForumPost.id,
			title: existingForumTopic.title,
			raw: existingForumPost.raw,
		};
	} catch (error) {
		if (error.status === 404) return null;
		if (error.apiObject && error.apiObject.error_type === 'not_found') return null;
		throw error;
	}
};

export const getTopicByExternalId = async (externalId: string): Promise<ForumTopic> => {
	try {
		const existingForumTopic = await execApi(HttpMethod.GET, `t/external_id/${externalId}.json`);
		return existingForumTopic;
	} catch (error) {
		if (error.status === 404) return null;
		if (error.apiObject && error.apiObject.error_type === 'not_found') return null;
		throw error;
	}
};

export const createTopic = async (topic: any): Promise<ForumTopic> => {
	return execApi(HttpMethod.POST, 'posts', topic);
};

export const createPost = async (topicId: number, post: any): Promise<ForumTopic> => {
	return execApi(HttpMethod.POST, 'posts', {
		topic_id: topicId,
		...post,
	});
};

export const updatePost = async (postId: number, content: any): Promise<void> => {
	await execApi(HttpMethod.PUT, `posts/${postId}.json`, content);
};
