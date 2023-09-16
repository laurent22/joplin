import { ListRenderer } from '../plugins/api/noteListType';
import defaultLeftToRightItemRenderer from '../noteList/defaultLeftToRightListRenderer';
import defaultListRenderer from '../noteList/defaultListRenderer';
import { Store } from 'redux';

const renderers_: ListRenderer[] = [
	defaultListRenderer,
	defaultLeftToRightItemRenderer,
];

export const getListRendererIds = () => {
	return renderers_.map(r => r.id);
};

export const getDefaultListRenderer = () => {
	return renderers_[0];
};

export const getListRendererById = (id: string) => {
	return renderers_.find(r => r.id === id);
};

export const registerRenderer = async (store: Store, renderer: ListRenderer) => {
	renderers_.push(renderer);

	store.dispatch({
		type: 'NOTE_LIST_RENDERER_ADD',
		value: renderer.id,
	});
};
