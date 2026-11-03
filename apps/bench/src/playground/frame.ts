export const framePeriod = () =>
  new Promise<number>(resolve => {
    const gaps: number[] = [];
    let last = 0;
    const tick = (now: number) => {
      if (last) gaps.push(now - last);
      last = now;
      if (gaps.length < 30) requestAnimationFrame(tick);
      else resolve(gaps.sort((a, b) => a - b)[gaps.length >> 1]!);
    };
    requestAnimationFrame(tick);
  });
