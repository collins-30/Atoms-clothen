// Json columns come back from Prisma as `unknown`. These make sure we only
// pass on the shapes we expect.
export const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

export const colorList = (v: unknown): { name: string; hex: string }[] =>
  Array.isArray(v)
    ? v.flatMap((c) =>
        c && typeof c === "object" && typeof (c as { name?: unknown }).name === "string"
          ? [{ name: (c as { name: string }).name, hex: String((c as { hex?: unknown }).hex ?? "#cccccc") }]
          : [],
      )
    : [];
