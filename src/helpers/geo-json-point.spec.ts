/* eslint-disable max-len */
import { geoJsonPoint } from './geo-json-point';

describe('Função geoJsonPoint()', () => {
  it('Recebe a latitude "-16.661423" e longitude "-49.310012" e deve retornar {type: "Point", coordinates: [-49.310012, -16.661423]}', () => {
    const resposta = geoJsonPoint(-49.310012, -16.661423);
    expect(resposta).toEqual({ type: 'Point', coordinates: [-49.310012, -16.661423] });
  });
});
