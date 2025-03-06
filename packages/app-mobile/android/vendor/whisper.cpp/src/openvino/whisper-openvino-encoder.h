// Wrapper of the OpenVINO Whisper Encoder model
//

#if __cplusplus
extern "C" {
#endif

struct whisper_openvino_context;

// initialize openvino encoder, given path to model xml, device ("CPU", "GPU", etc.), and
// path to cache_dir. Returns null upon failure.
struct whisper_openvino_context * whisper_openvino_init(const char * path_model,
                                                        const char * device,
                                                        const char * cache_dir);

// clean up a ctx previously returned from whisper_openvino_init()
void whisper_openvino_free(struct whisper_openvino_context * ctx);

struct ggml_tensor;

// Perform encode using OpenVINO.
// Returns 1 on success
// Returns 0 on failure
int whisper_openvino_encode(
    whisper_openvino_context* ctx,
    ggml_tensor* mel,
    ggml_tensor* out);

#if __cplusplus
}
#endif
