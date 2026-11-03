/** "1 producto" / "3 productos": cuenta con su palabra en singular o plural. */
export const pluralize = (count: number, singular: string, plural: string): string =>
  `${count} ${count === 1 ? singular : plural}`;
