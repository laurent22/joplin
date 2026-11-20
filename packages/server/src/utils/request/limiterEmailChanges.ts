import accountActionLimiter from './accountActionLimiter';

// Each email change sends a message to the new address, so an account could otherwise send any number of emails.
export default accountActionLimiter(3, 60 * 60, 'Too many email changes');
