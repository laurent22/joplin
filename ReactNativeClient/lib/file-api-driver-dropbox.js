const { time } = require('lib/time-utils.js');
const { shim } = require('lib/shim');
const JoplinError = require('lib/JoplinError');

class FileApiDriverDropbox {
	constructor(api) {
		this.api_ = api;
	}

	api() {
		return this.api_;
	}

	requestRepeatCount() {
		return 3;
	}

	makePath_(path) {
		if (!path) return '';
		return `/${path}`;
	}

	hasErrorCode_(error, errorCode) {
		if (!error || typeof error.code !== 'string') return false;
		return error.code.indexOf(errorCode) >= 0;
	}

	async stat(path) {
		try {
			const metadata = await this.api().exec('POST', 'files/get_metadata', {
				path: this.makePath_(path),
			});

			return this.metadataToStat_(metadata, path);
		} catch (error) {
			if (this.hasErrorCode_(error, 'not_found')) {
				// ignore
			} else {
				throw error;
			}
		}
	}

	metadataToStat_(md, path) {
		const output = {
			path: path,
			updated_time: md.server_modified ? new Date(md.server_modified) : new Date(),
			isDir: md['.tag'] === 'folder',
		};

		if (md['.tag'] === 'deleted') output.isDeleted = true;

		return output;
	}

	metadataToStats_(mds) {
		const output = [];
		for (let i = 0; i < mds.length; i++) {
			output.push(this.metadataToStat_(mds[i], mds[i].name));
		}
		return output;
	}

	async setTimestamp() {
		throw new Error('Not implemented'); // Not needed anymore
	}

	async delta(path, options) {
		const context = options ? options.context : null;
		let cursor = context ? context.cursor : null;

		while (true) {
			const urlPath = cursor ? 'files/list_folder/continue' : 'files/list_folder';
			const body = cursor ? { cursor: cursor } : { path: this.makePath_(path), include_deleted: true };

			try {
				const response = await this.api().exec('POST', urlPath, body);

				const output = {
					items: this.metadataToStats_(response.entries),
					hasMore: response.has_more,
					context: { cursor: response.cursor },
				};

				return output;
			} catch (error) {
				// If there's an error related to an invalid cursor, clear the cursor and retry.
				if (cursor) {
					if ((error && error.httpStatus === 400) || this.hasErrorCode_(error, 'reset')) {
						// console.info('Clearing cursor and retrying', error);
						cursor = null;
						continue;
					}
				}
				throw error;
			}
		}
	}

	async list(path) {
		let response = await this.api().exec('POST', 'files/list_folder', {
			path: this.makePath_(path),
		});

		let output = this.metadataToStats_(response.entries);

		while (response.has_more) {
			response = await this.api().exec('POST', 'files/list_folder/continue', {
				cursor: response.cursor,
			});

			output = output.concat(this.metadataToStats_(response.entries));
		}

		return {
			items: output,
			hasMore: false,
			context: { cursor: response.cursor },
		};
	}

	async get(path, options) {
		if (!options) options = {};
		if (!options.responseFormat) options.responseFormat = 'text';

		try {
			const response = await this.api().exec(
				'POST',
				'files/download',
				null,
				{
					'Dropbox-API-Arg': JSON.stringify({ path: this.makePath_(path) }),
				},
				options
			);
			return response;
		} catch (error) {
			if (this.hasErrorCode_(error, 'not_found')) {
				return null;
			} else if (this.hasErrorCode_(error, 'restricted_content')) {
				throw new JoplinError('Cannot download because content is restricted by Dropbox', 'rejectedByTarget');
			} else {
				throw error;
			}
		}
	}

	async mkdir(path) {
		try {
			await this.api().exec('POST', 'files/create_folder_v2', {
				path: this.makePath_(path),
			});
		} catch (error) {
			if (this.hasErrorCode_(error, 'path/conflict')) {
				// Ignore
			} else {
				throw error;
			}
		}
	}

	async put(path, content, options = null) {
		// See https://github.com/facebook/react-native/issues/14445#issuecomment-352965210
		if (typeof content === 'string') content = shim.Buffer.from(content, 'utf8');

		try {
			await this.api().exec(
				'POST',
				'files/upload',
				content,
				{
					'Dropbox-API-Arg': JSON.stringify({
						path: this.makePath_(path),
						mode: 'overwrite',
						mute: true, // Don't send a notification to user since there can be many of these updates
					}),
				},
				options
			);
		} catch (error) {
			if (this.hasErrorCode_(error, 'restricted_content')) {
				throw new JoplinError('Cannot upload because content is restricted by Dropbox', 'rejectedByTarget');
			} else {
				throw error;
			}
		}
	}

	async delete(path) {
		try {
			await this.api().exec('POST', 'files/delete_v2', {
				path: this.makePath_(path),
			});
		} catch (error) {
			if (this.hasErrorCode_(error, 'not_found')) {
				// ignore
			} else {
				throw error;
			}
		}
	}

	async move() {
		throw new Error('Not supported');
	}

	format() {
		throw new Error('Not supported');
	}

	async clearRoot() {
		const entries = await this.list('');
		const batchDelete = [];
		for (let i = 0; i < entries.items.length; i++) {
			batchDelete.push({ path: this.makePath_(entries.items[i].path) });
		}

		const response = await this.api().exec('POST', 'files/delete_batch', { entries: batchDelete });
		const jobId = response.async_job_id;

		while (true) {
			const check = await this.api().exec('POST', 'files/delete_batch/check', { async_job_id: jobId });
			if (check['.tag'] === 'complete') break;

			// It returns "failed" if it didn't work but anyway throw an error if it's anything other than complete or in_progress
			if (check['.tag'] !== 'in_progress') {
				throw new Error(`Batch delete failed? ${JSON.stringify(check)}`);
			}
			await time.sleep(2);
		}
	}
}

module.exports = { FileApiDriverDropbox };
