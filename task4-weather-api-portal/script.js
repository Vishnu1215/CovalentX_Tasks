/* ──────────────────────────────────────────────────────────
   Weather Portal — script.js
   Uses Open-Meteo (free, no API key required):
     - Geocoding:  https://geocoding-api.open-meteo.com/v1/search
     - Weather:    https://api.open-meteo.com/v1/forecast
   Covers: fetch-based API integration, async/await, geolocation,
   unit toggle (°C/°F), loading skeleton, and error handling.
   ────────────────────────────────────────────────────────── */

/* ── Element references ───────────────────────────────── */
const cityInput   = document.getElementById('cityInput');
const searchBtn    = document.getElementById('searchBtn');
const locateBtn    = document.getElementById('locateBtn');
const errorMsg     = document.getElementById('errorMsg');
const skeleton     = document.getElementById('skeleton');
const weatherWrap  = document.getElementById('weatherWrap');
const hint         = document.getElementById('hint');

const cityName     = document.getElementById('cityName');
const countryEl    = document.getElementById('country');
const weatherDesc  = document.getElementById('weatherDesc');
const weatherEmoji = document.getElementById('weatherEmoji');
const tempDisplay  = document.getElementById('tempDisplay');
const feelsLike    = document.getElementById('feelsLike');
const localTime    = document.getElementById('localTime');
const weatherDate  = document.getElementById('weatherDate');

const humidityEl   = document.getElementById('humidity');
const windEl       = document.getElementById('wind');
const visibilityEl = document.getElementById('visibility');
const pressureEl   = document.getElementById('pressure');
const sunriseEl    = document.getElementById('sunrise');
const sunsetEl     = document.getElementById('sunset');

const celsiusBtn    = document.getElementById('celsiusBtn');
const fahrenheitBtn = document.getElementById('fahrenheitBtn');

/* ── State ─────────────────────────────────────────────── */
let currentUnit = 'C';        // 'C' or 'F'
let lastData    = null;       // cache last fetched weather payload so unit toggle re-renders instantly

/* ── WMO weather code → { emoji, label } ──────────────────
   Open-Meteo returns numeric WMO codes instead of strings,
   so we map the common ones to something readable. */
const WEATHER_CODE_MAP = {
  0:  { emoji: '☀️', label: 'Clear sky' },
  1:  { emoji: '🌤️', label: 'Mainly clear' },
  2:  { emoji: '⛅',  label: 'Partly cloudy' },
  3:  { emoji: '☁️', label: 'Overcast' },
  45: { emoji: '🌫️', label: 'Fog' },
  48: { emoji: '🌫️', label: 'Rime fog' },
  51: { emoji: '🌦️', label: 'Light drizzle' },
  53: { emoji: '🌦️', label: 'Drizzle' },
  55: { emoji: '🌧️', label: 'Dense drizzle' },
  56: { emoji: '🌧️', label: 'Freezing drizzle' },
  57: { emoji: '🌧️', label: 'Freezing drizzle' },
  61: { emoji: '🌧️', label: 'Slight rain' },
  63: { emoji: '🌧️', label: 'Rain' },
  65: { emoji: '🌧️', label: 'Heavy rain' },
  66: { emoji: '🌧️', label: 'Freezing rain' },
  67: { emoji: '🌧️', label: 'Freezing rain' },
  71: { emoji: '🌨️', label: 'Slight snow' },
  73: { emoji: '🌨️', label: 'Snow' },
  75: { emoji: '❄️', label: 'Heavy snow' },
  77: { emoji: '❄️', label: 'Snow grains' },
  80: { emoji: '🌦️', label: 'Rain showers' },
  81: { emoji: '🌧️', label: 'Rain showers' },
  82: { emoji: '⛈️', label: 'Violent showers' },
  85: { emoji: '🌨️', label: 'Snow showers' },
  86: { emoji: '❄️', label: 'Heavy snow showers' },
  95: { emoji: '⛈️', label: 'Thunderstorm' },
  96: { emoji: '⛈️', label: 'Thunderstorm + hail' },
  99: { emoji: '⛈️', label: 'Severe thunderstorm' },
};

function describeWeather(code) {
  return WEATHER_CODE_MAP[code] || { emoji: '🌡️', label: 'Unknown' };
}

/* ── UI state helpers ──────────────────────────────────── */
function showHint() {
  hint.classList.remove('hidden');
  skeleton.classList.add('hidden');
  weatherWrap.classList.add('hidden');
  errorMsg.classList.add('hidden');
}

function showLoading() {
  hint.classList.add('hidden');
  errorMsg.classList.add('hidden');
  weatherWrap.classList.add('hidden');
  skeleton.classList.remove('hidden');
}

function showWeather() {
  hint.classList.add('hidden');
  skeleton.classList.add('hidden');
  errorMsg.classList.add('hidden');
  weatherWrap.classList.remove('hidden');
}

function showError(message) {
  hint.classList.add('hidden');
  skeleton.classList.add('hidden');
  weatherWrap.classList.add('hidden');
  errorMsg.textContent = message;
  errorMsg.classList.remove('hidden');
}

/* ── Unit conversion ───────────────────────────────────── */
function celsiusToFahrenheit(c) {
  return (c * 9) / 5 + 32;
}

