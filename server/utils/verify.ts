import jwt from "jsonwebtoken";

const verify = (token: string, secret: string) =>
	new Promise<jwt.JwtPayload>((resolve, reject) => {
		jwt.verify(token, secret, (err, decoded) => {
			if (err) {
				reject(
					createError({
						statusCode: 401,
						statusMessage: "Unauthorized",
						message: `Invalid access token: ${err.message}`,
					}),
				);
			}
			resolve(decoded as jwt.JwtPayload);
		});
	});

export default verify;
