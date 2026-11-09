import accountActionLimiter from './accountActionLimiter';

// Each invitation tells the sharer whether an email address has an account, so an account that can share a notebook
// could otherwise check any number of addresses.
export default accountActionLimiter(50, 60 * 60, 'Too many invitations');
