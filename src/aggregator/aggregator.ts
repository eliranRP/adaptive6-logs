import type { EnrichedLogEntry, Dimension, DimensionResult, FrequencyEntry } from '../types';

export function aggregate(
  entries: EnrichedLogEntry[],
  dimensions: readonly Dimension[]
): DimensionResult[] {
  const total = entries.length;
  if (total === 0) return dimensions.map((d) => ({ label: d.label, entries: [] }));

  return dimensions.map((dim): DimensionResult => {
    const counts = new Map<string, number>();

    for (const entry of entries) {
      const value = dim.extract(entry);
      if (value === null) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

    const frequencyEntries: FrequencyEntry[] = sorted.map(([value, count]) => ({
      value,
      count,
      percentage: parseFloat(((count / total) * 100).toFixed(2)),
    }));

    return { label: dim.label, entries: frequencyEntries };
  });
}
