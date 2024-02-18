import { ListRendererDependency } from '../plugins/api/noteListType';

export default (dep: ListRendererDependency) => {
	let output: string = dep as string;
	if (output.endsWith(':display')) output = output.substring(0, output.length - 8);
	if (output === 'note.titleHtml') output = 'note.title';
	return output;
};
