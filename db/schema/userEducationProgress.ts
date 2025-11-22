import { Schema, Types } from "mongoose";

const userEducationProgressSchema = new Schema(
	{
		userId: {
			type: String,
			required: true,
			ref: "User",
			index: true,
		},
		videoId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: "EducationVideo",
		},
		viewedAt: {
			type: Date,
			default: () => new Date(),
		},
	},
	{ timestamps: true, collection: "user_education_progress" },
);

userEducationProgressSchema.index(
	{ userId: 1, videoId: 1 },
	{ unique: true },
);

export default userEducationProgressSchema;
