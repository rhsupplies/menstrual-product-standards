// Fetch database from external JSON file and initialize app
let database = [];

// Unique parameters list
const paramKeys = [
    { label: "PHYSICAL PARAMETERS (MANUFACTURING MATERIAL, SIZE, WORKMANSHIP)", key: "Physical parameters (Manufacturing Material, size, workmanship)" },
    { label: "ABSORBENCY", key: "Absorbency " },
    { label: "OTHER PARAMETERS", key: "Other parameters" },
    { label: "PH", key: "pH" },
    { label: "MICROBIOLOGICAL REQUIREMENTS", key: "Microbiological requirements" },
    { label: "SAMPLING", key: "Sampling" },
    { label: "PACKAGING", key: "Packaging" },
    { label: "USER INFO", key: "User Info" },
    { label: "CHEMICAL AND HEAVY METAL", key: "Chemical and heavy metal " },
    { label: "COLOR FASTNESS", key: "Color fastness" },
    { label: "BIOCOMPATIBILITY", key: "Biocompatibility" }
];

// GeoJSON Country Layers
let countriesGeoData = null;
let geojsonLayer = null;
let disputedGeoData = null;
let disputedLinesLayer = null;

// Regional Organization Locations (Used when Region === 'Regional')
const regionalLocations = {
    'United Nations': { name: 'New York', coords: [40.7489, -73.9680] },
    'EDANA': { name: 'Brussels', coords: [50.8503, 4.3517] },
    'EAS': { name: 'Arusha, Tanzania', coords: [-3.3869, 36.6830] },
    'ARSO': { name: 'Nairobi, Kenya', coords: [-1.2921, 36.8219] }
};
let regionalMarkersLayer = null;
const regionalMarkers = {};

// Normalize names between data.json and countries.geo.json
function normalizeCountryName(geoName) {
    if (geoName === 'United States of America' || geoName === 'United States') return 'US';
    if (geoName === 'Russia') return 'Russian Federation';
    if (geoName === 'Tanzania') return 'United Republic of Tanzania';
    return geoName;
}

// State Variables
let currentData = [];
let selectedCompareIndices = [];
let sortAscending = true;
let lastSortedColumn = 'Country'; // Default sort column

// Multi-select Filter State
const selectedFilters = {
    Country: new Set(),
    Income: new Set(),
    Product: new Set(),
    ISO: new Set()
};

const filterLabels = {
    Country: { id: 'countryFilterLabel', defaultText: 'Country/Region: All', prefix: 'Country/Region' },
    Income: { id: 'incomeFilterLabel', defaultText: 'Income Level: All', prefix: 'Income Level' },
    Product: { id: 'productFilterLabel', defaultText: 'Primary Product: All', prefix: 'Primary Product' },
    ISO: { id: 'isoFilterLabel', defaultText: 'ISO Participation: All', prefix: 'ISO Participation' }
};

// DOM Elements
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const compareBar = document.getElementById('compareBar');
const compareCount = document.getElementById('compareCount');

// Initialize Leaflet Map
const map = L.map('map').setView([15, 20], 2);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=cb1_31xm_1_497050ee8f3aea2ffead19da', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    minZoom: 2,
    maxZoom: 5
}).addTo(map);

// Sort Helper Function
function sortDataByField(dataArray, fieldKey, ascending = true) {
    return dataArray.sort((a, b) => {
        let valA = (a[fieldKey] || '').toString().trim().toLowerCase();
        let valB = (b[fieldKey] || '').toString().trim().toLowerCase();

        if (valA < valB) return ascending ? -1 : 1;
        if (valA > valB) return ascending ? 1 : -1;
        return 0;
    });
}

