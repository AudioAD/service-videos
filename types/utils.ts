export type ArrayType<T extends readonly unknown[]> =
	T extends readonly (infer I)[] ? I : never;

export type KeyByType<T, K extends T[keyof T]> = keyof T extends infer P
	? P extends keyof T
		? T[P] extends K
			? P
			: never
		: never
	: never;
