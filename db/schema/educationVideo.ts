import { Schema } from "mongoose";

const educationVideoSchema = new Schema(
	{
		order: {
			type: Number,
			required: true,
			min: 1,
			max: 60,
			unique: true,
		},
		title: {
			type: String,
			required: true,
			trim: true,
		},
		description: {
			type: String,
		},
		url: {
			type: String,
			required: true,
		},
		unlockDate: {
			type: Date,
			default: null,
		},
		unlockDaysOffset: {
			type: Number,
			min: 0,
			default: null,
		},
		durationSeconds: {
			type: Number,
			min: 0,
		},
	},
	{ timestamps: true, collection: "education_videos" },
);

educationVideoSchema.index({ order: 1 }, { unique: true });

export default educationVideoSchema;
