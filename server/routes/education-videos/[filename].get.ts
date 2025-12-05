import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import {
	getRequestHeader,
	getRouterParams,
	sendStream,
	setResponseHeader,
	setResponseStatus,
} from "h3";
import { basename, join } from "pathe";
import { z } from "zod";
import { resolveMimeTypeFromUrl } from "~/utils/staticAssets";
import zodValidateData from "~/utils/zodValidateData";

const PUBLIC_VIDEO_DIR = join(process.cwd(), "public", "education-videos");

const paramsSchema = z.object({
	filename: z
		.string()
		.min(1, "Filename is required")
		.transform((value) => {
			const normalized = basename(value);
			if (normalized.includes("..")) {
				throw new z.ZodError([
					{
						code: z.ZodIssueCode.custom,
						message: "Invalid file name",
						path: ["filename"],
					},
				]);
			}
			return normalized;
		}),
});

export default defineEventHandler(async (event) => {
	const { filename: fileName } = await zodValidateData(
		getRouterParams(event),
		paramsSchema.parse,
	);

	const filePath = join(PUBLIC_VIDEO_DIR, fileName);
	console.info("[education-videos] Incoming request", {
		fileName,
		filePath,
		method: event.method,
		range: getRequestHeader(event, "range") || null,
	});

	let stats: Awaited<ReturnType<typeof stat>>;
	try {
		stats = await stat(filePath);
	} catch (error) {
		console.error("[education-videos] File stat failed", {
			fileName,
			filePath,
			error,
		});
		throw createError({
			statusCode: 404,
			statusMessage: "Not Found",
			message: "Video not found",
			cause: error,
		});
	}

	const mimeType =
		resolveMimeTypeFromUrl(fileName) ?? "application/octet-stream";
	const rangeHeader = getRequestHeader(event, "range");
	const method = event.method?.toUpperCase();

	setResponseHeader(event, "Accept-Ranges", "bytes");

	if (rangeHeader?.startsWith("bytes=")) {
		const [startToken, endToken] = rangeHeader.replace("bytes=", "").split("-");
		let start = Number.parseInt(startToken || "0", 10);
		let end = Number.parseInt(endToken || "", 10);

		if (Number.isNaN(start) || start < 0) {
			start = 0;
		}

		if (Number.isNaN(end) || end >= stats.size) {
			end = stats.size - 1;
		}

		if (start > end) {
			start = 0;
			end = stats.size - 1;
		}

		const chunkSize = end - start + 1;

		setResponseStatus(event, 206, "Partial Content");
		setResponseHeader(
			event,
			"Content-Range",
			`bytes ${start}-${end}/${stats.size}`,
		);
		setResponseHeader(event, "Content-Length", chunkSize);
		setResponseHeader(event, "Content-Type", mimeType);

		if (method === "HEAD") {
			return null;
		}

		console.info("[education-videos] Streaming partial content", {
			fileName,
			start,
			end,
			size: stats.size,
		});
		const stream = createReadStream(filePath, { start, end });
		return sendStream(event, stream);
	}

	setResponseHeader(event, "Content-Length", stats.size);
	setResponseHeader(event, "Content-Type", mimeType);

	if (method === "HEAD") {
		return null;
	}

	console.info("[education-videos] Streaming full file", {
		fileName,
		size: stats.size,
	});
	const stream = createReadStream(filePath);
	return sendStream(event, stream);
});
