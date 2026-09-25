<template>
    <div class="lm-wrap">
        <div ref="mapEl" class="lm-map" :style="{ height }"></div>
        <div v-if="!markers.length" class="lm-empty text-caption text-grey">
            {{ emptyText }}
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Vite (like webpack before it) breaks Leaflet's own default-icon path resolution — it resolves
// relative to the CSS file, which doesn't survive bundling. Re-point it at the actual bundled
// asset URLs instead; the standard fix, done once per app (module-level, not per-instance).
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// One component for both the overview's multi-pin map and the detail modal's single-pin map —
// just a different-length `markers` array either way.
const props = defineProps({
    markers: { type: Array, default: () => [] }, // [{ id, lat, lng, title, subtitle }]
    height: { type: String, default: '280px' },
    zoom: { type: Number, default: 15 },
    emptyText: { type: String, default: 'No location on file.' },
});

// San Fernando City, La Union — same fallback center used when there's nothing to plot yet, so
// an empty map still opens on the city instead of the middle of the ocean (0,0).
const FALLBACK_CENTER = [16.6159, 120.3209];

const mapEl = ref(null);
let map = null;
let markerLayer = null;

const render = () => {
    if (!map) return;
    markerLayer.clearLayers();
    const points = props.markers.filter(m => m.lat != null && m.lng != null);
    points.forEach(m => {
        const marker = L.marker([m.lat, m.lng]);
        if (m.title || m.subtitle) {
            const title = m.title ? `<b>${m.title}</b>` : '';
            const subtitle = m.subtitle ? `<div>${m.subtitle}</div>` : '';
            marker.bindPopup(`${title}${subtitle}`);
        }
        marker.addTo(markerLayer);
    });

    if (points.length === 1) {
        map.setView([points[0].lat, points[0].lng], props.zoom);
    } else if (points.length > 1) {
        map.fitBounds(markerLayer.getBounds().pad(0.15));
    } else {
        map.setView(FALLBACK_CENTER, 12);
    }
};

onMounted(async () => {
    await nextTick();
    map = L.map(mapEl.value, { scrollWheelZoom: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    // featureGroup (not plain layerGroup) — it's the one that implements getBounds(), needed
    // below to fit the map to every pin when there's more than one.
    markerLayer = L.featureGroup().addTo(map);
    render();
});

onBeforeUnmount(() => {
    if (map) { map.remove(); map = null; }
});

// A dialog that's hidden (v-if/v-show) when its markers first arrive mounts the map into a
// zero-size container — Leaflet needs invalidateSize() once it's actually visible, or tiles
// render into the wrong bounding box. Cheap enough to just call on every markers change.
watch(() => props.markers, async () => {
    await nextTick();
    if (map) map.invalidateSize();
    render();
}, { deep: true });
</script>

<style scoped>
.lm-map {
    width: 100%;
    border-radius: 8px;
    overflow: hidden;
    z-index: 0; /* Leaflet's own panes use z-index too — keep the whole map under any app overlay (dialogs, menus). */
}
.lm-empty {
    text-align: center;
    padding: 8px 0 0;
}
</style>
