export const thinTicks = (categories: string[]) => {
  const step = Math.ceil(categories.length / 12);
  return categories.filter((_, i) => i % step === 0);
};
