import { Schema } from "mongoose";

const userSchema = new Schema(
	{
		id: Number,
		firstName: String,
		lastName: String,
		username: String,
		photoUrl: String,
		authDate: Number,
		hash: String,
		role: String,
		permissions: { type: [String], default: [] },
		featureFlags: { type: [String], default: [] },
		privateKey: { type: String, select: false },
		address: String,
		educationStartDate: Date,
		meta: {
			type: Map,
			of: Schema.Types.Mixed,
		},
	},
	{ timestamps: true },
);

export default userSchema;
