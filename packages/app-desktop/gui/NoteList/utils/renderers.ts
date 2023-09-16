import { ListRenderer } from '@joplin/lib/services/plugins/api/noteListType';
import defaultLeftToRightItemRenderer from './defaultLeftToRightListRenderer';
import defaultListRenderer from './defaultListRenderer';

const renderers_: ListRenderer[] = [
	defaultListRenderer,
	defaultLeftToRightItemRenderer,
];

export const getListRendererIds = () => {
	return renderers_.map(r => r.id);
};

export const getListRendererById = (id: string) => {
	return renderers_.find(r => r.id === id);
};
