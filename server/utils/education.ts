import { addDays } from "date-fns";
import type { HydratedDocument, InferSchemaType } from "mongoose";

import resolveStartDate from "./resolveStartDate";

type UserDocument = HydratedDocument<InferSchemaType<typeof schemaUser>>;
type EducationVideoSchema = InferSchemaType<typeof schemaEducationVideo>;

const PROGRAM_TIMEZONE = "Etc/UTC";

const getMetaValue = (user: UserDocument, key: string) => {
	const meta = user.meta as
		| Map<string, unknown>
		| Record<string, unknown>
		| undefined;

	if (!meta) {
		return undefined;
	}

	if (typeof (meta as Map<string, unknown>).get === "function") {
		return (meta as Map<string, unknown>).get(key);
	}

	return (meta as Record<string, unknown>)[key];
};

const parseDateValue = (value: unknown) => {
	if (!value) {
		return undefined;
	}

	if (value instanceof Date) {
		return new Date(value);
	}

	const parsed = new Date(String(value));
	return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const ensureProgramStart = (value?: Date) => {
	if (!value) {
		return undefined;
	}

	return resolveStartDate(value, PROGRAM_TIMEZONE, true);
};

export const resolveEducationStartDate = (user?: UserDocument | null) => {
	if (!user) {
		return undefined;
	}

	const metaProgramStart = parseDateValue(getMetaValue(user, "programStart"));
	const programStartDate = ensureProgramStart(metaProgramStart);
	if (programStartDate) {
		return programStartDate;
	}

	if (user.educationStartDate) {
		return ensureProgramStart(new Date(user.educationStartDate));
	}

	const metaEducationStart = parseDateValue(
		getMetaValue(user, "educationStartDate"),
	);
	const educationStartDate = ensureProgramStart(metaEducationStart);
	if (educationStartDate) {
		return educationStartDate;
	}

	return ensureProgramStart(
		user.createdAt ? new Date(user.createdAt) : undefined,
	);
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
