import type { H3Event, InferEventInput, ValidateFunction } from "h3";

const zodValidateBody = async <
	T,
	Event extends H3Event = H3Event,
	_T = InferEventInput<"body", Event, T>,
>(
	event: Event,
	validate: ValidateFunction<_T>,
): Promise<_T> => {
	const _body = await readBody(event, { strict: true });
	return zodValidateData(_body, validate);
};

export default zodValidateBody;
