// The SAML routes, which are browser-based, were incorrectly set as API routes, and that cause
// cookie issues since api.example.com is attempting to set cookies for example.com. We can't just
// remove the /api/saml routes because some organisations already use them in a setup where they
// don't have a separate domain for the API (and in this case cookies work). Instead, we create this
// wrapper that duplicates the routes of /api/saml and make them available under /saml.
//
// Unfortunately it means that a non-API route will be available under /api which is confusing but
// the best way to maintain backward compatibility.

import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { setupRoutes } from '../api/login';

export const router = new Router(RouteType.Web);

router.public = true;

setupRoutes(router);

export default router;