// Initialize Page: Fetch database, countries GeoJSON, and disputed boundaries
window.addEventListener('DOMContentLoaded', () => {
    Promise.all([
        fetch('data.json').then(r => r.json()),
        fetch('countries.geo.json').then(r => r.json()),
        fetch('disputed-boundaries.geo.json').then(r => r.json())
    ])
    .then(([data, geojson, disputedJson]) => {
        database = data;
        currentData = [...database];
        countriesGeoData = geojson;
        disputedGeoData = disputedJson;
        populateFilterDropdowns();
        initGeoJsonMap();
        initDisputedBoundaries();
        initRegionalPins();
        // Sort initial dataset alphabetically by Country
        sortDataByField(currentData, 'Country', true);
        renderTable(currentData);
    })
    .catch(error => {
        console.error('Error loading database or GeoJSON:', error);
    });

    // Event Listeners
    searchInput.addEventListener('input', applyFilters);

    // Close open details dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.filter-dropdown')) {
            document.querySelectorAll('.filter-dropdown[open]').forEach(dd => dd.removeAttribute('open'));
        }
    });

    // Ensure only one dropdown is open at a time
    document.querySelectorAll('.filter-dropdown').forEach(dd => {
        dd.addEventListener('toggle', () => {
            if (dd.open) {
                document.querySelectorAll('.filter-dropdown[open]').forEach(other => {
                    if (other !== dd) other.removeAttribute('open');
                });
            }
        });
    });
});

// Determine polygon style based on database presence and active selection
function getCountryStyle(countryName) {
    const count = database.filter(d => d.Country.trim() === countryName).length;
    const hasEntries = count > 0;
    const hasSelection = selectedFilters.Country.size > 0;
    const isSelected = selectedFilters.Country.has(countryName);

    // Countries without entries are rendered gray
    if (!hasEntries) {
        return {
            fillColor: '#d1d5db',
            fillOpacity: 0.5,
            color: '#94a3b8',
            weight: 0.8
        };
    }

    // Countries with entries
    if (hasSelection) {
        if (isSelected) {
            return {
                fillColor: '#1a56db',
                fillOpacity: 0.85,
                color: '#0f172a',
                weight: 2
            };
        } else {
            // Lower opacity for unselected countries with entries
            return {
                fillColor: '#3081E6',
                fillOpacity: 0.2,
                color: '#93c5fd',
                weight: 1
            };
        }
    }

    // Default state for countries with entries (no selection active)
    return {
        fillColor: '#3081E6',
        fillOpacity: 0.65,
        color: '#1e66c4',
        weight: 1.2
    };
}

// Update layer tooltip based on country selection
function updateLayerTooltip(layer, country, count) {
    const hasSelection = selectedFilters.Country.size > 0;
    const isSelected = selectedFilters.Country.has(country);
    let text = `<b>${country}</b> (${count} standard${count > 1 ? 's' : ''})`;

    if (isSelected) {
        text += `<br><span style="font-size: 11px; color: #1e66c4; font-weight: 600;">Selected (click to remove)</span>`;
    } else if (hasSelection) {
        text += `<br><span style="font-size: 11px; color: #64748b;">Click to add to selection</span>`;
    }

    layer.unbindTooltip();
    layer.bindTooltip(text, { sticky: true });
}

// Initialize GeoJSON world map layer
function initGeoJsonMap() {
    if (!countriesGeoData) return;
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
    }

    geojsonLayer = L.geoJSON(countriesGeoData, {
        style: feature => {
            const country = normalizeCountryName(feature.properties.name);
            return getCountryStyle(country);
        },
        onEachFeature: (feature, layer) => {
            const rawName = feature.properties.name;
            const country = normalizeCountryName(rawName);
            const count = database.filter(d => d.Country.trim() === country).length;
            const hasEntries = count > 0;

            if (hasEntries) {
                updateLayerTooltip(layer, country, count);

                layer.on({
                    mouseover: (e) => {
                        const target = e.target;
                        target.setStyle({
                            weight: 2.5,
                            color: '#181423'
                        });
                        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                            target.bringToFront();
                        }
                    },
                    mouseout: (e) => {
                        geojsonLayer.resetStyle(e.target);
                    },
                    click: () => {
                        toggleCountryFromMap(country);
                    }
                });
            } else {
                layer.bindTooltip(`<b>${rawName}</b><br><span style="font-size: 11px; color: #64748b;">No standards recorded</span>`, { sticky: true });
            }
        }
    }).addTo(map);
}

