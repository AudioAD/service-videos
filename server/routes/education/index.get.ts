import { getRequestURL } from "h3";
import { resolveEducationStartDate, resolveVideoUnlockDate } from "~/utils/education";
import {
	fetchPublicAssetBuffer,
	resolveMimeTypeFromUrl,
	resolveStaticAssetUrl,
} from "~/utils/staticAssets";
import { extractVideoDurationSeconds } from "~/utils/videoMetadata";

export default eventHandler(async (event) => {
	const user = await getUser(event);

	if (!user) {
		throw createError({
			statusCode: 401,
			statusMessage: "Unauthorized",
			message: "Unable to resolve user from access token",
		});
	}

	const requestUrl = getRequestURL(event, {
		xForwardedHost: true,
		xForwardedProto: true,
	});

	const [videos, progress] = await Promise.all([
		ModelEducationVideo.find().sort({ order: 1 }).lean(),
		ModelUserEducationProgress.find({ userId: user._id.toString() })
			.select({ videoId: 1, viewedAt: 1, createdAt: 1 })
			.lean(),
	]);
	const progressMap = new Map(
		progress.map((item) => [item.videoId.toString(), item]),
	);

	const baseStartDate = resolveEducationStartDate(user);
	const now = new Date();
	const durationCache = new Map<string, number | undefined>();

	const ensureDurationSeconds = async (
		video: (typeof videos)[number],
	): Promise<number | undefined> => {
		const cacheKey = video._id.toString();
		if (durationCache.has(cacheKey)) {
			return durationCache.get(cacheKey);
		}

		let durationSeconds = video.durationSeconds ?? undefined;
		if (!durationSeconds) {
			try {
				const buffer = await fetchPublicAssetBuffer(video.url);
				if (buffer) {
					const mimeType = resolveMimeTypeFromUrl(video.url);
					durationSeconds = await extractVideoDurationSeconds(
						buffer,
						mimeType,
					);
					if (durationSeconds) {
						await ModelEducationVideo.updateOne(
							{ _id: video._id },
							{ durationSeconds },
						);
					}
				}
			} catch (error) {
				console.error("Failed to resolve video duration", {
					videoId: cacheKey,
					error,
				});
			}
		}

		durationCache.set(cacheKey, durationSeconds);
		return durationSeconds;
	};

	const enrichedVideos = await Promise.all(
		videos.map(async (video) => {
			const unlockSourceDate = resolveVideoUnlockDate(video, baseStartDate);
			const viewedEntry = progressMap.get(video._id.toString());
			const unlockDate = unlockSourceDate ? new Date(unlockSourceDate) : null;
			const available = !unlockDate || unlockDate <= now;
			const durationSeconds = await ensureDurationSeconds(video);

			return {
				id: video._id.toString(),
				title: video.title,
				description: video.description ?? undefined,
				url: resolveStaticAssetUrl(video.url, requestUrl.origin),
				order: video.order,
				durationSeconds: durationSeconds ?? undefined,
				unlock_date: unlockDate,
				available,
				viewed: Boolean(viewedEntry),
				viewed_at: viewedEntry?.viewedAt ?? null,
			};
		}),
	);

	return enrichedVideos;
});
