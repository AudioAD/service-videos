import { addDays } from "date-fns";
import type { HydratedDocument, InferSchemaType } from "mongoose";

type UserDocument = HydratedDocument<InferSchemaType<typeof schemaUser>>;
type EducationVideoSchema = InferSchemaType<typeof schemaEducationVideo>;

export const resolveEducationStartDate = (user?: UserDocument | null) => {
	if (!user) {
		return undefined;
	}

	if (user.educationStartDate) {
		return new Date(user.educationStartDate);
	}

	const metaStartDate = user.meta?.get?.("educationStartDate");
	if (metaStartDate) {
		const parsedDate = new Date(metaStartDate);
		if (!Number.isNaN(parsedDate.getTime())) {
			return parsedDate;
		}
	}

	return user.createdAt ?? undefined;
};

export const resolveVideoUnlockDate = (
	video: Pick<
		EducationVideoSchema,
		"unlockDate" | "unlockDaysOffset" | "order"
	>,
	baseStartDate?: Date,
) => {
	if (video.unlockDate) {
		return new Date(video.unlockDate);
	}

	if (!baseStartDate) {
		return null;
	}

	const offset = video.unlockDaysOffset ?? Math.max(0, video.order - 1);
	return addDays(baseStartDate, offset);
};
