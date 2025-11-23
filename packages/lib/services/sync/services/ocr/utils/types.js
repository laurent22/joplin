"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyRecognizeResult = void 0;
const types_1 = require("../../database/types");
const emptyRecognizeResult = () => {
    return {
        ocr_status: types_1.ResourceOcrStatus.Todo,
        ocr_text: '',
        ocr_details: '',
        ocr_error: '',
    };
};
exports.emptyRecognizeResult = emptyRecognizeResult;
