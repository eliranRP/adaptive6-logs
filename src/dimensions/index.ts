import { countryDimension } from './countryDimension';
import { osDimension }      from './osDimension';
import { browserDimension } from './browserDimension';
import type { Dimension }   from '../types';

export const DIMENSIONS: readonly Dimension[] = [
  countryDimension,
  osDimension,
  browserDimension,
];
