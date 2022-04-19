import { ContextKeyExpr, ContextKeyExpression, IContext } from './contextkey/contextkey';

// We would like to support expressions with brackets but VSCode When Clauses
// don't support this. To support this, we split the expressions with brackets
// into sub-expressions, which can then be parsed and executed separately by the
// When Clause library.
interface AdvancedExpression {
	// (test1 && test2) || test3
	original: string;
	// __sub_1 || test3
	compiledText: string;
	// { __sub_1: "test1 && test2" }
	subExpressions: any;
}

function parseAdvancedExpression(advancedExpression: string): AdvancedExpression {
	let subExpressionIndex = -1;
	let subExpressions: string = '';
	let currentSubExpressionKey = '';
	const subContext: any = {};

	let inBrackets = false;
	for (let i = 0; i < advancedExpression.length; i++) {
		const c = advancedExpression[i];

		if (c === '(') {
			if (inBrackets) throw new Error('Nested brackets not supported');
			inBrackets = true;
			subExpressionIndex++;
			currentSubExpressionKey = `__sub_${subExpressionIndex}`;
			subContext[currentSubExpressionKey] = '';
			continue;
		}

		if (c === ')') {
			if (!inBrackets) throw new Error('Closing bracket without an opening one');
			inBrackets = false;
			subExpressions += currentSubExpressionKey;
			currentSubExpressionKey = '';
			continue;
		}

		if (inBrackets) {
			subContext[currentSubExpressionKey] += c;
		} else {
			subExpressions += c;
		}
	}

	return {
		compiledText: subExpressions,
		subExpressions: subContext,
		original: advancedExpression,
	};
}

export default class WhenClause {

	private expression_: AdvancedExpression;
	private validate_: boolean;
	private ruleCache_: Record<string, ContextKeyExpression> = {};
	private static whenClauseCache_: { [expression: string]: { [validate: string]: WhenClause } } = {};

	public constructor(expression: string, validate: boolean = true) {
		this.expression_ = parseAdvancedExpression(expression);
		this.validate_ = validate;
	}

	// Since a WhenClause object is immutable, and its creation cost is high,
	// it should be reused.
	public static get(expression: string, validate: boolean): WhenClause {
		WhenClause.whenClauseCache_[expression] ??= {};
		const entry = WhenClause.whenClauseCache_[expression];
		const vkey = validate ? 'true' : 'false';
		entry[vkey] ??= new WhenClause(expression, validate);
		return entry[vkey];
	}

	private createContext(ctx1: any, ctx2: any = null): IContext {
		return { getValue: key => ctx2?.[key] ?? ctx1[key] };
	}

	private rules(exp: string): ContextKeyExpression {
		if (this.ruleCache_[exp]) return this.ruleCache_[exp];
		this.ruleCache_[exp] = ContextKeyExpr.deserialize(exp);
		return this.ruleCache_[exp];
	}

	public evaluate(context: any): boolean {
		if (this.validate_) this.validate(context);

		const subContext: any = {};
		const ctx = this.createContext(context);

		for (const k in this.expression_.subExpressions) {
			const subExp = this.expression_.subExpressions[k];
			subContext[k] = this.rules(subExp).evaluate(ctx);
		}

		return this.rules(this.expression_.compiledText).evaluate(this.createContext(context, subContext));
	}

	public validate(context: any) {
		const keys = this.rules(this.expression_.original.replace(/[()]/g, ' ')).keys();
		for (const key of keys) {
			if (!(key in context)) throw new Error(`No such key: ${key}`);
		}
	}

}
