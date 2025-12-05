import { rm } from "node:fs/promises";
import { basename, join } from "pathe";
import { getRouterParams } from "h3";
import { z } from "zod";
import { VIDEO_PERMISSIONS, assertUserPermission } from "~/utils/permissions";
import objectIdTransform from "~/utils/objectIdTransform";
import zodValidateData from "~/utils/zodValidateData";

const PUBLIC_VIDEO_DIR = join(process.cwd(), "public", "education-videos");

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

	assertUserPermission(user, VIDEO_PERMISSIONS.delete);

	const { id } = await zodValidateData(getRouterParams(event), paramsSchema.parse);

	const video = await ModelEducationVideo.findById(id).lean();

	if (!video) {
		throw createError({
			statusCode: 404,
			statusMessage: "Not Found",
			message: "Video not found",
		});
	}

	await Promise.all([
		ModelEducationVideo.deleteOne({ _id: video._id }),
		ModelUserEducationProgress.deleteMany({ videoId: video._id }),
	]);

	await ModelEducationVideo.updateMany(
		{ order: { $gt: video.order } },
		{ $inc: { order: -1 } },
	);

	const fileName = basename(video.url || "");
	if (fileName && fileName !== "." && fileName !== "..") {
		const filePath = join(PUBLIC_VIDEO_DIR, fileName);
		try {
			await rm(filePath, { force: true });
		} catch (error) {
			console.error("Failed to remove deleted education video file", {
				filePath,
				error,
			});
		}
	}

	return {
		id: video._id.toString(),
		deleted: true,
	};
});
