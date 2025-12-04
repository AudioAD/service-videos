import type { EventHandlerRequest, H3Event } from "h3";

const getAccessToken = (event: H3Event<EventHandlerRequest>) => {
	const authorizationHeader = getHeader(event, "Authorization");
	const authorizationMatch = authorizationHeader?.match(/Bearer\s+(.*)/);

	if (authorizationMatch) {
		return authorizationMatch[1].trim();
	}

	return getCookie(event, "accessToken")?.trim();
};

export default getAccessToken;
