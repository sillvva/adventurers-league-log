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
    data: zResult.success ? zResult.data : ({} as T),
    errors: !zResult.success
      ? zResult.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).reduce((acc, v) => (acc.includes(v) ? acc : [...acc, v]), [] as string[])
      : []
  };
};

export const concatenate = (...str: (string | boolean | null | undefined)[]) => {
  return str.filter(s => !!s && typeof s == "string").join(" ");
};

export const parseError = (e: unknown) => {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (typeof e === "object") return JSON.stringify(e);
  return "Unknown error";
};

export const formatDate = (date: Date) => {
  const dateString = date.toISOString().split("T")[0];
  const timeString = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${dateString}T${timeString}`;
};

export const slugify = (text: string) => {
  return text
    .toString()
    .normalize("NFD") // split an accented letter in the base letter and the acent
    .replace(/[\u0300-\u036f]/g, "") // remove all previously split accents
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

export const tooltipClasses = (text?: string | null, align = "center") => {
  if (!text) return "";
  return concatenate(
    "before:hidden before:lg:block before:max-h-[50vh] before:overflow-hidden before:text-ellipsis",
    "before:z-20 before:whitespace-normal before:![content:attr(data-tip)]",
    align == "left" && "before:left-0 before:translate-x-0",
    align == "right" && "before:right-0 before:translate-x-0",
    text?.trim() && "tooltip"
  );
};
