import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "pathe";
import { getRequestURL, readMultipartFormData } from "h3";
import { extractVideoDurationSeconds } from "~/utils/videoMetadata";
import {
	resolveExtensionFromMimeType,
	resolveStaticAssetUrl,
} from "~/utils/staticAssets";

const PUBLIC_VIDEO_DIR = join(process.cwd(), "public", "education-videos");

const uploadPayloadSchema = z.object({
	title: z
		.string()
		.min(1, "Title is required")
		.transform((value) => value.trim())
		.refine((value) => value.length > 0, {
			message: "Title is required",
		}),
	description: z
		.string()
		.optional()
		.transform((value) => value?.trim() || undefined),
	unlockDate: z
		.string()
		.optional()
		.transform((value, ctx) => {
			if (!value) {
				return undefined;
			}

			const parsed = new Date(value);

			if (Number.isNaN(parsed.getTime())) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Invalid unlock date",
				});
				return z.NEVER;
			}

			return parsed;
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

	const formData = await readMultipartFormData(event);

	if (!formData) {
		throw createError({
			statusCode: 400,
			statusMessage: "Bad Request",
			message: "Expected multipart/form-data request",
		});
	}

	const fields: Record<string, string> = {};
	let videoFile: (typeof formData)[number] | undefined;

	for (const part of formData) {
		const isFilePart =
			typeof part.filename === "string" && part.filename.length > 0;
		if (isFilePart) {
			if (!videoFile && part.data?.length) {
				videoFile = part;
			}
			continue;
		}

		if (part.name) {
			fields[part.name] = part.data?.toString("utf8") ?? "";
		}
	}

	if (!videoFile) {
		throw createError({
			statusCode: 400,
			statusMessage: "Bad Request",
			message: "Video file is required",
		});
	}

	const { title, description, unlockDate } = await zodValidateData(
		fields,
		uploadPayloadSchema.parse,
	);

	const lastVideo = await ModelEducationVideo.findOne({}, { order: 1 })
		.sort({ order: -1 })
		.lean();
	const nextOrder = (lastVideo?.order ?? 0) + 1;

	if (nextOrder > 60) {
		throw createError({
			statusCode: 400,
			statusMessage: "Bad Request",
			message: "Maximum number of education videos (60) reached",
		});
	}

	const buffer = Buffer.isBuffer(videoFile.data)
		? videoFile.data
		: Buffer.from(videoFile.data ?? []);

	if (!buffer.length) {
		throw createError({
			statusCode: 400,
			statusMessage: "Bad Request",
			message: "Uploaded file is empty",
		});
	}

	const originalExtension = extname(videoFile.filename ?? "");
	const extension =
		originalExtension ||
		resolveExtensionFromMimeType(videoFile.type) ||
		".mp4";

	const fileName = `${Date.now()}-${randomUUID()}${extension}`;
	const relativePath = `/education-videos/${fileName}`;
	const absolutePath = join(PUBLIC_VIDEO_DIR, fileName);

	await mkdir(PUBLIC_VIDEO_DIR, { recursive: true });
	await writeFile(absolutePath, buffer);

	let durationSeconds: number | undefined;
	try {
		durationSeconds = await extractVideoDurationSeconds(buffer, videoFile.type);
	} catch (error) {
		console.error("Failed to extract video duration during upload", {
			error,
		});
	}

	const video = await ModelEducationVideo.create({
		title,
		description,
		order: nextOrder,
		url: relativePath,
		unlockDate,
		durationSeconds,
	});

	const config = useRuntimeConfig();
	const requestUrl = getRequestURL(event, {
		xForwardedHost: true,
		xForwardedProto: true,
	});
	const assetBaseUrl =
		config.public?.assetBaseUrl || config.appUrl || requestUrl.origin;
	const unlockDateValue = video.unlockDate ?? null;

	return {
		id: video._id.toString(),
		title: video.title,
		description: video.description ?? undefined,
		url: resolveStaticAssetUrl(video.url, assetBaseUrl),
		order: video.order,
		durationSeconds: video.durationSeconds ?? undefined,
		unlock_date: unlockDateValue,
		available: !unlockDateValue || unlockDateValue <= new Date(),
		viewed: false,
		viewed_at: null,
	};
});
