# Menstrual Product Standards Database — Agent Instructions

## Project Overview
Interactive web application for exploring, searching, and comparing menstrual product standards from different countries and regions. Built with vanilla JavaScript, HTML, CSS, and Leaflet.js for mapping.

**Key Users**: Health researchers, policy makers, NGOs, and product manufacturers looking for regional standard requirements.

## Tech Stack & Architecture

### Frontend Stack
- **HTML5** — Semantic structure with interactive sections
- **CSS3** — Custom design system using CSS variables (see `:root` in `style.css`)
- **Vanilla JavaScript** — No framework; DOM manipulation and data filtering
- **Leaflet.js** — Interactive map display with country markers
- **Material Symbols Outlined** — Icon library for UI elements
- **Google Fonts** — Young Serif (headings), Instrument Sans (body)

### Project Structure
```
├── index.html                   # Main entry point; contains header, map, controls, and results UI
├── app.js                      # Core application logic: data fetching, filtering, search, comparison
├── style.css                   # Styling with color variables and responsive layout
├── data.json                   # JSON database of menstrual product standards by country
├── countries.geo.json           # Lightweight GeoJSON boundary dataset for choropleth map highlighting
└── disputed-boundaries.geo.json # GeoJSON overlay for disputed territory lines (LoC, LAC, Trans-Karakoram)
```

## Data Model

### data.json Structure
Each record contains:
- **Location**: Region, Country, Income category
- **Standards Metadata**: Standard number/code, issuing authority, year, language, source URL
- **Products & Scope**: Product types (tampons, pads), primary products included
- **Parameters Tracked** (boolean flags): Physical parameters, Absorbency, pH, Microbiological requirements, Sampling, Packaging, User Info, Chemical/heavy metal, Color fastness, Biocompatibility

**Country Boundaries**: Loaded from `countries.geo.json` and matched to records via country name normalization.

## Key Features & Implementation

### 1. Search & Filtering
- **Search Input**: Full-text search across standards, products, countries (in `#searchInput`)
- **Multi-Select Filters**: Vanilla `<details>`/`<summary>` dropdowns with native checkboxes for Country, Income Level, Primary Product, and ISO Participation.
  - Option items display record counts dynamically.
  - Filter state is managed via `selectedFilters` (`Country`, `Income`, `Product`, `ISO` as `Set` objects).
  - Filtering logic supports multiple values simultaneously (OR within a category, AND across categories, combined with full-text search).
- **Reset**: "Reset Filters" unchecks all checkboxes, clears search, resets dropdown labels, and restores map polygon styles.

### 2. Interactive Map (Country Polygon Highlighting)
- **Leaflet GeoJSON Integration**: Map renders world country polygons using `countries.geo.json`.
- **Boundary Compliance & Disputed Lines**:
  - **India-Compliant Outer Boundary**: External boundary follows official Survey of India cartographic standards, encompassing Jammu & Kashmir, Ladakh, and Arunachal Pradesh.
  - **Disputed Control Lines**: Line of Control (LoC), Line of Actual Control (LAC), and Trans-Karakoram Tract lines are loaded from `disputed-boundaries.geo.json` and rendered on a dedicated top pane (`zIndex: 450`) with dotted styling (`dashArray: '4, 4'`).
  - **Neighboring Boundaries**: Pakistan (`PAK`) polygon is cleanly aligned to the LoC without overlapping geometry.
- **Polygon Highlighting & Opacity**:
  - Countries without database entries are shaded in neutral gray (`#d1d5db`).
  - Countries with database entries are colored with `--primary` (`#3081E6`).
  - When no country is selected: all standard-holding countries display at normal opacity (`0.65`).
  - When one or more countries are selected:
    - Selected countries display bold highlight (`fillOpacity: 0.85`, dark outline).
    - Unselected countries with standards remain colored at reduced opacity (`fillOpacity: 0.2`).
    - Countries without standards remain gray.
