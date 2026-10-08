import { LegalPage, LegalTable } from "@/components/legal/legal-page"
import { LEGAL_UPDATED } from "@/lib/legal"
import { GHANA_DESTINATIONS } from "@/lib/ghana-destinations"
import { pageMeta } from "@/lib/page-meta"

export const metadata = pageMeta({
  title: "Map Data & Attributions — Lincoln Navigation",
  description:
    "The open data, map imagery, services and open-source software that power LincolnNavigation.com, and their licences.",
  path: "/attributions",
})

type Credit = { name: string; href: string; use: string; licence: string }

const DATA: Credit[] = [
  { name: "OpenStreetMap contributors", href: "https://www.openstreetmap.org/copyright", use: "Roads, buildings, places and addresses", licence: "Open Database License (ODbL) 1.0" },
  { name: "OpenFreeMap / OpenMapTiles", href: "https://openfreemap.org", use: "Vector base map tiles and style", licence: "Tiles © OpenMapTiles, data © OpenStreetMap contributors" },
  { name: "Esri, Maxar, Earthstar Geographics", href: "https://www.esri.com", use: "Satellite imagery", licence: "Esri terms of use" },
  { name: "OpenTopoMap", href: "https://opentopomap.org", use: "Topographic map style", licence: "CC BY-SA 3.0" },
  { name: "Mapzen / AWS Terrain Tiles", href: "https://github.com/tilezen/joerd/blob/master/docs/attribution.md", use: "Elevation and 3D terrain", licence: "Various public sources, incl. SRTM, GMTED2010, ETOPO1" },
  { name: "Mapillary", href: "https://www.mapillary.com", use: "Street-level photos", licence: "CC BY-SA 4.0" },
  { name: "Nominatim", href: "https://nominatim.org", use: "Address search", licence: "Data © OpenStreetMap contributors, ODbL" },
  { name: "Overpass API", href: "https://overpass-api.de", use: "Nearby places", licence: "Data © OpenStreetMap contributors, ODbL" },
  { name: "Google Maps Platform", href: "https://cloud.google.com/maps-platform/terms", use: "Place search, ratings and hours (when enabled)", licence: "Google Maps Platform terms" },
  { name: "Mapbox", href: "https://www.mapbox.com/about/maps", use: "Search and geocoding (when enabled)", licence: "© Mapbox, © OpenStreetMap" },
  { name: "Foursquare", href: "https://foursquare.com", use: "Place data (when enabled)", licence: "Foursquare terms" },
  { name: "openrouteservice by HeiGIT", href: "https://openrouteservice.org", use: "Routing and route-around-hazard", licence: "© openrouteservice.org by HeiGIT, data © OpenStreetMap contributors" },
  { name: "Accra Mobile 3 trotro lines (OpenStreetMap Ghana)", href: "https://wiki.openstreetmap.org/wiki/AccraMobile3", use: "Trotro lines and stops for Accra (beta)", licence: "ODbL, © OpenStreetMap contributors" },
  { name: "OSRM", href: "https://project-osrm.org", use: "Routing", licence: "BSD-2-Clause, data © OpenStreetMap contributors" },
  { name: "GraphHopper", href: "https://www.graphhopper.com", use: "Routing (when enabled)", licence: "GraphHopper terms" },
  { name: "Open-Meteo", href: "https://open-meteo.com", use: "Weather and forecasts", licence: "CC BY 4.0" },
  { name: "OpenWeather", href: "https://openweathermap.org", use: "Weather (when enabled)", licence: "CC BY-SA 4.0 (data), OpenWeather terms" },
  { name: "GDACS", href: "https://www.gdacs.org", use: "Regional disaster and flood alerts", licence: "© European Union / United Nations, GDACS terms" },
  { name: "Wikipedia", href: "https://www.wikipedia.org", use: "Place descriptions", licence: "CC BY-SA 4.0" },
]

const SOFTWARE: [string, string][] = [
  ["MapLibre GL JS", "BSD-3-Clause"],
  ["mapillary-js", "MIT"],
  ["Next.js", "MIT"],
  ["React", "MIT"],
  ["Radix UI", "MIT"],
  ["Tailwind CSS", "MIT"],
  ["Lucide icons", "ISC"],
  ["Recharts", "MIT"],
  ["Supabase JS", "MIT"],
  ["Geist fonts", "SIL Open Font License 1.1"],
]

export default function AttributionsPage() {
  return (
    <LegalPage
      title="Map Data & Attributions"
      path="/attributions"
      updated={LEGAL_UPDATED.attributions}
      intro={
        <p>
          Lincoln Navigation is built on the work of many open-data projects,
          map providers and open-source developers. We credit them here, as
          their licences require, and with thanks.
        </p>
      }
    >
      <section>
        <h2>OpenStreetMap</h2>
        <p>
          Most map data is <strong>© OpenStreetMap contributors</strong> and
          available under the{" "}
          <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noopener noreferrer">
            Open Database License
          </a>
          . Spot something wrong or missing in Ghana? You can fix it for
          everyone at{" "}
          <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer">
            openstreetmap.org/fixthemap
          </a>
          .
        </p>
      </section>

      <section>
        <h2>Data, imagery and services</h2>
        <LegalTable>
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Used for</th>
                <th>Licence / terms</th>
              </tr>
            </thead>
            <tbody>
              {DATA.map((c) => (
                <tr key={c.name}>
                  <td>
                    <a href={c.href} target="_blank" rel="noopener noreferrer">{c.name}</a>
                  </td>
                  <td>{c.use}</td>
                  <td>{c.licence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </LegalTable>
        <p>
          The map itself also shows the credits for whatever layer is on
          screen (tap the ⓘ icon in the corner of the map).
        </p>
      </section>

      <section>
        <h2>Destination photos</h2>
        <p>
          The photos of Ghana&apos;s attractions on our{" "}
          <a href="/features">Features page</a> (several of which also appear
          on the home page) come from Wikimedia Commons.
        </p>
        <ul>
          {GHANA_DESTINATIONS.map((d) => (
            <li key={d.id}>
              <strong>{d.name}</strong>:{" "}
              <a href={d.credit.source} target="_blank" rel="noopener noreferrer">{d.credit.author}</a>, {d.credit.licence}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Open-source software</h2>
        <ul>
          {SOFTWARE.map(([name, licence]) => (
            <li key={name}>
              <strong>{name}</strong>: {licence}
            </li>
          ))}
        </ul>
        <p>
          Full licence texts ship with each package. Trademarks belong to
          their owners; their use here does not mean they endorse us.
        </p>
      </section>
    </LegalPage>
  )
}
