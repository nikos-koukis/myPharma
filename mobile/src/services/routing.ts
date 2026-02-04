
interface OSRMResponse {
    routes: {
        geometry: {
            coordinates: [number, number][];
            type: string;
        };
    }[];
}

export async function getRoute(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
): Promise<{ latitude: number; longitude: number }[]> {
    try {
        // Using OSM.de OSRM instance which has a better 'foot' profile for residential areas
        const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&alternatives=false`;

        const response = await fetch(url);
        const data = (await response.json()) as OSRMResponse;

        if (!data.routes || data.routes.length === 0) {
            return [];
        }

        // Convert GeoJSON [lon, lat] to { latitude, longitude }
        return data.routes[0].geometry.coordinates.map(([lon, lat]) => ({
            latitude: lat,
            longitude: lon,
        }));
    } catch (error) {
        console.warn('Error fetching route:', error);
        return [];
    }
}
