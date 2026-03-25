import type { Dimension } from '../types';

export const osDimension: Dimension = {
  label: 'OS',
  extract: (entry) => entry.os || null,
};