// Initialize Disputed Boundaries Layer (Dotted lines for LoC, LAC, etc.)
function initDisputedBoundaries() {
    if (!disputedGeoData) return;
    if (disputedLinesLayer) {
        map.removeLayer(disputedLinesLayer);
    }

    if (!map.getPane('disputedLinesPane')) {
        map.createPane('disputedLinesPane');
        map.getPane('disputedLinesPane').style.zIndex = 450;
        map.getPane('disputedLinesPane').style.pointerEvents = 'none';
    }

    disputedLinesLayer = L.geoJSON(disputedGeoData, {
        pane: 'disputedLinesPane',
        style: {
            color: '#ff2600',
            weight: 1.5,
            dashArray: '4, 4',
            opacity: 0.9
        },
        interactive: false
    }).addTo(map);
}

// Initialize Regional Organization Pins (#fabd2d)
function initRegionalPins() {
    if (regionalMarkersLayer) {
        map.removeLayer(regionalMarkersLayer);
    }
    regionalMarkersLayer = L.layerGroup().addTo(map);

    // Filter database for regional entries
    const regionalEntries = database.filter(item => (item.Region || '').trim() === 'Regional');

    // Group counts by country name
    const regionalCounts = {};
    regionalEntries.forEach(item => {
        const c = item.Country.trim();
        if (c) regionalCounts[c] = (regionalCounts[c] || 0) + 1;
    });

    Object.keys(regionalLocations).forEach(country => {
        const count = regionalCounts[country] || 0;
        if (count === 0) return;

        const loc = regionalLocations[country];
        const marker = L.marker(loc.coords, {
            icon: L.divIcon({
                className: 'regional-pin-container',
                html: `<div class="regional-pin"><span class="material-symbols-outlined">location_on</span></div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                tooltipAnchor: [0, -30]
            })
        });

        updateRegionalMarkerTooltip(marker, country, loc.name, count);

        marker.on('click', () => {
            toggleCountryFromMap(country);
        });

        regionalMarkers[country] = { marker, loc, count };
        marker.addTo(regionalMarkersLayer);
    });
}

function updateRegionalMarkerTooltip(marker, country, locName, count) {
    const hasSelection = selectedFilters.Country.size > 0;
    const isSelected = selectedFilters.Country.has(country);
    let text = `<b>${country}</b> (${locName})<br>${count} regional standard${count > 1 ? 's' : ''}`;

    if (isSelected) {
        text += `<br><span style="font-size: 11px; color: #b47d06; font-weight: 600;">Selected (click to remove)</span>`;
    } else if (hasSelection) {
        text += `<br><span style="font-size: 11px; color: #64748b;">Click to add to selection</span>`;
    }

    marker.unbindTooltip();
    marker.bindTooltip(text, { sticky: true, offset: [0, -28] });
}

// Update all country polygon and regional pin styles on filter change
function updateMapStyles() {
    if (geojsonLayer) {
        geojsonLayer.eachLayer(layer => {
            if (layer.feature && layer.feature.properties) {
                const country = normalizeCountryName(layer.feature.properties.name);
                const count = database.filter(d => d.Country.trim() === country).length;
                layer.setStyle(getCountryStyle(country));
                if (count > 0) {
                    updateLayerTooltip(layer, country, count);
                }
            }
        });
    }

    // Update regional pin styles
    const hasSelection = selectedFilters.Country.size > 0;
    Object.keys(regionalMarkers).forEach(country => {
        const { marker, loc, count } = regionalMarkers[country];
        const isSelected = selectedFilters.Country.has(country);

        if (isSelected) {
            marker.setOpacity(1.0);
        } else if (hasSelection) {
            marker.setOpacity(0.35);
        } else {
            marker.setOpacity(1.0);
        }

        const el = marker.getElement();
        if (el) {
            const pinEl = el.querySelector('.regional-pin');
            if (pinEl) {
                pinEl.classList.toggle('selected', isSelected);
                pinEl.classList.toggle('dimmed', hasSelection && !isSelected);
            }
        }
        updateRegionalMarkerTooltip(marker, country, loc.name, count);
    });
}

function toggleCountryFromMap(country) {
    const checkbox = document.querySelector(`#countryOptions input[value="${CSS.escape(country)}"]`);
    if (selectedFilters.Country.has(country)) {
        selectedFilters.Country.delete(country);
        if (checkbox) checkbox.checked = false;
    } else {
        selectedFilters.Country.add(country);
        if (checkbox) checkbox.checked = true;
    }
    updateFilterLabel('Country');
    applyFilters();
    document.querySelector('.table-card').scrollIntoView({ behavior: 'smooth' });
}

// Populate Dropdowns with Checkboxes dynamically
function populateFilterDropdowns() {
    renderFilterOptions('Country', 'countryOptions', 'Country');
    renderFilterOptions('Income', 'incomeOptions', 'Income category');
    renderFilterOptions('Product', 'productOptions', ' Primary Products included');
    renderFilterOptions('ISO', 'isoOptions', 'ISO participation');
}

function renderFilterOptions(filterKey, containerId, dataField) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const counts = {};
    database.forEach(item => {
        const val = (item[dataField] || '').trim();
        if (val) counts[val] = (counts[val] || 0) + 1;
    });
    const uniqueValues = Object.keys(counts).sort();
    container.innerHTML = uniqueValues.map(val => `
        <label class="filter-option">
            <input type="checkbox" value="${val.replace(/"/g, '&quot;')}" onchange="toggleFilter('${filterKey}', this)">
            <span>${val} (${counts[val]})</span>
        </label>
    `).join('');
}

function toggleFilter(filterKey, checkbox) {
    if (checkbox.checked) {
        selectedFilters[filterKey].add(checkbox.value);
    } else {
        selectedFilters[filterKey].delete(checkbox.value);
    }
    updateFilterLabel(filterKey);
    applyFilters();
}

function updateFilterLabel(filterKey) {
    const config = filterLabels[filterKey];
    const elem = document.getElementById(config.id);
    if (!elem) return;
    const selected = selectedFilters[filterKey];
    if (selected.size === 0) {
        elem.textContent = config.defaultText;
    } else if (selected.size === 1) {
        elem.textContent = `${config.prefix}: ${Array.from(selected)[0]}`;
    } else {
        elem.textContent = `${config.prefix} (${selected.size})`;
    }
}

// Filter Function supporting multiple checkbox values
function applyFilters() {
    const query = searchInput.value.toLowerCase().trim();

    currentData = database.filter(item => {
        const matchesSearch = !query || Object.values(item).some(val => String(val).toLowerCase().includes(query));
        const matchesCountry = selectedFilters.Country.size === 0 || selectedFilters.Country.has(item.Country.trim());
        const matchesIncome = selectedFilters.Income.size === 0 || selectedFilters.Income.has((item['Income category'] || '').trim());
        const matchesProduct = selectedFilters.Product.size === 0 || selectedFilters.Product.has((item[' Primary Products included'] || '').trim());
        const matchesIso = selectedFilters.ISO.size === 0 || selectedFilters.ISO.has((item['ISO participation'] || '').trim());

        return matchesSearch && matchesCountry && matchesIncome && matchesProduct && matchesIso;
    });

    // Maintain current sorting field and order
    sortDataByField(currentData, lastSortedColumn, sortAscending);
    renderTable(currentData);
    updateMapStyles();
}

// Reset Filters Function
function resetFilters() {
    searchInput.value = '';
    Object.keys(selectedFilters).forEach(key => {
        selectedFilters[key].clear();
        updateFilterLabel(key);
    });
    document.querySelectorAll('.filter-dropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('.filter-dropdown[open]').forEach(dd => dd.removeAttribute('open'));

    // Reset sorting to Country Ascending
    lastSortedColumn = 'Country';
    sortAscending = true;
    updateSortIcons();

    applyFilters();
    map.setView([15, 20], 2);
}

// Update Icons in Table Headings
function updateSortIcons() {
    document.querySelectorAll('th[data-col]').forEach(th => {
        const col = th.getAttribute('data-col');
        const iconSpan = th.querySelector('.sort-icon');
        if (col === lastSortedColumn) {
            iconSpan.textContent = sortAscending ? '▲' : '▼';
        } else {
            iconSpan.textContent = '↕';
        }
    });
}

// Render Table Rows
function renderTable(data) {
    tableBody.innerHTML = '';
    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">No matching records found</td></tr>`;
        return;
    }

    data.forEach((item) => {
        const originalIndex = database.indexOf(item);
        const isChecked = selectedCompareIndices.includes(originalIndex) ? 'checked' : '';

        const tr = document.createElement('tr');
        tr.onclick = (e) => {
            if (e.target.tagName !== 'INPUT') {
                openDetailModal(originalIndex);
            }
        };

        tr.innerHTML = `
            <td style="text-align: center;">
                <input type="checkbox" class="compare-checkbox" ${isChecked} onchange="toggleCompare(${originalIndex}, event)">
            </td>
            <td><strong>${item.Country.trim()}</strong></td>
            <td>${item['Standard Number/Code'] || 'N/A'}</td>
            <td>${item[' Primary Products included'].trim()}</td>
            <td>${item['Year of Issue/Revision']}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// Sort Table with visual indicators
function sortTable(columnKey) {
    if (lastSortedColumn === columnKey) {
        sortAscending = !sortAscending;
    } else {
        sortAscending = true;
        lastSortedColumn = columnKey;
    }

    sortDataByField(currentData, lastSortedColumn, sortAscending);
    updateSortIcons();
    renderTable(currentData);
}

// Compare Checkbox Logic
function toggleCompare(index, event) {
    event.stopPropagation();
    if (selectedCompareIndices.includes(index)) {
        selectedCompareIndices = selectedCompareIndices.filter(i => i !== index);
    } else {
        if (selectedCompareIndices.length >= 3) {
            alert('You can compare up to 3 entries at a time.');
            event.target.checked = false;
            return;
        }
        selectedCompareIndices.push(index);
    }
    updateCompareBar();
}

function clearCompare() {
    selectedCompareIndices = [];
    updateCompareBar();
    renderTable(currentData);
}

function updateCompareBar() {
    if (selectedCompareIndices.length > 0) {
        compareBar.style.display = 'flex';
        compareCount.innerText = `${selectedCompareIndices.length} selected (Max 3)`;
    } else {
        compareBar.style.display = 'none';
    }
}

// Helper to Generate Parameter Indicator Icon matching design spec
function getStatusIcon(value) {
    const val = String(value || '').trim();
    if (val === '1') {
        return `<span class="material-symbols-outlined status-icon green" title="Included / Yes">check_circle</span>`;
    } else if (val === '0') {
        return `<span class="material-symbols-outlined status-icon red" title="Not Included / No">cancel</span>`;
    } else {
        return `<span class="material-symbols-outlined status-icon yellow" title="Not Specified / Unknown">help_outline</span>`;
    }
}

// Open Detail Modal
function openDetailModal(index) {
    const item = database[index];

    document.getElementById('modalTitle').innerText = `${item.Country.trim()} – ${item['Standard Number/Code'] || 'Standard'}`;
    
    const linkElem = document.getElementById('modalDirectLink');
    if (item['Source URL'] && item['Source URL'].startsWith('http')) {
        linkElem.innerHTML = `<a href="${item['Source URL']}" target="_blank" class="direct-link">DIRECT LINK TO STANDARD ↗</a>`;
    } else {
        linkElem.innerHTML = ``;
    }

    document.getElementById('modalProduct').innerText = item[' Primary Products included'] || '-';
    document.getElementById('modalRegion').innerText = item.Region || '-';
    document.getElementById('modalIncome').innerText = item['Income category'] || '-';
    document.getElementById('modalIso').innerText = item['ISO participation'] || '-';
    document.getElementById('modalYear').innerText = item['Year of Issue/Revision'] || '-';
    document.getElementById('modalStandardNum').innerText = item['Standard Number/Code'] || '-';
    document.getElementById('modalLanguage').innerText = item.Language || '-';
    document.getElementById('modalAuthority').innerText = item['Issuing Government Authority'] || '-';
    document.getElementById('modalMandatory').innerText = item['Mandatory/Voluntary'] || '-';
    document.getElementById('modalRegulatory').innerText = item['Regulatory Treatment'] || '-';
    document.getElementById('modalPaywall').innerText = item.Paywall || '-';
    document.getElementById('modalScope').innerText = item['Scope as per standard'] || '-';

    const paramContainer = document.getElementById('modalParamList');
    paramContainer.innerHTML = '';
    paramKeys.forEach(param => {
        const val = item[param.key];
        paramContainer.innerHTML += `
            <div class="param-item">
                <span class="param-name">${param.label}</span>
                ${getStatusIcon(val)}
            </div>
        `;
    });

    document.getElementById('detailModal').style.display = 'flex';
}

function printDetailModal() {
    document.body.classList.add('print-detail-modal');
    window.print();
}

function printCompareModal() {
    document.body.classList.add('print-compare-modal');
    window.print();
}

window.addEventListener('afterprint', () => {
    document.body.classList.remove('print-detail-modal', 'print-compare-modal');
});

// Open Matrix Comparison Modal
function openCompareModal() {
    if (selectedCompareIndices.length === 0) return;

    const selectedItems = selectedCompareIndices.map(idx => database[idx]);
    const compareTable = document.getElementById('compareTable');
    compareTable.innerHTML = '';

    // Header Row: Country Names
    let headHtml = `<thead><tr><th></th>`;
    selectedItems.forEach(item => {
        headHtml += `<th>${item.Country.trim()}</th>`;
    });
    headHtml += `</tr></thead>`;

    // Body Rows
    let bodyHtml = `<tbody>`;

    // 1. PRODUCTS row
    bodyHtml += `<tr><td class="row-label">PRODUCTS</td>`;
    selectedItems.forEach(item => {
        bodyHtml += `<td style="font-weight: 500;">${item[' Primary Products included'] || '-'}</td>`;
    });
    bodyHtml += `</tr>`;

    // 2. ISO PARTICIPATION row
    bodyHtml += `<tr><td class="row-label">ISO PARTICIPATION</td>`;
    selectedItems.forEach(item => {
        bodyHtml += `<td style="font-weight: 500;">${item['ISO participation'] || '-'}</td>`;
    });
    bodyHtml += `</tr>`;

    // 3. YEAR row
    bodyHtml += `<tr><td class="row-label">YEAR</td>`;
    selectedItems.forEach(item => {
        bodyHtml += `<td style="font-weight: 500;">${item['Year of Issue/Revision'] || '-'}</td>`;
    });
    bodyHtml += `</tr>`;

    // 4. Parameter Rows (Icons)
    paramKeys.forEach(param => {
        bodyHtml += `<tr><td class="row-label">${param.label}</td>`;
        selectedItems.forEach(item => {
            bodyHtml += `<td>${getStatusIcon(item[param.key])}</td>`;
        });
        bodyHtml += `</tr>`;
    });

    bodyHtml += `</tbody>`;

    compareTable.innerHTML = headHtml + bodyHtml;
    document.getElementById('compareModal').style.display = 'flex';
}

// Close Modal Helper
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Close modal when clicking backdrop
window.onclick = function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.style.display = 'none';
    }
};
