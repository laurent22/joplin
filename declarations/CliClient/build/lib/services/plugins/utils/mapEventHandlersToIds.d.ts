export interface EventHandlers {
    [key: string]: Function;
}
export default function mapEventHandlersToIds(arg: any, eventHandlers: EventHandlers): any;
