/**
 * Ghana attractions shown on /features. Photos live under
 * /public/features/places and come from Wikimedia Commons — each one
 * carries its author and licence so the page (and /attributions) can
 * credit it as the CC licences require.
 */
export interface GhanaDestination {
  id: string
  name: string
  region: string
  category: "Heritage" | "Nature" | "Wildlife" | "Waterfall" | "Culture" | "Landmark" | "Beach"
  blurb: string
  /** Where the pin goes on /app (the visitor entrance where there is one). */
  lat: number
  lng: number
  photo: string
  credit: { author: string; licence: string; source: string }
}

export const GHANA_DESTINATIONS: GhanaDestination[] = [
  {
    id: "kakum",
    name: "Kakum National Park",
    region: "Central Region",
    category: "Nature",
    blurb: "A rope walkway strung 40 m up through the rainforest canopy.",
    lat: 5.3524,
    lng: -1.383,
    photo: "/features/places/kakum.jpg",
    credit: { author: "Chiappinik (it.wikipedia)", licence: "CC BY 2.5 IT", source: "https://commons.wikimedia.org/wiki/File:Kakum.jpg" },
  },
  {
    id: "cape-coast",
    name: "Cape Coast Castle",
    region: "Central Region",
    category: "Heritage",
    blurb: "UNESCO-listed fort and memorial to the transatlantic slave trade.",
    lat: 5.1036,
    lng: -1.2413,
    photo: "/features/places/cape-coast.jpg",
    credit: { author: "Rjruiziii", licence: "CC BY-SA 3.0", source: "https://commons.wikimedia.org/wiki/File:Cape_Coast_Castle,_Cape_Coast,_Ghana.JPG" },
  },
  {
    id: "elmina",
    name: "Elmina Castle",
    region: "Central Region",
    category: "Heritage",
    blurb: "Built by the Portuguese in 1482 — the oldest European building in sub-Saharan Africa.",
    lat: 5.0826,
    lng: -1.3486,
    photo: "/features/places/elmina.jpg",
    credit: { author: "Damien Halleux Radermecker", licence: "CC BY-SA 2.0", source: "https://commons.wikimedia.org/wiki/File:Elmina_Castle_-_Ghana.jpg" },
  },
  {
    id: "wli",
    name: "Wli Waterfalls",
    region: "Volta Region",
    category: "Waterfall",
    blurb: "Ghana's highest waterfall, tumbling out of the Agumatsa hills.",
    lat: 7.1286,
    lng: 0.6012,
    photo: "/features/places/wli.jpg",
    credit: { author: "Stig Nygaard", licence: "CC BY 2.0", source: "https://commons.wikimedia.org/wiki/File:Wli_Lower_Fall-4.jpg" },
  },
  {
    id: "mole",
    name: "Mole National Park",
    region: "Savannah Region",
    category: "Wildlife",
    blurb: "Ghana's largest park — walk within sight of wild elephants.",
    lat: 9.2607,
    lng: -1.8484,
    photo: "/features/places/mole.jpg",
    credit: { author: "Stig Nygaard", licence: "CC BY 2.0", source: "https://commons.wikimedia.org/wiki/File:Elefant_Ghana.jpg" },
  },
  {
    id: "larabanga",
    name: "Larabanga Mosque",
    region: "Savannah Region",
    category: "Heritage",
    blurb: "A centuries-old Sudano-Sahelian mud-and-timber mosque.",
    lat: 9.2186,
    lng: -1.8606,
    photo: "/features/places/larabanga.jpg",
    credit: { author: "Sathyan Velumani", licence: "CC BY-SA 3.0", source: "https://commons.wikimedia.org/wiki/File:Larabanga_Mosque_Ghana.jpg" },
  },
  {
    id: "boti",
    name: "Boti Falls",
    region: "Eastern Region",
    category: "Waterfall",
    blurb: "Twin \"male and female\" falls in the forest near Koforidua.",
    lat: 6.1929,
    lng: -0.2193,
    photo: "/features/places/boti.jpg",
    credit: { author: "magwanwagwan", licence: "CC BY-SA 3.0", source: "https://commons.wikimedia.org/wiki/File:Boti_Falls,_Eastern_Region.JPG" },
  },
  {
    id: "paga",
    name: "Paga Crocodile Pond",
    region: "Upper East Region",
    category: "Wildlife",
    blurb: "Sacred ponds where the crocodiles are famously calm.",
    lat: 10.9869,
    lng: -1.111,
    photo: "/features/places/paga.jpg",
    credit: { author: "Dieu-Donné Gameli", licence: "CC BY-SA 3.0", source: "https://commons.wikimedia.org/wiki/File:Friendly_Paga_Crocodile_I.jpg" },
  },
  {
    id: "nzulezo",
    name: "Nzulezo Stilt Village",
    region: "Western Region",
    category: "Culture",
    blurb: "A whole village built on stilts over Lake Tadane.",
    lat: 5.0006,
    lng: -2.3475,
    photo: "/features/places/nzulezo.jpg",
    credit: { author: "Chiappinik (it.wikipedia)", licence: "CC BY 2.5 IT", source: "https://commons.wikimedia.org/wiki/File:Nzulezo1.jpg" },
  },
  {
    id: "akosombo",
    name: "Akosombo Dam",
    region: "Eastern Region",
    category: "Landmark",
    blurb: "The dam that holds back Lake Volta, the world's largest reservoir by area.",
    lat: 6.2997,
    lng: 0.059,
    photo: "/features/places/akosombo.jpg",
    credit: { author: "SandisterTei", licence: "CC BY-SA 3.0", source: "https://commons.wikimedia.org/wiki/File:Akosombo_Dam_from_the_Volta_Hotel.JPG" },
  },
  {
    id: "aburi",
    name: "Aburi Botanical Gardens",
    region: "Eastern Region",
    category: "Nature",
    blurb: "Shaded avenues of giant trees, laid out in 1890 on the Akuapem hills.",
    lat: 5.8481,
    lng: -0.176,
    photo: "/features/places/aburi.jpg",
    credit: { author: "Lionel Scheepmans", licence: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Aburi_garden_2.jpg" },
  },
  {
    id: "labadi",
    name: "Labadi Beach",
    region: "Greater Accra",
    category: "Beach",
    blurb: "Accra's liveliest beach, best at sunset.",
    lat: 5.5597,
    lng: -0.1497,
    photo: "/features/places/labadi.jpg",
    credit: { author: "Stig Nygaard", licence: "CC BY 2.0", source: "https://commons.wikimedia.org/wiki/File:Solnedgang_p%C3%A5_Labadi_beach.jpg" },
  },
  {
    id: "nkrumah",
    name: "Kwame Nkrumah Memorial Park",
    region: "Greater Accra",
    category: "Heritage",
    blurb: "Where independence was declared in 1957, and Nkrumah now rests.",
    lat: 5.5447,
    lng: -0.2034,
    photo: "/features/places/nkrumah.jpg",
    credit: { author: "Erik B. Anderson", licence: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Kwame_Nkrumah_Memorial_Park.jpg" },
  },
  {
    id: "black-star",
    name: "Black Star Square",
    region: "Greater Accra",
    category: "Landmark",
    blurb: "Independence Square and its Black Star Gate, on the Accra seafront.",
    lat: 5.547,
    lng: -0.1925,
    photo: "/features/places/black-star.jpg",
    credit: { author: "Rjruiziii", licence: "CC BY-SA 3.0", source: "https://commons.wikimedia.org/wiki/File:Independence_Square,_Accra,_Ghana.JPG" },
  },
]
