# How to test the complete workflow locally

- In website/build.ts, set the env to "dev", then build the website - `yarn run watchWebsite`
- Start the Stripe CLI tool: `yarn run stripeListen`
- Copy the webhook secret, and paste it in joplin-credentials/server.env (under STRIPE_WEBHOOK_SECRET)
- Start the local Joplin Server, `yarn run start-dev`, running under http://joplincloud.local:22300
- Start the workflow from http://localhost:8077/plans/
- The local website often is not configured to send email, but you can see them in the database, in the "emails" table.

# Simplified workflow

To test without running the main website, use http://joplincloud.local:22300/stripe/checkoutTest

# Stripe config

- The public config is under packages/server/stripeConfig.json
- The private config is in the server .env file

# Failed Stripe cli login

If the tool show this error, with code "api_key_expired":

> FATAL Error while authenticating with Stripe: Authorization failed

Need to logout and login again to refresh the CLI token - `stripe logout && stripe login`