import type { Dimension } from '../types';

export const browserDimension: Dimension = {
  label: 'Browser',
  extract: (entry) => entry.browser || null,
};
