"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geoJsonPoint = geoJsonPoint;
function geoJsonPoint(longitude, latitude) {
    return { type: 'Point', coordinates: [longitude, latitude] };
}
//# sourceMappingURL=geo-json-point.js.map