import { isPublicAddress } from './publicNetworkOnly';

describe('publicNetworkOnly', () => {

	test.each([
		['8.8.8.8', true],
		['2606:4700:4700::1111', true],
		['127.0.0.1', false],
		['10.0.1.23', false],
		['172.16.0.1', false],
		['192.168.1.1', false],
		['169.254.169.254', false],
		['100.64.0.1', false],
		['0.0.0.0', false],
		['255.255.255.255', false],
		['::1', false],
		['::ffff:127.0.0.1', false],
		['64:ff9b::a00:1', false],
		['fd00:ec2::254', false],
		['fe80::1', false],
		['localhost', false],
	])('isPublicAddress(%s) should be %s', (address, expected) => {
		expect(isPublicAddress(address)).toBe(expected);
	});

});
