import AbstractComponent from "../components/AbstractComponent";
import ImageEditor from "../editor";
import EditorImage from "../EditorImage";
import Command from "./Command";

export default class Erase implements Command {
	private toRemove: AbstractComponent[];

	public constructor(toRemove: AbstractComponent[]) {
		// Clone the list
		this.toRemove = toRemove.map(elem => elem);
	}

	public apply(editor: ImageEditor): void {
		for (const elem of this.toRemove) {
			editor.image.findParent(elem)?.remove();
		}
	}

	public unapply(editor: ImageEditor): void {
		for (const part of this.toRemove) {
			if (!editor.image.findParent(part)) {
				new EditorImage.AddElementCommand(part).apply(editor);
			}
		}
	}
}