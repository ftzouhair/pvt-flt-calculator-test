document.addEventListener('DOMContentLoaded', () => {
    let airports = [];

    // Fetch airport data
    fetch('airports.json')
        .then(response => response.json())
        .then(data => {
            airports = data;
            enableAutocomplete('from', airports);
            enableAutocomplete('to', airports);
        })
        .catch(error => console.error('Error loading airport data:', error));

    // Attach event listener to the button
    document.getElementById('getQuoteBtn').addEventListener('click', getQuote);

    // Set min date for date picker
    const datepicker = document.getElementById('date');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const dd = String(today.getDate()).padStart(2, '0');
    datepicker.min = `${yyyy}-${mm}-${dd}`;

    // Dynamic passenger limits
    const aircraftSelect = document.getElementById('aircraft');
    const paxInput = document.getElementById('pax');

    function updatePaxLimit() {
        const selectedAircraft = aircraftSelect.value;
        const maxPax = PASSENGER_CAPACITY[selectedAircraft];
        paxInput.max = maxPax;
        if (paxInput.value > maxPax) {
            paxInput.value = maxPax;
        }
    }

    aircraftSelect.addEventListener('change', updatePaxLimit);
    updatePaxLimit(); // Initial call
});

const RATES = { Turboprop: 4300, VLJ: 6350, Light: 6950, Midsize: 8400, SuperMidsize: 10850, Large: 13600, Ultra: 17150, VIP: 20800 };
const SPEEDS = { Turboprop: 450, VLJ: 750, Light: 780, Midsize: 830, SuperMidsize: 850, Large: 870, Ultra: 900, VIP: 850 };
const PASSENGER_CAPACITY = { Turboprop: 8, VLJ: 4, Light: 8, Midsize: 9, SuperMidsize: 12, Large: 16, Ultra: 19, VIP: 100 };

function enableAutocomplete(id, airports) {
    const inp = document.getElementById(id);
    const box = document.getElementById(id + '-suggestions');

    inp.addEventListener('input', () => {
        const q = inp.value.trim().toLowerCase();
        box.innerHTML = '';
        if (q.length < 2) return;

        airports.filter(a => 
                a.city.toLowerCase().includes(q) || 
                a.icao.toLowerCase().includes(q) ||
                a.name.toLowerCase().includes(q) ||
                a.IATA.toLowerCase().includes(q)
            )
            .slice(0, 6)
            .forEach(a => {
                const d = document.createElement('div');
                d.className = 'suggestion';
                d.innerHTML = `<strong>${a.IATA}</strong> - ${a.name}, ${a.city}`;
                d.onclick = () => {
                    inp.value = `${a.city} (${a.IATA})`;
                    inp.dataset.lat = a.lat;
                    inp.dataset.lon = a.lon;
                    box.innerHTML = '';
                };
                box.appendChild(d);
            });
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('.suggestions') && e.target !== inp) {
            box.innerHTML = '';
        }
    });
}

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

function getQuote() {
    const from = document.getElementById('from');
    const to = document.getElementById('to');
    const aircraftEl = document.getElementById('aircraft');
    const pax = +document.getElementById('pax').value;
    const date = document.getElementById('date');
    const resultDiv = document.getElementById('result');

    if (!from.dataset.lat || !to.dataset.lat || !date.value) {
        resultDiv.innerHTML = '<span style="color:#c9b037">Please select both airports and a date.</span>';
        return;
    }

    const dist = haversine(+from.dataset.lat, +from.dataset.lon, +to.dataset.lat, +to.dataset.lon);
    const flightTime = (dist / SPEEDS[aircraftEl.value] + 0.5).toFixed(1); // +30 min taxi
    const base = Math.round(flightTime * RATES[aircraftEl.value]);
    const landing = 1000;
    const overnight = flightTime > 3 ? 1500 : 0;
    const segment = pax * 5;
    const tax = Math.round((base + landing + overnight + segment) * 0.075);
    const total = base + landing + overnight + segment + tax;

    resultDiv.innerHTML = `
        <div style="border-top:1px solid #444;padding-top:1rem;">
          <b>Estimated Charter Investment</b><br>
          <span style="color:#c9b037">Route:</span> ${from.value} to ${to.value}<br>
          <span style="color:#c9b037">Aircraft:</span> ${aircraftEl.options[aircraftEl.selectedIndex].text}<br>
          <span style="color:#c9b037">Flight Time:</span> ${flightTime} hrs (inc. taxi)<br>
          <span style="color:#c9b037">Base Charter:</span> $${base.toLocaleString()}<br>
          Landing & Handling: $${landing.toLocaleString()}<br>
          Crew Overnight: $${overnight.toLocaleString()}<br>
          Passenger Fees: $${segment.toLocaleString()}<br>
          Taxes & FET: $${tax.toLocaleString()}<br>
          <strong style="color:#c9b037;font-size:1.25rem">Total Investment: $${total.toLocaleString()}</strong><br>
          <small>This is a tailored estimate; final pricing subject to operator confirmation.</small>
        </div>`;
}
