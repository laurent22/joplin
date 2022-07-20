import { PointerEvt } from "../types";
import BaseTool from "./BaseTool";


export default class Eraser extends BaseTool {
    public constructor() {
        super();
    }


    public onPointerDown(event: PointerEvt): boolean {
        throw new Error("Method not implemented.");
    }
    public onPointerMove(event: PointerEvt): void {
        throw new Error("Method not implemented.");
    }
    public onPointerUp(event: PointerEvt): void {
        throw new Error("Method not implemented.");
    }
    public onGestureCancel(): void {
        throw new Error("Method not implemented.");
    }
}