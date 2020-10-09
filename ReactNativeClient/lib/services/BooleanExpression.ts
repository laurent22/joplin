import { ContextKeyExpr, ContextKeyExpression } from './contextkey/contextkey';

export default class BooleanExpression {

	private expression_:string;
	private rules_:ContextKeyExpression = null;

	constructor(expression:string) {
		this.expression_ = expression;
	}

	private createContext(ctx: any) {
		return {
			getValue: (key: string) => {
				return ctx[key];
			},
		};
	}

	private get rules():ContextKeyExpression {
		if (!this.rules_) {
			this.rules_ = ContextKeyExpr.deserialize(this.expression_);
		}
		return this.rules_;
	}

	public evaluate(context:any):boolean {
		return this.rules.evaluate(this.createContext(context));
	}

}