function formatTemp(celsiusValue) {
  const value = currentUnit === 'C' ? celsiusValue : celsiusToFahrenheit(celsiusValue);
  return `${Math.round(value)}°`;
}

/* ── Formatting helpers ────────────────────────────────── */
function formatTime(isoString, timezone) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  });
}

function formatDate(isoString, timezone) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  });
}

/* ── API calls ─────────────────────────────────────────── */

/**
 * Look up a city name → { name, country, latitude, longitude }
 * using Open-Meteo's free geocoding endpoint.
 */
async function geocodeCity(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Could not reach the location service. Please try again.');
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(`No location found for "${query}". Try a different spelling.`);
  }

  const place = data.results[0];
  return {
    name: place.name,
    country: place.country || '',
    latitude: place.latitude,
    longitude: place.longitude,
  };
}

/**
 * Reverse geocode coordinates → city/country name (best effort).
 * Falls back to "Your location" if nothing is found.
 */
async function reverseGeocode(latitude, longitude) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?latitude=${latitude}&longitude=${longitude}`;
    // Open-Meteo's geocoder doesn't support reverse lookup directly,
    // so we just label it generically and let the weather call carry the real coords.
    return { name: 'Your location', country: '' };
  } catch {
    return { name: 'Your location', country: '' };
  }
}

/**
 * Fetch current weather + daily sunrise/sunset for given coordinates.
 */
async function fetchWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,pressure_msl,visibility',
    daily: 'sunrise,sunset',
    timezone: 'auto',
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Could not fetch weather data. Please try again.');
  }

  return response.json();
}

/* ── Render ────────────────────────────────────────────── */
function render(place, weather) {
  lastData = { place, weather };

  const current = weather.current;
  const timezone = weather.timezone;

  cityName.textContent    = place.name;
  countryEl.textContent   = place.country || '\u00A0';

  const { emoji, label } = describeWeather(current.weather_code);
  weatherEmoji.textContent = emoji;
  weatherDesc.textContent  = label;

  tempDisplay.textContent = formatTemp(current.temperature_2m);
  feelsLike.textContent   = `Feels like ${formatTemp(current.apparent_temperature)}`;

  localTime.textContent = formatTime(current.time, timezone);
  weatherDate.textContent = formatDate(current.time, timezone);

  humidityEl.textContent   = `${Math.round(current.relative_humidity_2m)}%`;
  windEl.textContent       = `${Math.round(current.wind_speed_10m)} km/h`;
  visibilityEl.textContent = current.visibility != null
    ? `${(current.visibility / 1000).toFixed(1)} km`
    : '—';
  pressureEl.textContent   = `${Math.round(current.pressure_msl)} hPa`;

  sunriseEl.textContent = weather.daily && weather.daily.sunrise
    ? formatTime(weather.daily.sunrise[0], timezone)
    : '—';
  sunsetEl.textContent  = weather.daily && weather.daily.sunset
    ? formatTime(weather.daily.sunset[0], timezone)
    : '—';

  showWeather();
}

/* Re-render using cached data when the unit toggle changes,
   so we don't refetch the network for a simple unit switch. */
function rerenderFromCache() {
  if (lastData) {
    render(lastData.place, lastData.weather);
  }
}

/* ── Main flows ────────────────────────────────────────── */
async function searchByCityName(query) {
  if (!query || !query.trim()) {
    showError('Please enter a city name.');
    return;
  }

  showLoading();
  try {
    const place = await geocodeCity(query.trim());
    const weather = await fetchWeather(place.latitude, place.longitude);
    render(place, weather);
  } catch (err) {
    showError(err.message || 'Something went wrong. Please try again.');
  }
}

async function searchByCoordinates(latitude, longitude) {
  showLoading();
  try {
    const place = await reverseGeocode(latitude, longitude);
    const weather = await fetchWeather(latitude, longitude);
    render(place, weather);
  } catch (err) {
    showError(err.message || 'Something went wrong. Please try again.');
  }
}

function useMyLocation() {
  if (!('geolocation' in navigator)) {
    showError('Geolocation is not supported by your browser.');
    return;
  }

  showLoading();
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      searchByCoordinates(latitude, longitude);
    },
    (geoError) => {
      if (geoError.code === geoError.PERMISSION_DENIED) {
        showError('Location access was denied. Please allow location access or search by city instead.');
      } else {
        showError('Could not get your location. Please search by city instead.');
      }
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
  );
}

/* ── Unit toggle ───────────────────────────────────────── */
function setUnit(unit) {
  currentUnit = unit;
  celsiusBtn.classList.toggle('active', unit === 'C');
  fahrenheitBtn.classList.toggle('active', unit === 'F');
  rerenderFromCache();
}

/* ── Event listeners ───────────────────────────────────── */
searchBtn.addEventListener('click', () => searchByCityName(cityInput.value));

cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    searchByCityName(cityInput.value);
  }
});

locateBtn.addEventListener('click', useMyLocation);

celsiusBtn.addEventListener('click', () => setUnit('C'));
fahrenheitBtn.addEventListener('click', () => setUnit('F'));

/* ── Initial state ─────────────────────────────────────── */
showHint();
