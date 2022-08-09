import { ZodSchema } from "zod";
import qs from "qs";

const parseObjectPrimitives = (obj: Record<string, any>): any => {
	return Object.fromEntries(
		Object.entries(obj).map(([k, v]) => {
			if (typeof v === "object") return [k, parseObjectPrimitives(v)];
			if (!isNaN(parseFloat(v))) return [k, parseFloat(v)];
			if (v === "true") return [k, true];
			if (v === "false") return [k, false];
			if (typeof v === "string") return [k, v];
			return [k, null];
		})
	);
};

export const qsParse = <T>(queryString: string | Record<string, any>, schema: ZodSchema<T>) => {
	const parsed =
		typeof queryString === "string"
			? qs.parse(queryString, {
					ignoreQueryPrefix: true
			  })
			: queryString;

	const zResult = schema.safeParse(parseObjectPrimitives(parsed));

	return {
		data: zResult.success ? zResult.data : {} as T,
		errors: !zResult.success
			? zResult.error.issues
					.map(i => `${i.path.join(".")}: ${i.message}`)
					.reduce((acc, v) => (acc.includes(v) ? acc : [...acc, v]), [] as string[])
			: []
	};
};

export const concatenate = (...str: (string | boolean | null | undefined)[]) => {
	return str.filter(s => !!s && typeof s == "string").join(" ");
};