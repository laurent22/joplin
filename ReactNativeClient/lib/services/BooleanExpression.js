'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const contextkey_1 = require('./contextkey/contextkey');
class WhenClause {
	constructor(expression) {
		this.rules_ = null;
		this.expression_ = expression;
	}
	createContext(ctx) {
		return {
			getValue: (key) => {
				return ctx[key];
			},
		};
	}
	get rules() {
		if (!this.rules_) {
			this.rules_ = contextkey_1.ContextKeyExpr.deserialize(this.expression_);
		}
		return this.rules_;
	}
	evaluate(context) {
		return this.rules.evaluate(this.createContext(context));
	}
}
exports.default = WhenClause;
// # sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQm9vbGVhbkV4cHJlc3Npb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJCb29sZWFuRXhwcmVzc2lvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHdEQUErRTtBQUUvRSxNQUFxQixVQUFVO0lBSzlCLFlBQVksVUFBaUI7UUFGckIsV0FBTSxHQUF3QixJQUFJLENBQUM7UUFHMUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUM7SUFDL0IsQ0FBQztJQUVPLGFBQWEsQ0FBQyxHQUFRO1FBQzdCLE9BQU87WUFDTixRQUFRLEVBQUUsQ0FBQyxHQUFXLEVBQUUsRUFBRTtnQkFDekIsT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDakIsQ0FBQztTQUNELENBQUM7SUFDSCxDQUFDO0lBRUQsSUFBWSxLQUFLO1FBQ2hCLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ2pCLElBQUksQ0FBQyxNQUFNLEdBQUcsMkJBQWMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1NBQzNEO1FBQ0QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3BCLENBQUM7SUFFTSxRQUFRLENBQUMsT0FBVztRQUMxQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUN6RCxDQUFDO0NBRUQ7QUE1QkQsNkJBNEJDIn0=
