import { PointerEvt } from "../types";
import BaseTool from "./BaseTool";
import ImageEditor from '../editor';

export default class Eraser extends BaseTool {
    public constructor(private editor: ImageEditor) {
        super();
    }


    public onPointerDown(event: PointerEvt): boolean {
		// TODO:
    }
    public onPointerMove(event: PointerEvt): void {
        // TODO: Draw line from current to last point.
		//       Did it intersect anything?
		//       Remove things it crossed.
    }
    public onPointerUp(event: PointerEvt): void {
        throw new Error("Method not implemented.");
    }
    public onGestureCancel(): void {
        throw new Error("Method not implemented.");
    }
}
