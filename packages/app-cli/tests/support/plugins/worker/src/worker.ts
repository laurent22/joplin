// @ts-ignore -- no types available for transformers.js
import { pipeline, env } from '@xenova/transformers';

// Use code similar to the following to use local models
// See https://github.com/xenova/transformers.js?tab=readme-ov-file#settings
// env.localModelPath = './models/';
// env.allowRemoteModels = false;

// Don't fetch ONNX WASM from the internet (see tools/copyModels.js).
env.backends.onnx.wasm.wasmPaths = './onnx-dist/';

let pipe: (text: string)=>Promise<unknown>;

const classify = async (text: string) => {
	pipe ??= await pipeline('sentiment-analysis');
	const classification = await pipe(text);
	console.debug('classified', text, 'as', classification);

	return classification;
};

self.addEventListener('message', async (event) => {
	console.debug('got message', event.data);

	if (event.data.type === 'classify') {
		postMessage({
			response: await classify(event.data.text),
		});
	}
});
