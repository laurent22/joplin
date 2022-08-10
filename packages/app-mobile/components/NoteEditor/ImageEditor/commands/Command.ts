import SVGEditor from '../SVGEditor';


interface Command {
	apply(editor: SVGEditor): void;
	unapply(editor: SVGEditor): void;
}

// eslint-disable-next-line no-redeclare
namespace Command {
	export const empty = {
		apply(_editor: SVGEditor) { },
		unapply(_editor: SVGEditor) { },
	};

	export const union = (a: Command, b: Command): Command => {
		return {
			apply(editor: SVGEditor) {
				a.apply(editor);
				b.apply(editor);
			},
			unapply(editor: SVGEditor) {
				b.unapply(editor);
				a.unapply(editor);
			},
		};
	};
}

export default Command;
