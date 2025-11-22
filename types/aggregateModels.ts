import { Types } from "mongoose";

export type User = InferAggregateFromSchema<typeof schemaUser>;
export type EducationVideo = InferAggregateFromSchema<
	typeof schemaEducationVideo
>;
export type UserEducationProgress = InferAggregateFromSchema<
	typeof schemaUserEducationProgress
>;

export interface EducationVideoView
	extends Omit<EducationVideo, "_id" | "unlockDate" | "unlockDaysOffset"> {
	id: string;
	unlock_date: Date | null;
	viewed: boolean;
	available: boolean;
	viewed_at: Date | null;
	url: string;
	title: string;
	order: number;
	description?: string;
	durationSeconds?: number;
}
