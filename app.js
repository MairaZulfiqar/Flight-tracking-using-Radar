// Finland Bounding Box Constraints
const FINLAND_BOUNDS = {
    lamin: 59.8,
    lomin: 20.6,
    lamax: 70.1,
    lomax: 31.6
};

// Initialize Leaflet Map
const map = L.map('map', {
    zoomControl: false,
    attributionControl: false
}).setView([64.95, 26.1], 5); // Centered over Finland

// Add clean base map layer
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
}).addTo(map);

// Position zoom controls
L.control.zoom({ position: 'bottomleft' }).addTo(map);

// Application State
let markers = {}; // Maps ICAO24 -> Leaflet Marker
let activeFlight = null;

// DOM Elements
const sidebar = document.getElementById('sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');
const loadingIndicator = document.getElementById('loading-indicator');

// SVG Plane Marker generation
const getPlaneIcon = (heading) => {
    // The SVG path points 'up', so we subtract 45 degrees to match true_track for our particular icon rotation
    return L.divIcon({
        className: 'plane-icon',
        html: `
            <div style="transform: rotate(${heading - 45}deg);">
                <svg class="plane-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 16v-2l-8-5V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
            </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
    });
};

// F// Fetch real-time flight data
const fetchFlights = async () => {
    try {
        // Fetch from our local Python proxy to bypass CORS
        const url = `/api/flights`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error('Failed to fetch from ADSB API');
        
        const data = await response.json();
        const states = data.ac || []; // ADSB.lol data array is stored under 'ac'
        
        updateMap(states);
        
        loadingIndicator.innerText = `Tracking ${states.length} active flights`;
        loadingIndicator.style.color = "#94a3b8"; // Reset error color if it was red
    } catch (error) {
        console.error("Flight fetching error:", error);
        loadingIndicator.innerText = "Connection lost";
        loadingIndicator.style.color = "#ef4444";
    }
};

// Update map with new flight coordinates
const updateMap = (states) => {
    const currentIcaos = new Set();
    
    states.forEach(flight => {
        const icao24 = flight.hex;
        const callsign = flight.flight ? flight.flight.trim() : 'UNKNOWN';
        const latitude = flight.lat;
        const longitude = flight.lon;
        const heading = flight.track || 0;
        
        // Skip invalid coordinates
        if (!longitude || !latitude) return;
        
        currentIcaos.add(icao24);
        
        if (markers[icao24]) {
            // Update exist marker
            markers[icao24].setLatLng([latitude, longitude]);
            markers[icao24].setIcon(getPlaneIcon(heading));
            markers[icao24].flightData = flight;
            
            // Live update sidebar if this flight is selected
            if (activeFlight === icao24) {
                updateSidebar(flight);
            }
        } else {
            // Create new marker
            const marker = L.marker([latitude, longitude], {
                icon: getPlaneIcon(heading)
            }).addTo(map);
            
            marker.flightData = flight;
            marker.on('click', () => handleMarkerClick(icao24, flight));
            markers[icao24] = marker;
        }
    });
    
    // Purge markers that are no longer in the airspace
    Object.keys(markers).forEach(icao => {
        if (!currentIcaos.has(icao)) {
            map.removeLayer(markers[icao]);
            delete markers[icao];
            
            // If the selected flight left the airspace, hide the sidebar
            if (activeFlight === icao) {
                closeSidebar();
            }
        }
    });
};

// Handle selecting a flight
const handleMarkerClick = (icao24, flightData) => {
    activeFlight = icao24;
    updateSidebar(flightData);
    sidebar.classList.remove('hidden');
    
    // Smoothly pan camera to plane
    map.flyTo([flightData.lat, flightData.lon], 7, {
        animate: true,
        duration: 0.8
    });
};

// Populate sidebar with flight data
const updateSidebar = (flight) => {
    const callsign = flight.flight ? flight.flight.trim() : 'UNKNOWN';
    const origin_country = flight.r || 'Unknown'; // registration code indicates origin/aircraft
    
    // Check ground state vs altitude
    const isGround = flight.alt_baro === 'ground';
    const baro_altitude = isGround ? 0 : (flight.alt_baro ? flight.alt_baro * 0.3048 : null);
    
    // Ground speed in knots -> Convert to km/h
    const velocity = flight.gs ? flight.gs * 1.852 : null;
    const true_track = flight.track;

    document.getElementById('flight-callsign').innerText = callsign;
    document.getElementById('flight-origin').innerText = origin_country;
    
    if (isGround) {
         document.getElementById('flight-altitude').innerText = 'On Ground';
    } else {
         document.getElementById('flight-altitude').innerText = baro_altitude !== null ? `${Math.round(baro_altitude)} m` : 'N/A';
    }
    
    document.getElementById('flight-velocity').innerText = velocity !== null ? `${Math.round(velocity)} km/h` : 'N/A';
    document.getElementById('flight-heading').innerText = true_track !== undefined ? `${Math.round(true_track)}°` : 'N/A';
};

// Event hook to close sidebar
const closeSidebar = () => {
    activeFlight = null;
    sidebar.classList.add('hidden');
};

closeSidebarBtn.addEventListener('click', closeSidebar);

// Close sidebar when clicking map
map.on('click', () => {
    if (activeFlight) closeSidebar();
});

// Bootstrap application loop
fetchFlights();

// Poll API every 10 seconds to update positions (ADSB.lol is generous and doesn't rate-limit like OpenSky)
setInterval(fetchFlights, 10000);
