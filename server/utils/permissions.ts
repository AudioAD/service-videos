import { createError } from "h3";
import type { HydratedDocument, InferSchemaType } from "mongoose";

const ROLE_PERMISSION_MAP = {
	admin: ["can-upload-video", "can-delete-video"],
} as const;

export const VIDEO_PERMISSIONS = {
	upload: "can-upload-video",
	delete: "can-delete-video",
} as const;

type VideoPermission = (typeof VIDEO_PERMISSIONS)[keyof typeof VIDEO_PERMISSIONS];
type UserDocument = HydratedDocument<InferSchemaType<typeof schemaUser>>;

export const userHasPermission = (
	user: UserDocument | null | undefined,
	permission: VideoPermission,
) => {
	if (!user) {
		return false;
	}

	const directPermissions = Array.isArray(user.permissions)
		? user.permissions
		: [];
	const rolePermissions = user.role
		? ROLE_PERMISSION_MAP[user.role as keyof typeof ROLE_PERMISSION_MAP] ?? []
		: [];

	return (
		directPermissions.includes(permission) || rolePermissions.includes(permission)
	);
};

export const assertUserPermission = (
	user: UserDocument | null | undefined,
	permission: VideoPermission,
) => {
	if (userHasPermission(user, permission)) {
		return;
	}

	throw createError({
		statusCode: 403,
		statusMessage: "Forbidden",
		message: "You do not have permission to perform this action",
	});
};
