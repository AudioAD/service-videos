import { Types } from "mongoose";
import { z } from "zod";

const objectIdTransform = (
	value: ConstructorParameters<typeof Types.ObjectId>[0],
	ctx: z.RefinementCtx,
) => {
	try {
		return new Types.ObjectId(value);
	} catch (error: unknown) {
		ctx.addIssue({
			code: "custom",
			message: (error as Error).message,
		});
		return z.NEVER;
	}
};

export default objectIdTransform;
