// These utility functions allow making API calls easily from test units.
// There's two versions of each function:
//
// - A regular one, eg. "postDirectory", which returns whatever would have
//   normally return the API call. It also checks for error.
//
// - The other function is suffixed with "Context", eg "postDirectoryContext".
//   In that case, it returns the complete Koa context, which can be used in
//   particular to access the response object and test for errors.

import { File } from '../../services/database/types';
import routeHandler from '../../middleware/routeHandler';
import { PaginatedResults, Pagination, paginationToQueryParams } from '../../models/utils/pagination';
import { AppContext } from '../types';
import { checkContextError, koaAppContext, testAssetDir } from './testUtils';
import * as fs from 'fs-extra';

export function testFilePath(ext = 'jpg') {
	const basename = ext === 'jpg' ? 'photo' : 'poster';
	return `${testAssetDir}/${basename}.${ext}`;
}

export async function testImageBuffer() {
	const path = testFilePath('jpg');
	return fs.readFile(path);
}

export async function getFileMetadataContext(sessionId: string, path: string): Promise<AppContext> {
	const context = await koaAppContext({
		sessionId: sessionId,
		request: {
			method: 'GET',
			url: `/api/files/${path}`,
		},
	});

	await routeHandler(context);
	return context;
}

export async function getFileMetadata(sessionId: string, path: string): Promise<File> {
	const context = await getFileMetadataContext(sessionId, path);
	checkContextError(context);
	return context.response.body;
}

export async function deleteFileContentContext(sessionId: string, path: string): Promise<AppContext> {
	const context = await koaAppContext({
		sessionId: sessionId,
		request: {
			method: 'DELETE',
			url: `/api/files/${path}/content`,
		},
	});

	await routeHandler(context);
	return context;
}

export async function deleteFileContent(sessionId: string, path: string): Promise<void> {
	const context = await deleteFileContentContext(sessionId, path);
	checkContextError(context);
}

export async function deleteFileContext(sessionId: string, path: string): Promise<AppContext> {
	const context = await koaAppContext({
		sessionId: sessionId,
		request: {
			method: 'DELETE',
			url: `/api/files/${path}`,
		},
	});

	await routeHandler(context);
	return context;
}

export async function deleteFile(sessionId: string, path: string): Promise<void> {
	const context = await deleteFileContext(sessionId, path);
	checkContextError(context);
}

export async function postDirectoryContext(sessionId: string, parentPath: string, name: string): Promise<AppContext> {
	const context = await koaAppContext({
		sessionId: sessionId,
		request: {
			method: 'POST',
			url: `/api/files/${parentPath}/children`,
			body: {
				is_directory: 1,
				name: name,
			},
		},
	});

	await routeHandler(context);
	return context;
}

export async function postDirectory(sessionId: string, parentPath: string, name: string): Promise<File> {
	const context = await postDirectoryContext(sessionId, parentPath, name);
	checkContextError(context);
	return context.response.body;
}

// export async function getDirectoryChildrenContext(sessionId: string, path: string, pagination: Pagination = null): Promise<AppContext> {
// 	const context = await koaAppContext({
// 		sessionId: sessionId,
// 		request: {
// 			method: 'GET',
// 			url: `/api/files/${path}/children`,
// 			query: paginationToQueryParams(pagination),
// 		},
// 	});

// 	await routeHandler(context);
// 	return context;
// }

// export async function getDirectoryChildren(sessionId: string, path: string, pagination: Pagination = null): Promise<PaginatedResults<any>> {
// 	const context = await getDirectoryChildrenContext(sessionId, path, pagination);
// 	checkContextError(context);
// 	return context.response.body as PaginatedResults;
// }

export async function putFileContentContext(sessionId: string, path: string, filePath: string): Promise<AppContext> {
	const context = await koaAppContext({
		sessionId: sessionId,
		request: {
			method: 'PUT',
			url: `/api/files/${path}/content`,
			files: { file: { path: filePath } },
		},
	});

	await routeHandler(context);
	return context;
}

export async function putFileContent(sessionId: string, path: string, filePath: string): Promise<File> {
	const context = await putFileContentContext(sessionId, path, filePath);
	checkContextError(context);
	return context.response.body;
}

export async function getFileContentContext(sessionId: string, path: string): Promise<AppContext> {
	const context = await koaAppContext({
		sessionId: sessionId,
		request: {
			method: 'GET',
			url: `/api/files/${path}/content`,
		},
	});

	await routeHandler(context);
	return context;
}

export async function getFileContent(sessionId: string, path: string): Promise<Buffer> {
	const context = await getFileContentContext(sessionId, path);
	checkContextError(context);
	return context.response.body as Buffer;
}

export async function patchFileContext(sessionId: string, path: string, file: File): Promise<AppContext> {
	const context = await koaAppContext({
		sessionId: sessionId,
		request: {
			method: 'PATCH',
			url: `/api/files/${path}`,
			body: file,
		},
	});
	await routeHandler(context);
	return context;
}

export async function patchFile(sessionId: string, path: string, file: File): Promise<File> {
	const context = await patchFileContext(sessionId, path, file);
	checkContextError(context);
	return context.response.body;
}

export async function getDeltaContext(sessionId: string, path: string, pagination: Pagination): Promise<AppContext> {
	const context = await koaAppContext({
		sessionId: sessionId,
		request: {
			method: 'GET',
			url: `/api/files/${path}/delta`,
			query: paginationToQueryParams(pagination),
		},
	});
	await routeHandler(context);
	return context;
}

export async function getDelta(sessionId: string, path: string, pagination: Pagination): Promise<PaginatedResults<any>> {
	const context = await getDeltaContext(sessionId, path, pagination);
	checkContextError(context);
	return context.response.body as PaginatedResults<any>;
}
