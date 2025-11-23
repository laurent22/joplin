"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRenderer = exports.getListRendererById = exports.getDefaultListRenderer = exports.getListRendererIds = void 0;
// import defaultLeftToRightItemRenderer from '../noteList/defaultLeftToRightListRenderer';
const defaultListRenderer_1 = require("../noteList/defaultListRenderer");
const defaultMultiColumnsRenderer_1 = require("../noteList/defaultMultiColumnsRenderer");
const renderers_ = [
    defaultListRenderer_1.default,
    defaultMultiColumnsRenderer_1.default,
    // defaultLeftToRightItemRenderer,
];
const getListRendererIds = () => {
    return renderers_.map(r => r.id);
};
exports.getListRendererIds = getListRendererIds;
const getDefaultListRenderer = () => {
    return renderers_[0];
};
exports.getDefaultListRenderer = getDefaultListRenderer;
const getListRendererById = (id) => {
    return renderers_.find(r => r.id === id);
};
exports.getListRendererById = getListRendererById;
const registerRenderer = async (store, renderer) => {
    renderers_.push(renderer);
    store.dispatch({
        type: 'NOTE_LIST_RENDERER_ADD',
        value: renderer.id,
    });
};
exports.registerRenderer = registerRenderer;
