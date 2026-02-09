# Joplin Cloud Help

## Account management

### How can I change my account details?

Most of your account details can be found in your [Profile](/users/me) page. To open it, click on the Profile button - this is the button in the top right corner, with your name or email on it.

### How can I get more space?

If you are on a Basic account, you may upgrade to a Pro account to get more space. Open your [profile](/users/me), then scroll down and select "Upgrade to Pro".

If you are already on a Pro account, and you need more space for specific reasons, please contact us as we may increase the cap in some cases.

### How can I switch to a different billing cycle or plan?

To switch between yearly and monthly payments, or to change from a Basic to Pro plan or vice versa, please open your [profile](/users/me), then scroll down and click on "[Manage subscription](/stripe/portal)". From the Subscription page, click on Update Plan to choose your new billing cycle or to change your plan.

Note that if you downgrade from Pro to Basic, new limitations will apply so for example you may have to delete some notes so that your account is below the required limit.

### What if I exceed the storage space?

If you exceed the storage space, you will not be able to upload new notes. You may however delete notes and attachments so as to free up space. If you are on a Basic plan, you may also upgrade to Pro. If you are on a Pro or Business plan please contact us and let us know that you need more space and we will increase your storage space.

## Billing

### How can I manage my payment details?

To update your card or other payment details, open your [profile](/users/me), then scroll down and click on "[Manage subscription](/stripe/portal)".

### If a payment has failed

This can happen for various reasons, for example if your card is expired, if your bank has blocked the payment, or simply if the card details are not correct. So you may want to check all this, and possibly contact your bank to tell them to authorise the payment.

When a payment has failed, Stripe will retry again a few times, a few days later, so you don't need to do anything. However please note that after 14 days the Joplin Cloud account will be restricted until the payment is made - it will still be possible to download your data, but it will not be possible to upload more.

### How to manually pay an invoice when a payment has failed?

In case of a failed payment, Stripe will retry automatically. However you may also manually pay the invoice by following these steps:

Open your [profile](/users/me), then click on "[Manage subscription](/stripe/portal)". This will open your Joplin Cloud subscription page. Scroll down and, under "Invoice history", click on the invoice that has a failed payment. This will open a new page where you can pay the invoice.

## Team billing

Increasing or decreasing the number of members in a Joplin Cloud Teams account will result in prorated charges. The pro rata amount ensures that you don't get charged for a service you haven't used. For example, if you have 10 team members, for a total of 80 EUR, and add 5 more members (a total of 120 EUR per month) in the middle of the billing period, you will be charged like so:

- 80 - 40 = 40 EUR for the first part of the month
- 120 - 60 = 60 EUR for the second part of the month

So a total of 100 EUR for the first month. The second month will be the regular charge of 120 EUR.

## Cancellation policy

### Can my subscription be refunded?

We offer a 14 days trial when the subscription starts so that you can evaluate the service and potentially change your mind - if you cancel during that period you will not be charged. After that period of time, billing will start and it will not be possible to issue a refund. There will be no exception so please make sure you evaluate the service during the trial period. Consider setting a reminder at 14 days so that you remember to cancel on time if you are not satisfied. We will also send you an email as a reminder.

We offer the yearly subscription at a significant discount but with the understanding that you are able to commit for a year. If you are not sure, we recommend starting with a monthly subscription and switching to a yearly subscription later on.

Please note that it is however possible to cancel the subscription. Cancellation will be effective from the next billing cycle.

### How can I cancel my account?

Open your [profile](/users/me), then scroll down and click on "[Manage subscription](/stripe/portal)". Your subscription will be cancelled and you will not be charged on what would have been the next billing period. Please note that we do not cancel accounts over email as we cannot verify your identity, however we can provide assistance if there is an issue.

## Data retention

Disabled accounts on Joplin Cloud are automatically deleted 99 days after they have been disabled (*). A disabled account is one where the Stripe subscription has been cancelled either by the user or automatically (eg for unpaid invoices).

When an account is deleted, all notes, notebooks, tags, attachments, etc. are permanently deleted. User information, in particular emails and full names will be removed from the system within 92 days, but archived for an additional 90 days for legal reasons, after which they will be deleted too.

If you wish to delete your data before this delay, simply delete all your notes and notebooks from the app, then synchronise with Joplin Cloud. You can use the [Victor plugin](https://joplinapp.org/plugins/plugin/org.joplinapp.plugins.Victor/) to make this easier. After synchronisation, the data will be removed from the server too. For safety reasons, we do not delete data on request.

(*) After 90 days, they are queued for deletion; 2 days later, they are removed from the system (no longer accessible); and 7 days later they are permanently deleted.

## Why was I charged?

If you have been charged and you didn't expect it the most likely explanation is that the trial ended, after 14 days, and an invoice was emitted. You may have cancelled the subscription after that date, but the invoice is still due.

Likewise, if your subscription was renewed, an invoice was emitted. And if the subscription is cancelled afterwards, that invoice is still due and thus you will receive payment reminders.

In general, cancelling a subscription does not cancel existing invoices.

## Further information

- [Joplin Official Website](https://joplinapp.org)
- [Joplin Support Forum](https://discourse.joplinapp.org/)
- [Joplin Cloud Privacy Policy](/privacy)
- [Joplin Cloud Terms & Conditions](/terms)
