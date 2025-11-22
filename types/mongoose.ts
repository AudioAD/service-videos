import type { InferSchemaType, Types } from "mongoose";

type MapConversion<T> = T extends Map<infer K, infer V>
	? K extends string | number | symbol
		? Record<K, V>
		: never
	: never;

type Conversions<T> = [MapConversion<T>];

type Convert<T, TRest = Conversions<T>> = TRest extends [
	infer Head,
	...infer Tail,
]
	? [Head] extends [never]
		? Convert<T, Tail>
		: Head
	: T;

type IgnoreTypes = Date | (typeof Types)[keyof typeof Types];

type ProcessArray<T extends unknown[]> = T extends [infer Head, ...infer Tail]
	? Tail extends []
		? [ProcessObject<Head>]
		: [ProcessObject<Head>, ...ProcessArray<Tail>]
	: T extends Types.DocumentArray<infer DI>
		? (ProcessObject<DI> & { _id: Types.ObjectId })[]
		: T extends Array<infer I>
			? ProcessObject<I>[]
			: never;

type ProcessObject<T> = Convert<T> extends infer C
	? C extends unknown[]
		? ProcessArray<C>
		: C extends IgnoreTypes
			? C
			: C extends object
				? { [K in keyof C]: ProcessObject<C[K]> }
				: C
	: never;

export type InferAggregateFromSchema<T> = ProcessObject<InferSchemaType<T>> & {
	_id: Types.ObjectId;
};
