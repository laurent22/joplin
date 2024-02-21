import { ListRendererDependency } from '../plugins/api/noteListType';

export default (dep: ListRendererDependency) => {
	let output: string = dep as string;
	if (output === 'note.titleHtml') output = 'note.title';
	return output;
};
