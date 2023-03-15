"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geoJsonPoint = void 0;
function geoJsonPoint(longitude, latitude) {
    return { type: 'Point', coordinates: [longitude, latitude] };
}
exports.geoJsonPoint = geoJsonPoint;
//# sourceMappingURL=geo-json-point.js.map