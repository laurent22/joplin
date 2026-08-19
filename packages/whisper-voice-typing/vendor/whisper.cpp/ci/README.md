# CI

In addition to [Github Actions](https://github.com/ggerganov/whisper.cpp/actions) `whisper.cpp` uses a custom CI framework:

https://github.com/ggml-org/ci

It monitors the `master` branch for new commits and runs the
[ci/run.sh](https://github.com/ggerganov/whisper.cpp/blob/master/ci/run.sh) script on dedicated cloud instances. This allows us
to execute heavier workloads compared to just using Github Actions. Also with time, the cloud instances will be scaled
to cover various hardware architectures, including GPU and Apple Silicon instances.

Collaborators can optionally trigger the CI run by adding the `ggml-ci` keyword to their commit message.
Only the branches of this repo are monitored for this keyword.

It is a good practice, before publishing changes to execute the full CI locally on your machine:

```bash
mkdir tmp

# CPU-only build
bash ./ci/run.sh ./tmp/results ./tmp/mnt

# with CUDA support
GG_BUILD_CUDA=1 bash ./ci/run.sh ./tmp/results ./tmp/mnt
```

## Environment Variables

The CI script supports several environment variables to control the build:

| Variable | Description |
|----------|-------------|
| `GG_BUILD_CUDA` | Enable NVIDIA CUDA GPU acceleration |
| `GG_BUILD_SYCL` | Enable Intel SYCL acceleration |
| `GG_BUILD_VULKAN` | Enable Vulkan GPU acceleration |
| `GG_BUILD_METAL` | Enable Metal acceleration on Apple Silicon |
| `GG_BUILD_BLAS` | Enable BLAS CPU acceleration |
| `GG_BUILD_OPENVINO` | Enable OpenVINO support |
| `GG_BUILD_COREML` | Enable Core ML support for Apple Neural Engine |
| `GG_BUILD_LOW_PERF` | Limit tests for low-performance hardware |
| `GG_BUILD_TEST_MODELS` | Comma-separated list of models to test (e.g. "tiny.en,tiny,base,medium", defaults to all models unless `GG_BUILD_LOW_PERF` is set) |
