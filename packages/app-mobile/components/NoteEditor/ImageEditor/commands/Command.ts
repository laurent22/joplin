import ImageEditor from "../editor";


interface Command {
	apply(editor: ImageEditor): void;
	unapply(editor: ImageEditor): void;
}

namespace Command {
	export const empty = {
		apply(_editor: ImageEditor) { },
		unapply(_editor: ImageEditor) { },
	};

	export const union = (a: Command, b: Command): Command => {
		return {
			apply(editor: ImageEditor) {
				a.apply(editor);
				b.apply(editor);
			},
			unapply(editor: ImageEditor) {
				b.unapply(editor);
				a.unapply(editor);
			},
		};
	};
}

export default Command;