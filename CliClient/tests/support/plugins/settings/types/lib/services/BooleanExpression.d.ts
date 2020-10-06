export default class BooleanExpression {
    private expression_;
    private rules_;
    constructor(expression: string);
    private createContext;
    private get rules();
    evaluate(context: any): boolean;
}
