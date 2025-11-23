"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const contextkey_1 = require("./contextkey/contextkey");
function parseAdvancedExpression(advancedExpression) {
    let subExpressionIndex = -1;
    let subExpressions = '';
    let currentSubExpressionKey = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    const subContext = {};
    let inBrackets = false;
    for (let i = 0; i < advancedExpression.length; i++) {
        const c = advancedExpression[i];
        if (c === '(') {
            if (inBrackets)
                throw new Error('Nested brackets not supported');
            inBrackets = true;
            subExpressionIndex++;
            currentSubExpressionKey = `__sub_${subExpressionIndex}`;
            subContext[currentSubExpressionKey] = '';
            continue;
        }
        if (c === ')') {
            if (!inBrackets)
                throw new Error('Closing bracket without an opening one');
            inBrackets = false;
            subExpressions += currentSubExpressionKey;
            currentSubExpressionKey = '';
            continue;
        }
        if (inBrackets) {
            subContext[currentSubExpressionKey] += c;
        }
        else {
            subExpressions += c;
        }
    }
    return {
        compiledText: subExpressions,
        subExpressions: subContext,
        original: advancedExpression,
    };
}
class WhenClause {
    constructor(expression, validate = true) {
        this.ruleCache_ = {};
        this.expression_ = parseAdvancedExpression(expression);
        this.validate_ = validate;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    createContext(ctx) {
        return {
            getValue: (key) => {
                return ctx[key];
            },
        };
    }
    rules(exp) {
        if (this.ruleCache_[exp])
            return this.ruleCache_[exp];
        this.ruleCache_[exp] = contextkey_1.ContextKeyExpr.deserialize(exp);
        return this.ruleCache_[exp];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    evaluate(context) {
        if (this.validate_)
            this.validate(context);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const subContext = {};
        for (const k in this.expression_.subExpressions) {
            const subExp = this.expression_.subExpressions[k];
            subContext[k] = this.rules(subExp).evaluate(this.createContext(context));
        }
        const fullContext = Object.assign(Object.assign({}, context), subContext);
        return this.rules(this.expression_.compiledText).evaluate(this.createContext(fullContext));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    validate(context) {
        const keys = this.rules(this.expression_.original.replace(/[()]/g, ' ')).keys();
        for (const key of keys) {
            if (!(key in context))
                throw new Error(`No such key: ${key}`);
        }
    }
}
exports.default = WhenClause;
