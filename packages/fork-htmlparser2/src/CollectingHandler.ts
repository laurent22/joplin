import MultiplexHandler from "./MultiplexHandler";
import { Handler } from "./Parser";

export class CollectingHandler extends MultiplexHandler {
    _cbs: Partial<Handler>;
    events: [keyof Handler, ...unknown[]][];

    constructor(cbs: Partial<Handler> = {}) {
        super((name, ...args) => {
            this.events.push([name, ...args]);
            if (this._cbs[name]) (this._cbs as any)[name](...args);
        });

        this._cbs = cbs;
        this.events = [];
    }

    onreset() {
        this.events = [];
        if (this._cbs.onreset) this._cbs.onreset();
    }

    restart() {
        if (this._cbs.onreset) this._cbs.onreset();

        for (let i = 0; i < this.events.length; i++) {
            const [name, ...args] = this.events[i];

            if (!this._cbs[name]) {
                continue;
            }

            (this._cbs as any)[name](...args);
        }
    }
}
