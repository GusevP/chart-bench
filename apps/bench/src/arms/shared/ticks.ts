export const thinTicks = <T>(categories: T[]) => {
  const step = Math.ceil(categories.length / 12);
  return categories.filter((_, i) => i % step === 0);
};
