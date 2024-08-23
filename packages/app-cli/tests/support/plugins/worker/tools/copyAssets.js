const fs = require('fs-extra');
const path = require('path');

// Copy WASM files
// See https://github.com/xenova/transformers.js/issues/367#issuecomment-1777743129
const onnxDistFiles = path.dirname(require.resolve('onnxruntime-web'));
const baseDir = path.dirname(__dirname);
fs.copy(onnxDistFiles, path.join(baseDir, 'dist', 'onnx-dist'));

// Predownload model files -- TODO.
// See https://huggingface.co/docs/transformers.js/custom_usage#use-custom-models

