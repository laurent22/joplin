"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Router_1 = require("../../utils/Router");
const types_1 = require("../../utils/types");
const MarkdownIt = require("markdown-it");
const markdownUtils_1 = require("@joplin/lib/markdownUtils");
const config_1 = require("../../config");
const router = new Router_1.default(types_1.RouteType.Web);
router.public = true;
router.get('terms', (_path, _ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const markdownIt = new MarkdownIt();
    return markdownIt.render(`# **Joplin Cloud** usage terms and conditions

Welcome to our website. If you continue to browse and use this website, you are agreeing to comply with and be bound by the following terms and conditions of use, which together with our privacy policy govern JOPLIN’s relationship with you in relation to this website. JOPLIN is the owner of this website, Joplin Cloud. If you disagree with any part of these terms and conditions, please do not use our website.

The term ‘Joplin Cloud’ or ‘us’ or ‘we’ refers to the owner of the website whose registered office is 32 Greenfield Gardens, London, NW2 1HX. Our company registration number is 06547799. The term ‘you’ refers to the user or viewer of our website.

The use of this website is subject to the following terms of use:

- The content of the pages of this website is for your general information and use only. It is subject to change without notice.

- This website uses cookies to save login session. If you do not allow cookies to be used, you will not be able to login to the website.

- Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness or suitability of the information and materials found or offered on this website for any particular purpose. You acknowledge that such information and materials may contain inaccuracies or errors and we expressly exclude liability for any such inaccuracies or errors to the fullest extent permitted by law.

- Your use of any information or materials on this website is entirely at your own risk, for which we shall not be liable. It shall be your own responsibility to ensure that any products, services or information available through this website meet your specific requirements.

- This website contains material which is owned by or licensed to us. This material includes, but is not limited to, the design, layout, look, appearance and graphics. Reproduction is prohibited other than in accordance with the copyright notice, which forms part of these terms and conditions.

- All trademarks reproduced in this website, which are not the property of, or licensed to the operator, are acknowledged on the website.

- Unauthorised use of this website may give rise to a claim for damages and/or be a criminal offence.

- From time to time, this website may also include links to other websites. These links are provided for your convenience to provide further information. They do not signify that we endorse the website(s). We have no responsibility for the content of the linked website(s).

- Your use of this website and any dispute arising out of such use of the website is subject to the laws of England, Northern Ireland, Scotland and Wales.

- Please contact us at [${markdownUtils_1.default.escapeTitleText((0, config_1.default)().supportEmail)}](mailto:${markdownUtils_1.default.escapeLinkUrl((0, config_1.default)().supportEmail)}) for any question.`);
}));
exports.default = router;
//# sourceMappingURL=terms.js.map