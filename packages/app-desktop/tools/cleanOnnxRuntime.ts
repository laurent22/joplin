import { pathExists, readdirSync, remove } from 'fs-extra';
import { join, sep } from 'path';

const findBaseOnnxRuntimePath = () => {
	const fullPath = require.resolve('onnxruntime-node').split(sep);
	// require.resolve returns the path to a file within the onnxruntime-node package.
	// Strip the other path/file components from the path.
	for (let i = fullPath.length; i >= 0; i--) {
		if (fullPath[i] === 'onnxruntime-node') {
			return fullPath.slice(0, i + 1).join(sep);
		}
	}
	throw new Error('Failed to resolve path to onnxruntime-node');
};

// onnxruntime-node includes large binary artifacts for all platforms. Remove these during build to
// avoid significantly increasing the built app size.
// See #15880
const cleanOnnxRuntime = async () => {
	const onnxRuntimePath = findBaseOnnxRuntimePath();
	// Note: This path may need to be updated when updating onnxruntime-node:
	const baseDir = join(onnxRuntimePath, 'bin', 'napi-v6');
	if (!await pathExists(baseDir)) {
		throw new Error(`onnxruntime-node NAPI not found. (Searching in ${baseDir})`);
	}

	const removeDir = async (fullPath: string) => {
		if (!await pathExists(fullPath)) return;
		console.log('rm -r', fullPath);
		await remove(fullPath);
	};

	for (const subDir of readdirSync(baseDir)) {
		const fullPath = join(baseDir, subDir);
		if (subDir !== process.platform) {
			await removeDir(fullPath);
		} else if (process.arch === 'x64') {
			await removeDir(join(fullPath, 'arm64'));
		} else if (process.arch === 'arm64') {
			await removeDir(join(fullPath, 'x64'));
		}
	}
};

export default cleanOnnxRuntime;
