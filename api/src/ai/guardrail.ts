export interface GroundingResult { grounded: boolean; offending: string[] }

export function collectNumbers(obj: unknown): number[] {
  const nums = new Set<number>();
  function traverse(o: unknown) {
    if (typeof o === 'number') {
      nums.add(o);
    } else if (typeof o === 'string') {
      const trimmed = o.trim();
      if (trimmed !== '') {
        const parsed = Number(trimmed);
        if (!isNaN(parsed)) {
          nums.add(parsed);
        }
      }
    } else if (Array.isArray(o)) {
      o.forEach(traverse);
    } else if (o !== null && typeof o === 'object') {
      Object.values(o).forEach(traverse);
    }
  }
  traverse(obj);
  return Array.from(nums);
}

export function checkGrounding(output: string, allowedNumbers: number[]): GroundingResult {
  // 1. Strip list ordinals (e.g., "1. ", "2. ")
  const text = output.replace(/(^|\s)\d+\.\s/g, ' ');

  // 2. Extract numbers
  const regex = /-?\d{1,3}(?:,\d{3})+(?:\.\d+)?%?|-?\d+(?:\.\d+)?%?/g;
  const matches = text.match(regex) || [];

  const offending: string[] = [];

  for (const match of matches) {
    if (/^(19|20)\d{2}$/.test(match)) continue; // ignore years

    const cleanMatch = match.replace(/,/g, '').replace(/%/g, '');
    const val = parseFloat(cleanMatch);
    if (isNaN(val)) continue;

    const isAllowed = allowedNumbers.some(a => Math.abs(a - val) < 0.001);

    if (!isAllowed) {
      offending.push(match);
    }
  }

  return {
    grounded: offending.length === 0,
    offending: Array.from(new Set(offending))
  };
}
