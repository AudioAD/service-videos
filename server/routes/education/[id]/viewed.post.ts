import { getRouterParams } from "h3";
import { z } from "zod";
import { resolveEducationStartDate, resolveVideoUnlockDate } from "~/utils/education";
import objectIdTransform from "~/utils/objectIdTransform";
import zodValidateData from "~/utils/zodValidateData";

const paramsSchema = z.object({
	id: z.string().transform(objectIdTransform),
});

export default eventHandler(async (event) => {
	const user = await getUser(event);
	if (!user) {
		throw createError({
			statusCode: 401,
			statusMessage: "Unauthorized",
			message: "Unable to resolve user from access token",
		});
	}

	const { id } = await zodValidateData(getRouterParams(event), paramsSchema.parse);
	const video = await ModelEducationVideo.findById(id);

	if (!video) {
		throw createError({
			statusCode: 404,
			statusMessage: "Not Found",
			message: "Video not found",
		});
	}

	const unlockDate = resolveVideoUnlockDate(video, resolveEducationStartDate(user));
	if (unlockDate && unlockDate > new Date()) {
		throw createError({
			statusCode: 403,
			statusMessage: "Forbidden",
			message: "Video is not available yet",
		});
	}

	const viewedAt = new Date();
	const progress = await ModelUserEducationProgress.findOneAndUpdate(
		{ userId: user._id.toString(), videoId: video._id },
		{ viewedAt },
		{ upsert: true, new: true, setDefaultsOnInsert: true },
	);

	return {
		id: video._id.toString(),
		viewed: true,
		viewed_at: progress.viewedAt ?? viewedAt,
	};
});
