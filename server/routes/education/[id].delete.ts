import { rm } from "node:fs/promises";
import { getRouterParam } from "h3";
import { basename, join } from "pathe";
import { VIDEO_PERMISSIONS, assertUserPermission } from "~/utils/permissions";

const PUBLIC_VIDEO_DIR = join(process.cwd(), "public", "education-videos");

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

	const videoId = getRouterParam(event, "id");

	if (!videoId?.trim()) {
		throw createError({
			statusCode: 400,
			statusMessage: "Bad Request",
			message: "Video id is required",
		});
	}

	const video = await ModelEducationVideo.findById(videoId).lean();

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
