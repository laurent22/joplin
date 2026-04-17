import packToWriter, { type FileApi as WriterFileApi } from './packToWriter';

export type FileApi = Pick<WriterFileApi, 'exists' | 'readFileText' | 'readFileDataUri' | 'streamFileDataUri'>;

// Legacy
const packToString = async (baseDir: string, inputFileText: string, fs: FileApi) => {
	const chunks: string[] = [];

	await packToWriter(baseDir, inputFileText, {
		...fs,
		writeChunk(chunk: string) {
			chunks.push(chunk);
		},
	});

	return chunks.join('');
};

export default packToString;
