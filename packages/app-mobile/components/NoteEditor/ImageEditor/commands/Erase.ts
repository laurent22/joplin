import ImageEditor from "../editor";
import { Point2, Vec2 } from "../math";
import Command from "./Command";

export default class Erase implements Command {
    public constructor(
        private readonly start: Point2,
        private readonly path: Vec2[]) {
    }

    public apply(editor: ImageEditor): void {
        throw new Error("Method not implemented.");
    }

    public unapply(editor: ImageEditor): void {
        throw new Error("Method not implemented.");
    }
}