- **Multi-Country Interaction**:
  - Clicking a country polygon toggles that country in `selectedFilters.Country`.
  - Bi-directional sync: clicking a country updates the Country filter dropdown checkbox and label; selecting/deselecting checkboxes updates polygon styles.
- **Regional Organization Pins**:
  - When records have `Region === 'Regional'`, dedicated pins are placed on the map with color `#fabd2d`:
    - United Nations — New York `[40.7489, -73.9680]`
    - EDANA — Brussels `[50.8503, 4.3517]`
    - EAS — Arusha, Tanzania `[-3.3869, 36.6830]`
    - ARSO — Nairobi, Kenya `[-1.2921, 36.8219]`
  - Clicking a pin filters data by that organization (`selectedFilters.Country`) just like clicking a country polygon.
  - Interactive states: selected pin remains highlighted at full opacity (`1.0`); unselected pins dim to `0.35` when a selection is active.
- **Map Container**: `<div id="map"></div>`

### 3. Results Display
- **Card View**: Each standard rendered as a card with metadata
- **Comparison Mode**: Users can select up to N standards to compare side-by-side (tracked in `selectedCompareIndices`)

### 4. Parameter Display & Modal Legends
Standards expose 11 parameter categories (hardcoded in `paramKeys` array in `app.js`):
- Physical parameters, Absorbency, Other parameters, pH, Microbiological requirements, Sampling, Packaging, User Info, Chemical/heavy metal, Color fastness, Biocompatibility
- **Status Icon Legend**: Both detail and comparison modals feature a footer legend:
  - Green (`check_circle`): Included in the standard
  - Red (`cancel`): Not included in the standard
  - Yellow (`help_outline`): Data not accessible

## Common Development Tasks

### Adding a New Country or Regional Organization
1. For standard countries: ensure country name matches `countries.geo.json` (or add an alias to `normalizeCountryName` in `app.js`).
2. For regional organizations: set `"Region": "Regional"` in `data.json` and ensure coordinate mapping is configured in `regionalLocations` in `app.js`.
3. Map will auto-refresh; filters and pins will populate dynamically.

### Adding a New Parameter
1. Add entry to `paramKeys` array in `app.js` with `label` and `key`
2. Add corresponding fields to all records in `data.json` (use "0" or "1" for boolean, or empty string)

### Updating Standards Data
- Edit `data.json` directly; app auto-fetches on load
- Ensure all records maintain consistent field structure
- Keep country names consistent with `countryCoords` keys for map functionality

### Styling & Theming
- All colors centralized in CSS custom properties (`:root` in `style.css`)
- Key variables: `--bg-header`, `--primary`, `--icon-green`, `--icon-red`, etc.
- Mobile-first responsive design; viewport meta tag configured in `<head>`

## File Responsibilities

| File | Responsibility |
|------|---|
| `index.html` | DOM structure; header, map container, search/filter UI, results grid |
| `app.js` | Data initialization, search/filter logic, map rendering, event handlers |
| `style.css` | Layout, typography, color scheme, responsive breakpoints |
| `data.json` | Standards database; one object per standard with consistent schema |

## Development Workflow

1. **Local Development**: Open `index.html` in a browser; app loads `data.json` via fetch API
2. **Testing**: Verify search, filters, and map interaction; check data consistency
3. **Data Updates**: Edit `data.json`; refresh browser to see changes
4. **Style Changes**: Edit `style.css`; use CSS custom properties for consistency

## Notes for Agents

- **No build process**: This is a static site; no bundler or transpiler required
- **CORS**: Ensure `data.json` is served from the same origin (no cross-origin issues expected for local development)
- **Browser Compatibility**: Uses modern CSS and ES6+ (const, arrow functions); target modern browsers
- **Accessibility**: Material Symbols icons included; consider adding aria-labels when modifying interactive elements
- **Performance**: Currently loads all standards in memory; scalable for ~100-500 records; pagination/lazy-loading may be needed for larger datasets

## Related Documentation
- Standards database source and research methodology: See project parent directory for context
- Menstrual health equity context: Visit rhsupplies.org (referenced in header)
