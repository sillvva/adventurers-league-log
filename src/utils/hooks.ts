import { useRouter } from "next/router";
import { ZodSchema } from "zod";
import { qsParse } from "./misc";

export function useQueryString<T>(schema: ZodSchema<T>) {
  const router = useRouter();
  return qsParse(router.query, schema);
}