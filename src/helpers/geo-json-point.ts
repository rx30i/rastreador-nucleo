import { IGeoJsonPoint } from '../contracts';

export function geoJsonPoint (longitude: number, latitude: number): IGeoJsonPoint {
  return { type: 'Point', coordinates: [ longitude, latitude ] };
}
