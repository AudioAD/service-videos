import { extname } from "pathe";
import { normalizeKey } from "unstorage";

const EXTERNAL_URL_REGEXP = /^https?:\/\//i;

const toStorageKey = (relativePath: string) =>
	normalizeKey(relativePath.replace(/^\/+/, ""));

export const resolveStaticAssetUrl = (rawUrl: string, baseOrigin: string) => {
	if (!rawUrl) {
		return "";
	}

	if (EXTERNAL_URL_REGEXP.test(rawUrl)) {
		return rawUrl;
	}

	const normalized = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
	return new URL(normalized, baseOrigin).toString();
};

export const fetchPublicAssetBuffer = async (rawUrl?: string | null) => {
	if (!rawUrl || EXTERNAL_URL_REGEXP.test(rawUrl)) {
		return null;
	}

	const storage = useStorage("assets");
	const key = toStorageKey(rawUrl).replace(/\//g, ":");

	try {
		const buffer = await storage.getItemRaw(key);
		if (!buffer) {
			return null;
		}

		if (Buffer.isBuffer(buffer)) {
			return buffer;
		}

		return Buffer.from(buffer);
	} catch (error) {
		console.error("Failed to read static asset", {
			rawUrl,
			key,
			error,
		});
		return null;
	}
};

const mimeTypesByExtension: Record<string, string> = {
	".mp4": "video/mp4",
	".m4v": "video/x-m4v",
	".mov": "video/quicktime",
	".webm": "video/webm",
	".mkv": "video/x-matroska",
};

const extensionByMimeType = Object.fromEntries(
	Object.entries(mimeTypesByExtension).map(([ext, mime]) => [mime, ext]),
);

export const resolveMimeTypeFromUrl = (rawUrl?: string | null) => {
	if (!rawUrl) {
		return undefined;
	}

	const extension = extname(rawUrl).toLowerCase();
	return mimeTypesByExtension[extension];
};

export const resolveExtensionFromMimeType = (mimeType?: string | null) => {
	if (!mimeType) {
		return undefined;
	}

	return extensionByMimeType[mimeType.toLowerCase()];
};
