import type { EventHandlerRequest, H3Event } from "h3";

const getUserId = async (event: H3Event<EventHandlerRequest>) => {
	const accessToken = getAccessToken(event);
	const { secret } = useRuntimeConfig();
	const { userId } = await verify(accessToken, secret);
	return userId;
};

export default getUserId;
