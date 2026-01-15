const SPECIAL_CHARACTER_REGEX = /[\u0600-\u06FF\p{L}\p{N}]+/gu;

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .match(SPECIAL_CHARACTER_REGEX)
    ?.join("-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "") ?? "";
