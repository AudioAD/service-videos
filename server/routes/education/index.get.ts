import { getQuery, getRequestURL } from "h3";
import { z } from "zod";
import { resolveEducationStartDate, resolveVideoUnlockDate } from "~/utils/education";
import {
	fetchPublicAssetBuffer,
	resolveMimeTypeFromUrl,
	resolveStaticAssetUrl,
} from "~/utils/staticAssets";
import { extractVideoDurationSeconds } from "~/utils/videoMetadata";
import zodValidateData from "~/utils/zodValidateData";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;

const querySchema = z.object({
	page: z
		.string()
		.optional()
		.transform((value) => {
			const parsed = Number.parseInt(value ?? "", 10);
			return Number.isFinite(parsed) && parsed >= 1 ? parsed : DEFAULT_PAGE;
		}),
	limit: z
		.string()
		.optional()
		.transform((value) => {
			const parsed = Number.parseInt(value ?? "", 10);
			if (!Number.isFinite(parsed) || parsed < 1) {
				return DEFAULT_LIMIT;
			}
			return Math.min(parsed, MAX_LIMIT);
		}),
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

	const config = useRuntimeConfig();
	const requestUrl = getRequestURL(event, {
		xForwardedHost: true,
		xForwardedProto: true,
	});
	const assetBaseUrl =
		config.public?.assetBaseUrl || config.appUrl || requestUrl.origin;
	const query = getQuery(event);
	const { page, limit } = await zodValidateData(query, querySchema.parse);
	const skip = (page - 1) * limit;

	const [videos, totalVideos] = await Promise.all([
		ModelEducationVideo.find()
			.sort({ order: 1 })
			.skip(skip)
			.limit(limit)
			.lean(),
		ModelEducationVideo.countDocuments(),
	]);

	const videoIds = videos.map((video) => video._id);
	const progress = videoIds.length
		? await ModelUserEducationProgress.find({
				userId: user._id.toString(),
				videoId: { $in: videoIds },
			})
				.select({ videoId: 1, viewedAt: 1, createdAt: 1 })
				.lean()
		: [];

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
				url: resolveStaticAssetUrl(video.url, assetBaseUrl),
				order: video.order,
				durationSeconds: durationSeconds ?? undefined,
				unlock_date: unlockDate,
				available,
				viewed: Boolean(viewedEntry),
				viewed_at: viewedEntry?.viewedAt ?? null,
			};
		}),
	);

	const hasMore = page * limit < totalVideos;

	return {
		items: enrichedVideos,
		page,
		limit,
		total: totalVideos,
		hasMore,
		nextPage: hasMore ? page + 1 : null,
	};
});
