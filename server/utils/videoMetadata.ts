import { parseBuffer } from "music-metadata";

export const extractVideoDurationSeconds = async (
	buffer: Buffer,
	mimeType?: string,
) => {
	const metadata = await parseBuffer(
		buffer,
		mimeType
			? {
					mimeType,
					size: buffer.length,
				}
			: undefined,
		{ duration: true },
	);

	const duration = metadata.format.duration;
	if (!duration || Number.isNaN(duration)) {
		return undefined;
	}

	return Math.round(duration);
};
