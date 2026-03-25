import type { Dimension } from '../types';

export const countryDimension: Dimension = {
  label: 'Country',
  extract: (entry) => entry.country || null,
};
