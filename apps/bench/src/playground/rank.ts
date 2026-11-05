export type Rank = 'best' | 'worst';

export function rankBy(values: (number | undefined)[], margin = 0) {
  const known = values.filter(value => value !== undefined);
  const low = Math.min(...known);
  const high = Math.max(...known);
  return (value: number | undefined): Rank | undefined => {
    if (known.length < 2 || high - low <= margin) return undefined;
    return value === low ? 'best' : value === high ? 'worst' : undefined;
  };
}
