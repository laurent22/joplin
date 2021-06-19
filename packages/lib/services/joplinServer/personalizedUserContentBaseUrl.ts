// For this:
//
// userId: d67VzcrHs6zGzROagnzwhOZJI0vKbezc
// baseUrl: http://example.com
// userContentBaseUrl: http://usercontent.com
//
// => Returns http://d67Vzcrhs6.usercontent.com
//
// If the userContentBaseUrl is an empty string, the baseUrl is returned instead.
export default function(userId: string, baseUrl: string, userContentBaseUrl: string) {
	if (userContentBaseUrl && baseUrl !== userContentBaseUrl) {
		if (!userId) throw new Error('User ID must be specified');
		const url = new URL(userContentBaseUrl);
		return `${url.protocol}//${userId.substr(0, 10).toLowerCase()}.${url.host}`;
	} else {
		return baseUrl;
	}
}
