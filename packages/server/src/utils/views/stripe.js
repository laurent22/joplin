"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stripe_1 = require("../stripe");
function setupStripeView(view) {
    view.jsFiles.push('stripe_utils');
    view.content.stripeConfig = (0, stripe_1.stripeConfig)();
    view.content.stripeConfigJson = JSON.stringify((0, stripe_1.stripeConfig)());
    return view;
}
exports.default = setupStripeView;
//# sourceMappingURL=stripe.js.map