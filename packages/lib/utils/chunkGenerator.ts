import shim from '../shim';

class ChunkGenerator {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private handle: any;
	private filePath: string;
	private chunkSize: number;
	private index = 0;
	private chunksNo: number;
	private chunk: string;

	public constructor(filePath: string, chunkSize: number) {
		this.chunkSize = chunkSize;
		this.filePath = filePath;
	}

	public async init() {
		try {
			const stats = await shim.fsDriver().stat(this.filePath);
			this.chunksNo = Math.ceil(stats.size / this.chunkSize);
			this.handle = await shim.fsDriver().open(this.filePath, 'r');
		} catch (error) {
			error.message = `Failed to open file: ${error.message}`;
			throw error;
		}
	}

	public async next():
	Promise<{ value?: { index: number; chunksNo: number; chunk: string }; done: boolean }> {
		if (this.index < this.chunksNo) {

			try {
				this.chunk = await shim.fsDriver().readFileChunk(this.handle, this.chunkSize, 'base64');
			} catch (error) {
				error.message = `Failed to read chunk: ${error.message}`;
				throw error;
			}

			const value = {
				index: this.index,
				chunksNo: this.chunksNo,
				chunk: this.chunk,
			};
			this.index++;
			return { value, done: false };
		} else {
			return { done: true };
		}
	}
}

export default ChunkGenerator;
