const LANDING_RIED = { name: "Landeplatz Ried", lat: 47.2105, lon: 9.7214, elev: 650 };
// archive: Holfuy speichert alle 10 min unter <base>YYYY-MM-DD_HH:M1.jpg (Minute schwankt um 1–2)
const CAM_HENSLER = { label: "Startplatz Hensler", img: "https://holfuy.com/en/takeit/cam/s721.jpg", link: "https://holfuy.com/de/camera/721",
  archive: { base: "https://holfuy.com/dynamic/camsave/s721/", from: 7, to: 19 } };
const CAM_HENSLER_REF = { ...CAM_HENSLER, label: "Hensler (Referenz)" };
const HOLFUY_HENSLER = [{ id: 721, label: "Start Hensler" }, { id: 1389, label: "Landeplatz Ried" }];

window.REGION = {
  storeKey: "flugwetter.settings.v2",
  brand: 'Flugwetter <span>Walgau</span>',
  bg: "bg.jpg",
  credits: "Daten: Open-Meteo (ICON-D2, ICON-CH2, ICON-EU, ECMWF, GFS), GeoSphere Austria, Holfuy, walgauwetter.at. Hintergrund: Anton Repponen, „Paraglider in orange clouds“ (CC0, via Wikimedia Commons). Auch: <a href=\"dolomiten/\">Flugwetter Pustertal</a>.",
  stationProvider: "geosphere",
  stationLabel: "GeoSphere",
  areaName: "Walgau",
  foehn: {
    primary:   { label: "Bozen − Innsbruck", a: { lat: 46.50, lon: 11.35 }, b: { lat: 47.26, lon: 11.39 } },
    secondary: { label: "Lugano − Zürich",   a: { lat: 46.00, lon: 8.96 },  b: { lat: 47.46, lon: 8.55 } },
    combine: "max",   // Föhn = Maximum aus Bozen−Innsbruck und Lugano−Zürich (Rätikon/Graubünden)
    posName: "Südföhn", negName: "Nordströmung",
    explain: "Positiv = Südföhn-Tendenz.",
    warnStation: { id: "11304", name: "Brand", sector: [135, 225], dirLabel: "Südwind", note: "Föhn kommt dort zuerst an." },
  },
  SITES: [
  {
    id: "hensler", name: "Hensler", area: "Schnifis", lat: 47.2283, lon: 9.7409, elev: 1305,
    // Sektoren aus der Holfuy-Stationskonfiguration 721 (optimal / fliegbar)
    sector: [160, 240], sectorWide: [110, 270], sectorLabel: "SSO–WSW", sectorSource: "Holfuy",
    landing: LANDING_RIED, holfuy: HOLFUY_HENSLER, cams: [CAM_HENSLER], historyStation: "11099",
    notes: [
      "Walgau-Talwind (W/NW) setzt im Sommer ab ca. 13 Uhr ein: Lee und Rotor am Start möglich.",
      "Bei W-Talwind starke Düse östlich von Schnifis. Wer von Osten kommt, früh umdrehen.",
      "Landen am Sportplatz im Ort ist verboten. Landeplätze: Ried oder Plateau (See nicht überfliegen).",
    ],
    rules: [{ type: "penalty", months: [5, 6, 7, 8], hours: [13, 18], label: "Talwind-Zeit (Mai–Aug)" }],
  },
  {
    id: "bazora", name: "Bazora", area: "Frastanz", lat: 47.1889, lon: 9.6246, elev: 1390,
    // Sektoren aus der Holfuy-Stationskonfiguration 2027 (optimal / fliegbar)
    sector: [300, 360], sectorWide: [280, 20], sectorLabel: "WNW–N", sectorSource: "Holfuy",
    landing: { name: "Landeplatz Galinawald", lat: 47.200, lon: 9.630, elev: 490, approx: true },
    holfuy: [{ id: 2027, label: "Start Bazora" }], historyStation: "11105",
    cams: ["bergstation", "rheintal", "skipiste"].map(c => ({
      label: { bergstation: "Bergstation", rheintal: "Blick Rheintal", skipiste: "Skipiste" }[c],
      img: `https://bazora.walgauwetter.at/webcam/live/bazora-${c}/bazora-${c}.jpg`,
      link: "https://bazora.walgauwetter.at/?page_id=50",
    })),
    notes: [
      "Start nur bei sauberem Anströmen von vorne. Kleiner Skilift und Bäume am Startplatz.",
      "Nicht tief ins Saminatal fliegen: dort gibt es keine Landemöglichkeit.",
      "Bei Gegen- oder Talwind früh Richtung Frastanz fliegen.",
    ],
    rules: [],
  },
  {
    id: "hochgerach", name: "Hochgerach", area: "Hike & Fly", lat: 47.2369, lon: 9.7566, elev: 1984, approx: true,
    sector: [70, 150], sectorLabel: "O–SO", landing: LANDING_RIED, holfuy: HOLFUY_HENSLER, cams: [CAM_HENSLER_REF], historyStation: "11099",
    notes: [
      "Wilder Startplatz ohne Windfahne. Direkt unter dem Gipfel felsig und anspruchsvoll.",
      "Einfachere Variante tiefer Richtung Goppeskopf (ca. 1843 m), flache Wiese unterhalb des Wegs.",
      "Früh Richtung Landewiese fliegen, damit du nicht in der Talwinddüse landest.",
      "Koordinaten sind der Gipfel laut OpenStreetMap, nicht der exakte Startpunkt.",
    ],
    rules: [],
  },
  {
    id: "aelpele", name: "Älpele / Sender", area: "Hike & Fly", lat: 47.2362, lon: 9.7324, elev: 1550, approx: true,
    sector: [135, 225], sectorLabel: "SO–SW", landing: LANDING_RIED, holfuy: HOLFUY_HENSLER, cams: [CAM_HENSLER_REF], historyStation: "11099",
    notes: [
      "Vom Hensler ca. 40 min / 200 Hm. Start direkt unter der Hütte beim Kreuz.",
      "Anfällig für Abwind bei West- und Nordlagen. Kein Start bei Rückenwind.",
      "Kühe und Weidezäune auf der Wiese.",
    ],
    rules: [{ type: "lee", sector: [225, 45], minSpeed: 10, label: "West-/Nordlage in der Höhe (Abwind)" }],
  },
  {
    id: "alpila", name: "Äußere Alpila", area: "Hike & Fly", lat: 47.2299, lon: 9.7487, elev: 1530, approx: true,
    sector: [120, 200], sectorLabel: "SO–S", landing: LANDING_RIED, holfuy: HOLFUY_HENSLER, cams: [CAM_HENSLER_REF], historyStation: "11099",
    notes: [
      "Aufstieg vom Hensler Richtung Äußere Alpila-Hütte. Unebene Wiese mit Stufen, mittel bis steil.",
      "Hohe Bäume rundum: Leeturbulenz bei Westwind.",
      "Saison Herbst bis Frühling. Kein Start, solange Alpvieh oben ist (ca. Juni–September).",
    ],
    rules: [
      { type: "closed", months: [6, 7, 8, 9], label: "Alpvieh-Sperre (Jun–Sep)" },
      { type: "lee", sector: [235, 305], minSpeed: 10, label: "Westwind in der Höhe (Lee durch Bäume)" },
    ],
  },
],

  // GeoSphere TAWES (10-min, FF/FFX in m/s)
  STATIONS: [
  { id: "11304", name: "Brand", elev: 1029, role: "Föhn-Frühwarnung" },
  { id: "11099", name: "Bludenz", elev: 571, role: "Walgau Ost" },
  { id: "11105", name: "Feldkirch", elev: 438, role: "Walgau West" },
  { id: "11104", name: "Fraxern", elev: 807, role: "Rheintal-Seite" },
  { id: "11251", name: "Laterns / Gapfohl", elev: 1559, role: "Höhe (liefert oft keine Daten)" },
],
  LINKS: [
  { t: "FCA Wetterinfo", d: "Linksammlung der Flugschule", u: "https://www.flugschulearlberg.at/wetterinfo" },
  { t: "SHV: 5 Meteogefahren", d: "Entscheidungsstrategie (PDF)", u: "https://www.meteo-shv.ch/assets/media/Downloads/Meteo/Entscheidungsstrategie_Meteo.pdf" },
  { t: "xcTherm", d: "Thermikprognose (Login/Abo)", u: "https://xctherm.com/" },
  { t: "Burnair", d: "Startplatz-Prognose (Abo)", u: "https://map.burnair.cloud/" },
  { t: "DHV-Wetter", d: "Alpenwetter für Piloten", u: "https://www.dhv.de/wetter/dhv-wetter/" },
  { t: "Windy", d: "Großwetterlage, Höhenwind", u: "https://www.windy.com/47.228/9.741?47.0,9.7,8" },
  { t: "Föhndiagramme", d: "windinfo.eu", u: "https://www.windinfo.eu/wettervorhersage/foehndiagramme/" },
  { t: "Föhndiagramm Wetterring", d: "Druckdifferenzen Alpen", u: "https://stations.wetterring.at/wetterkarten/foehndiagramm.png" },
  { t: "Fronten (KNMI)", d: "Bodenwetterkarten", u: "https://www.knmi.nl/nederland-nu/weer/waarschuwingen-en-verwachtingen/weerkaarten" },
  { t: "500 hPa (Wetterzentrale)", d: "Höhenkarte GFS", u: "https://www.wetterzentrale.de/topkarten.php?map=1&model=gfs&var=1&time=0&run=12&lid=OP&h=0&mv=0&tr=6" },
  { t: "GSFV Schnifis", d: "Club: Gelände, Regeln", u: "https://www.abwindzentrierer.at" },
  { t: "GeoSphere Warnungen", d: "Offizielle Unwetterwarnungen", u: "https://warnungen.zamg.at/" },
],
};
