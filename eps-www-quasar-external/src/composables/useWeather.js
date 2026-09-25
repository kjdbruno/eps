import { ref, computed, onMounted } from 'vue';

const weatherCodes = {
    0: { label: 'Clear sky', icon: 'bi-sun' },
    1: { label: 'Mainly clear', icon: 'bi-brightness-high' },
    2: { label: 'Partly cloudy', icon: 'bi-cloud-sun' },
    3: { label: 'Overcast', icon: 'bi-clouds' },
    45: { label: 'Foggy', icon: 'bi-cloud-fog2' },
    48: { label: 'Foggy', icon: 'bi-cloud-fog2' },
    51: { label: 'Light drizzle', icon: 'bi-cloud-drizzle' },
    53: { label: 'Drizzle', icon: 'bi-cloud-drizzle' },
    55: { label: 'Dense drizzle', icon: 'bi-cloud-drizzle' },
    61: { label: 'Light rain', icon: 'bi-cloud-rain' },
    63: { label: 'Rain', icon: 'bi-cloud-rain-heavy' },
    65: { label: 'Heavy rain', icon: 'bi-cloud-rain-heavy' },
    71: { label: 'Light snow', icon: 'bi-cloud-snow' },
    73: { label: 'Snow', icon: 'bi-cloud-snow' },
    75: { label: 'Heavy snow', icon: 'bi-cloud-snow' },
    80: { label: 'Rain showers', icon: 'bi-cloud-rain' },
    81: { label: 'Rain showers', icon: 'bi-cloud-rain-heavy' },
    82: { label: 'Violent rain showers', icon: 'bi-cloud-rain-heavy' },
    95: { label: 'Thunderstorm', icon: 'bi-cloud-lightning' },
    96: { label: 'Thunderstorm with hail', icon: 'bi-cloud-lightning-rain' },
    99: { label: 'Thunderstorm with hail', icon: 'bi-cloud-lightning-rain' },
};

// Geolocation + Open-Meteo current weather, shared by IndexPage (guest) and HomePage
// (authenticated) so both show the identical weather card. Auto-loads on mount.
export function useWeather() {
    const geoStatus = ref('idle'); // idle | loading | ready | error
    const geoError = ref('');
    const weather = ref(null);
    const locationName = ref('');

    const weatherInfo = computed(() => weatherCodes[weather.value?.weathercode] || { label: 'Unknown', icon: 'bi-cloud' });

    const loadWeather = () => {
        if (!navigator.geolocation) {
            geoStatus.value = 'error';
            geoError.value = 'Geolocation is not supported by this browser.';
            return;
        }
        geoStatus.value = 'loading';
        geoError.value = '';
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const [weatherRes, geoRes] = await Promise.all([
                        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`),
                        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`),
                    ]);
                    const weatherData = await weatherRes.json();
                    weather.value = weatherData.current_weather;

                    if (geoRes.ok) {
                        const geoData = await geoRes.json();
                        const addr = geoData.address || {};
                        locationName.value = [
                            addr.city || addr.town || addr.municipality || addr.village,
                            addr.state,
                        ].filter(Boolean).join(', ') || geoData.display_name || '';
                    }
                    geoStatus.value = 'ready';
                } catch (e) {
                    console.error(e);
                    geoStatus.value = 'error';
                    geoError.value = 'Unable to load weather right now.';
                }
            },
            (err) => {
                geoStatus.value = 'error';
                geoError.value = err.code === err.PERMISSION_DENIED
                    ? 'Location access was denied.'
                    : 'Unable to determine your location.';
            },
            { timeout: 10000 }
        );
    };

    onMounted(loadWeather);

    return { geoStatus, geoError, weather, locationName, weatherInfo, loadWeather };
}
