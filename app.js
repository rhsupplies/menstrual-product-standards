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

// Country Lat/Long Coordinates
const countryCoords = {
    "Australia": [-25.2744, 133.7751],
    "Bangladesh": [23.6850, 90.3563],
    "Brazil": [-14.2350, -51.9253],
    "China": [35.8617, 104.1954],
    "Egypt": [26.8206, 30.8025],
    "Ethiopia": [9.1450, 40.4897],
    "Ghana": [7.9465, -1.0232],
    "India": [20.5937, 78.9629],
    "Indonesia": [-0.7893, 113.9213],
    "Japan": [36.2048, 138.2529],
    "Kenya": [-1.2921, 36.8219],
    "Malawi": [-13.2543, 34.3015],
    "Nepal": [28.3949, 84.1240],
    "New Zealand": [-40.9006, 174.8860],
    "Nigeria": [9.0820, 8.6753],
    "Pakistan": [30.3753, 69.3451],
    "Russian federation": [61.5240, 105.3188],
    "South Africa": [-30.5595, 22.9375],
    "South Korea": [35.9078, 127.7669],
    "Sri Lanka": [7.8731, 80.7718],
    "Uganda": [1.3733, 32.2903],
    "United Republic of Tanzania": [-6.3690, 34.8888],
    "US": [37.0902, -95.7129],
    "Zimbabwe": [-19.0154, 29.1549]
};

// State Variables
let currentData = [];
let selectedCompareIndices = [];
let sortAscending = true;
let lastSortedColumn = 'Country'; // Default sort column

// DOM Elements
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const countryFilter = document.getElementById('countryFilter');
const incomeFilter = document.getElementById('incomeFilter');
const productFilter = document.getElementById('productFilter');
const isoFilter = document.getElementById('isoFilter');
const compareBar = document.getElementById('compareBar');
const compareCount = document.getElementById('compareCount');

// Initialize Leaflet Map
const map = L.map('map').setView([15, 20], 2);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
}).addTo(map);

// Map Gold Custom Marker Icon
const goldIcon = L.divIcon({
    className: 'custom-map-pin',
    html: `<span class="material-symbols-outlined" style="color: #3081E6; font-size: 42px;">location_on</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32]
});

// Layer group to allow dynamic updating of markers
const markersLayer = L.layerGroup().addTo(map);

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

// Initialize Page
window.addEventListener('DOMContentLoaded', () => {
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            database = data;
            currentData = [...database];
            populateFilterDropdowns();
            // Sort initial dataset alphabetically by Country
            sortDataByField(currentData, 'Country', true);
            renderTable(currentData);
            updateMapMarkers(currentData);
        })
        .catch(error => {
            console.error('Error loading database JSON:', error);
        });

    // Event Listeners
    searchInput.addEventListener('input', applyFilters);
    countryFilter.addEventListener('change', applyFilters);
    incomeFilter.addEventListener('change', applyFilters);
    productFilter.addEventListener('change', applyFilters);
    isoFilter.addEventListener('change', applyFilters);
});

// Dynamic Map Markers setup (reflects active filters)
function updateMapMarkers(data) {
    markersLayer.clearLayers();
    const activeCountries = [...new Set(data.map(item => item.Country.trim()))];
    activeCountries.forEach(country => {
        if (countryCoords[country]) {
            const count = data.filter(d => d.Country.trim() === country).length;
            const marker = L.marker(countryCoords[country], { icon: goldIcon });
            marker.bindTooltip(`<b>${country}</b> (${count} standard${count > 1 ? 's' : ''})`);
            marker.on('click', () => {
                countryFilter.value = country;
                applyFilters();
                document.querySelector('.table-card').scrollIntoView({ behavior: 'smooth' });
            });
            markersLayer.addLayer(marker);
        }
    });
}

// Populate Dropdowns dynamically
function populateFilterDropdowns() {
    const getUnique = (key) => [...new Set(database.map(d => (d[key] || '').trim()).filter(Boolean))].sort();

    getUnique('Country').forEach(c => countryFilter.innerHTML += `<option value="${c}">${c}</option>`);
    getUnique('Income category').forEach(i => incomeFilter.innerHTML += `<option value="${i}">${i}</option>`);
    getUnique('ISO participation').forEach(iso => isoFilter.innerHTML += `<option value="${iso}">${iso}</option>`);

    const products = [...new Set(database.map(d => d[' Primary Products included'].trim()).filter(Boolean))].sort();
    products.forEach(p => productFilter.innerHTML += `<option value="${p}">${p}</option>`);
}

// Filter Function
function applyFilters() {
    const query = searchInput.value.toLowerCase();
    const countryVal = countryFilter.value;
    const incomeVal = incomeFilter.value;
    const productVal = productFilter.value;
    const isoVal = isoFilter.value;

    currentData = database.filter(item => {
        const matchesSearch = Object.values(item).some(val => String(val).toLowerCase().includes(query));
        const matchesCountry = !countryVal || item.Country.trim() === countryVal;
        const matchesIncome = !incomeVal || (item['Income category'] || '').trim() === incomeVal;
        const matchesProduct = !productVal || (item[' Primary Products included'] || '').trim() === productVal;
        const matchesIso = !isoVal || (item['ISO participation'] || '').trim() === isoVal;

        return matchesSearch && matchesCountry && matchesIncome && matchesProduct && matchesIso;
    });

    // Maintain current sorting field and order
    sortDataByField(currentData, lastSortedColumn, sortAscending);
    renderTable(currentData);
    updateMapMarkers(currentData);
}

// Reset Filters Function
function resetFilters() {
    searchInput.value = '';
    countryFilter.value = '';
    incomeFilter.value = '';
    productFilter.value = '';
    isoFilter.value = '';
    
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
