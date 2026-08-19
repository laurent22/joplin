#pragma once

#include "ggml.h"

#include <map>

enum asr_tensor {
    ASR_TENSOR_ENC_POS_EMBD,
    ASR_TENSOR_DEC_POS_EMBD,
    ASR_TENSOR_DEC_TOKEN_EMBD_WEIGHT,
    ASR_TENSOR_LN_WEIGHT,
    ASR_TENSOR_LN_BIAS,
    ASR_TENSOR_CONV1_WEIGHT,
    ASR_TENSOR_CONV1_BIAS,
    ASR_TENSOR_CONV2_WEIGHT,
    ASR_TENSOR_CONV2_BIAS,
    ASR_TENSOR_LN_POST_WEIGHT,
    ASR_TENSOR_LN_POST_BIAS,
    ASR_TENSOR_MLP_LN_WEIGHT,
    ASR_TENSOR_MLP_LN_BIAS,
    ASR_TENSOR_MLP_0_WEIGHT,
    ASR_TENSOR_MLP_0_BIAS,
    ASR_TENSOR_MLP_2_WEIGHT,
    ASR_TENSOR_MLP_2_BIAS,
    ASR_TENSOR_ATTN_LN_WEIGHT,
    ASR_TENSOR_ATTN_LN_BIAS,
    ASR_TENSOR_ATTN_QUERY_WEIGHT,
    ASR_TENSOR_ATTN_QUERY_BIAS,
    ASR_TENSOR_ATTN_KEY_WEIGHT,
    ASR_TENSOR_ATTN_VALUE_WEIGHT,
    ASR_TENSOR_ATTN_VALUE_BIAS,
    ASR_TENSOR_ATTN_OUT_WEIGHT,
    ASR_TENSOR_ATTN_OUT_BIAS,
};

enum asr_system {
    ASR_SYSTEM_ENCODER,
    ASR_SYSTEM_DECODER,
    ASR_SYSTEM_CROSS
};

static const std::map<asr_system, std::map<asr_tensor, const char *>> ASR_TENSOR_NAMES = {
    {
        ASR_SYSTEM_ENCODER,
        {
            {ASR_TENSOR_ENC_POS_EMBD, "encoder.positional_embedding"},
            {ASR_TENSOR_CONV1_WEIGHT, "encoder.conv1.weight"},
            {ASR_TENSOR_CONV1_BIAS, "encoder.conv1.bias"},
            {ASR_TENSOR_CONV2_WEIGHT, "encoder.conv2.weight"},
            {ASR_TENSOR_CONV2_BIAS, "encoder.conv2.bias"},
            {ASR_TENSOR_LN_WEIGHT, "encoder.ln_post.weight"},
            {ASR_TENSOR_LN_POST_BIAS, "encoder.ln_post.bias"},
            {ASR_TENSOR_MLP_LN_WEIGHT, "encoder.blocks.%d.mlp_ln.weight"},
            {ASR_TENSOR_MLP_LN_BIAS, "encoder.blocks.%d.mlp_ln.bias"},
            {ASR_TENSOR_MLP_0_WEIGHT, "encoder.blocks.%d.mlp.0.weight"},
            {ASR_TENSOR_MLP_0_BIAS, "encoder.blocks.%d.mlp.0.bias"},
            {ASR_TENSOR_MLP_2_WEIGHT, "encoder.blocks.%d.mlp.2.weight"},
            {ASR_TENSOR_MLP_2_BIAS, "encoder.blocks.%d.mlp.2.bias"},
            {ASR_TENSOR_ATTN_LN_WEIGHT, "encoder.blocks.%d.attn_ln.weight"},
            {ASR_TENSOR_ATTN_LN_BIAS, "encoder.blocks.%d.attn_ln.bias"},
            {ASR_TENSOR_ATTN_QUERY_WEIGHT, "encoder.blocks.%d.attn.query.weight"},
            {ASR_TENSOR_ATTN_QUERY_BIAS, "encoder.blocks.%d.attn.query.bias"},
            {ASR_TENSOR_ATTN_KEY_WEIGHT, "encoder.blocks.%d.attn.key.weight"},
            {ASR_TENSOR_ATTN_VALUE_WEIGHT, "encoder.blocks.%d.attn.value.weight"},
            {ASR_TENSOR_ATTN_VALUE_BIAS, "encoder.blocks.%d.attn.value.bias"},
            {ASR_TENSOR_ATTN_OUT_WEIGHT, "encoder.blocks.%d.attn.out.weight"},
            {ASR_TENSOR_ATTN_OUT_BIAS, "encoder.blocks.%d.attn.out.bias"},
        },
    },
    {
        ASR_SYSTEM_DECODER,
        {
            {ASR_TENSOR_DEC_POS_EMBD, "decoder.positional_embedding"},
            {ASR_TENSOR_DEC_TOKEN_EMBD_WEIGHT, "decoder.token_embedding.weight"},
            {ASR_TENSOR_LN_WEIGHT, "decoder.ln.weight"},
            {ASR_TENSOR_LN_BIAS, "decoder.ln.bias"},

            {ASR_TENSOR_MLP_LN_WEIGHT, "decoder.blocks.%d.mlp_ln.weight"},
            {ASR_TENSOR_MLP_LN_BIAS, "decoder.blocks.%d.mlp_ln.bias"},
            {ASR_TENSOR_MLP_0_WEIGHT, "decoder.blocks.%d.mlp.0.weight"},
            {ASR_TENSOR_MLP_0_BIAS, "decoder.blocks.%d.mlp.0.bias"},
            {ASR_TENSOR_MLP_2_WEIGHT, "decoder.blocks.%d.mlp.2.weight"},
            {ASR_TENSOR_MLP_2_BIAS, "decoder.blocks.%d.mlp.2.bias"},
            {ASR_TENSOR_ATTN_LN_WEIGHT, "decoder.blocks.%d.attn_ln.weight"},
            {ASR_TENSOR_ATTN_LN_BIAS, "decoder.blocks.%d.attn_ln.bias"},
            {ASR_TENSOR_ATTN_QUERY_WEIGHT, "decoder.blocks.%d.attn.query.weight"},
            {ASR_TENSOR_ATTN_QUERY_BIAS, "decoder.blocks.%d.attn.query.bias"},
            {ASR_TENSOR_ATTN_KEY_WEIGHT, "decoder.blocks.%d.attn.key.weight"},
            {ASR_TENSOR_ATTN_VALUE_WEIGHT, "decoder.blocks.%d.attn.value.weight"},
            {ASR_TENSOR_ATTN_VALUE_BIAS, "decoder.blocks.%d.attn.value.bias"},
            {ASR_TENSOR_ATTN_OUT_WEIGHT, "decoder.blocks.%d.attn.out.weight"},
            {ASR_TENSOR_ATTN_OUT_BIAS, "decoder.blocks.%d.attn.out.bias"},
        },
    },
    {
        ASR_SYSTEM_CROSS,
        {
            {ASR_TENSOR_ATTN_LN_WEIGHT, "decoder.blocks.%d.cross_attn_ln.weight"},
            {ASR_TENSOR_ATTN_LN_BIAS, "decoder.blocks.%d.cross_attn_ln.bias"},
            {ASR_TENSOR_ATTN_QUERY_WEIGHT, "decoder.blocks.%d.cross_attn.query.weight"},
            {ASR_TENSOR_ATTN_QUERY_BIAS, "decoder.blocks.%d.cross_attn.query.bias"},
            {ASR_TENSOR_ATTN_KEY_WEIGHT, "decoder.blocks.%d.cross_attn.key.weight"},
            {ASR_TENSOR_ATTN_VALUE_WEIGHT, "decoder.blocks.%d.cross_attn.value.weight"},
            {ASR_TENSOR_ATTN_VALUE_BIAS, "decoder.blocks.%d.cross_attn.value.bias"},
            {ASR_TENSOR_ATTN_OUT_WEIGHT, "decoder.blocks.%d.cross_attn.out.weight"},
            {ASR_TENSOR_ATTN_OUT_BIAS, "decoder.blocks.%d.cross_attn.out.bias"},
        },
    },
};

