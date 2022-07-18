import ImageEditor from "../editor";


export default interface Command {
	apply(editor: ImageEditor): void;
	unapply(editor: ImageEditor): void;
}