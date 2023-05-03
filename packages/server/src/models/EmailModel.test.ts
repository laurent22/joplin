import { EmailSender } from '../services/database/types';
import { beforeAllDb, afterAllTests, beforeEachDb, models, createUserAndSession } from '../utils/testing/testUtils';
import paymentFailedTemplate from '../views/emails/paymentFailedTemplate';

describe('EmailModel', () => {

	beforeAll(async () => {
		await beforeAllDb('EmailModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should not send the same keyed email twice', async () => {
		const { user } = await createUserAndSession();

		const sendEmail = async (key: string) => {
			await models().email().push({
				...paymentFailedTemplate(),
				recipient_email: user.email,
				recipient_id: user.id,
				recipient_name: user.full_name || '',
				sender_id: EmailSender.Support,
				key: key,
			});
		};

		const beforeCount = (await models().email().all()).length;

		await sendEmail('payment_failed_1');

		expect((await models().email().all()).length).toBe(beforeCount + 1);

		await sendEmail('payment_failed_1');

		expect((await models().email().all()).length).toBe(beforeCount + 1);

		await sendEmail('payment_failed_2');

		expect((await models().email().all()).length).toBe(beforeCount + 2);
	});

});
