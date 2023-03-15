export interface IGeoJsonPoint {
  type: 'Point';
  /**
   * O array deve ser preenchido com a longitude e latitude, nessa ordem.
   *
   * Exemplo:
   *  coordinates: [longitude, latitude]
   *  coordinates: [-49.2942842, -16.7502147]
   */
  coordinates: [number, number];
}