static const std::map<asr_tensor, ggml_op> ASR_TENSOR_INFO = {
    {ASR_TENSOR_ENC_POS_EMBD,          GGML_OP_ADD},
    {ASR_TENSOR_DEC_POS_EMBD,          GGML_OP_GET_ROWS},
    // Note: ASR_TENSOR_DEC_TOKEN_EMBD_WEIGHT is also used by GGML_OP_MAT_MUL. Need to figure out a way how to handle
    // weight tensors that are used by multiple different operators when extra_buffer_type implementations accelerate
    // more than just GGML_OP_MUL_MAT.
    {ASR_TENSOR_DEC_TOKEN_EMBD_WEIGHT, GGML_OP_GET_ROWS},
    {ASR_TENSOR_LN_WEIGHT,             GGML_OP_MUL},
    {ASR_TENSOR_LN_BIAS,               GGML_OP_ADD},
    {ASR_TENSOR_CONV1_WEIGHT,          GGML_OP_IM2COL},
    {ASR_TENSOR_CONV1_BIAS,            GGML_OP_ADD},
    {ASR_TENSOR_CONV2_WEIGHT,          GGML_OP_IM2COL},
    {ASR_TENSOR_CONV2_BIAS,            GGML_OP_ADD},
    {ASR_TENSOR_LN_POST_WEIGHT,        GGML_OP_MUL},
    {ASR_TENSOR_LN_POST_BIAS,          GGML_OP_ADD},
    {ASR_TENSOR_MLP_LN_WEIGHT,         GGML_OP_MUL},
    {ASR_TENSOR_MLP_LN_BIAS,           GGML_OP_ADD},
    {ASR_TENSOR_MLP_0_WEIGHT,          GGML_OP_MUL_MAT},
    {ASR_TENSOR_MLP_0_BIAS,            GGML_OP_ADD},
    {ASR_TENSOR_MLP_2_WEIGHT,          GGML_OP_MUL_MAT},
    {ASR_TENSOR_MLP_2_BIAS,            GGML_OP_ADD},
    {ASR_TENSOR_ATTN_LN_WEIGHT,        GGML_OP_MUL},
    {ASR_TENSOR_ATTN_LN_BIAS,          GGML_OP_ADD},
    {ASR_TENSOR_ATTN_QUERY_WEIGHT,     GGML_OP_MUL_MAT},
    {ASR_TENSOR_ATTN_QUERY_BIAS,       GGML_OP_ADD},
    {ASR_TENSOR_ATTN_KEY_WEIGHT,       GGML_OP_MUL_MAT},
    {ASR_TENSOR_ATTN_VALUE_WEIGHT,     GGML_OP_MUL_MAT},
    {ASR_TENSOR_ATTN_VALUE_BIAS,       GGML_OP_ADD},
    {ASR_TENSOR_ATTN_OUT_WEIGHT,       GGML_OP_MUL_MAT},
    {ASR_TENSOR_ATTN_OUT_BIAS,         GGML_OP_ADD},
};
