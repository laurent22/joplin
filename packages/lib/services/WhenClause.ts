import { ContextKeyExpr, ContextKeyExpression } from './contextkey/contextkey';

export default class WhenClause {

	private expression_: string;
	private validate_: boolean;
	private rules_: ContextKeyExpression = null;

	constructor(expression: string, validate: boolean) {
		this.expression_ = expression;
		this.validate_ = validate;
	}

	private createContext(ctx: any) {
		return {
			getValue: (key: string) => {
				return ctx[key];
			},
		};
	}

	private get rules(): ContextKeyExpression {
		if (!this.rules_) {
			this.rules_ = ContextKeyExpr.deserialize(this.expression_);
		}

		return this.rules_;
	}

	public evaluate(context: any): boolean {
		if (this.validate_) this.validate(context);
		return this.rules.evaluate(this.createContext(context));
	}

	public validate(context: any) {
		const keys = this.rules.keys();
		for (const key of keys) {
			if (!(key in context)) throw new Error(`No such key: ${key}`);
		}
	}

}
