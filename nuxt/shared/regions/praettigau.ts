// @ts-nocheck
/* Region Prättigau (Graubünden) mit Fanas, Hike-&-Fly-Starts und Pizol als Umgebung.
   Lage und Höhen: DHV, paragliding365, Paraworld, SHV-Tafel Pizol, swisstopo-Kontrolle, Pilotenangaben (Nov. 2026).
   approx: true = Lage nicht vermessen oder Landeplatz nicht bestätigt. */
const LANDING_GRUESCH = { name: "Landeplatz Grüsch (Feld)", lat: 46.9751, lon: 9.6557, elev: 610 };
const LANDING_SCHIERS = { name: "Landeplatz Schiers", lat: 46.9653, lon: 9.6940, elev: 654 };
const LANDING_WANGS = { name: "Landeplatz Wangs", lat: 47.0386, lon: 9.4311, elev: 485 };

const REGION = {
  id: "praettigau",
  storeKey: "flugwetter.praettigau.v1",
  brand: 'Flugwetter <span>Prättigau</span>',
  areaName: "Prättigau",
  bg: "/img/praettigau.jpg",
  credits: 'Daten: Open-Meteo (ICON-D2, ICON-CH2, ICON-EU, ECMWF, GFS), Quelle: MeteoSchweiz, Holfuy, Karten: geo.admin.ch (BAFU, BAZL), © OpenStreetMap-Mitwirkende, <a href="https://www.slf.ch" target="_blank" rel="noopener">WSL-Institut für Schnee- und Lawinenforschung SLF</a>. Hintergrund: <a href="https://commons.wikimedia.org/wiki/File:Blick_Richtung_Seewis_-_panoramio.jpg" target="_blank" rel="noopener">qwesy qwesy, CC BY 3.0, via Wikimedia Commons</a>.',
  stationProvider: "meteoswiss",
  stationLabel: "MeteoSchweiz",
  foehn: {
    primary:   { label: "Lugano − Zürich",   a: { lat: 46.00, lon: 8.96 },  b: { lat: 47.46, lon: 8.55 } },
    secondary: { label: "Bozen − Innsbruck", a: { lat: 46.50, lon: 11.35 }, b: { lat: 47.26, lon: 11.39 } },
    combine: "max",
    mode: "sued", sector: [150, 240],
    posName: "Südföhn", negName: "Nordströmung",
    explain: "Positiv = Südüberdruck. Im Prättigau gibt es keine Föhn-Messstation, Chur und die Kammstationen dienen als Ersatz.",
    warnStation: { id: "CHU", name: "Chur", sector: [150, 210], dirLabel: "Südwind", note: "Chur ist bei Föhn oft warm und trocken, auch wenn das Tal nebenan noch kalt ist." },
    live: [
      { type: "gust", kind: "kamm", src: "slf", station: "MLB1", name: "Spitz (2186 m)", sector: [150, 240], gust: [50, 50, 60, 80] },
      { type: "gust", kind: "kamm", src: "meteoswiss", station: "WFJ", name: "Weissfluhjoch (2691 m)", sector: [140, 240], gust: [50, 50, 60, 80] },
      { type: "gust", kind: "kamm", src: "meteoswiss", station: "PMA", name: "Piz Martegnas (2668 m)", sector: [140, 240], gust: [50, 50, 60, 80] },
      { type: "split", src: "meteoswiss", a: "CHU", b: "RAG", nameA: "Chur", nameB: "Bad Ragaz", sector: [120, 220], rhMax: 55, dT: 3 },
    ],
  },
  fogCheck: { low: ["RAG"], high: ["WFJ"] },
  zones: [
    { id: "ch.bafu.wrz-wildruhezonen_portal", label: "Wildruhezonen" },
    { id: "ch.bafu.wrz-jagdbanngebiete_select", label: "Wildtierschutzgebiete" },
    { id: "ch.bafu.schutzgebiete-aulav_auen", label: "AuLaV Auen" },
    { id: "ch.bafu.schutzgebiete-aulav_jagdbanngebiete", label: "AuLaV Jagdbann" },
    { id: "ch.bafu.schutzgebiete-aulav_uebrige", label: "AuLaV übrige" },
    { id: "ch.bazl.luftraeume-kontrollzonen", label: "CTR" },
    { id: "ch.bazl.luftraeume-nahkontrollbezirke", label: "TMA" },
  ],
  SITES: [
    {
      id: "fanas", name: "Fanas", area: "Eggli · Höreli", lat: 46.9985, lon: 9.6906, elev: 1684,
      sector: [135, 180], sectorLabel: "SO–S · N (mehrere Starts)",
      launches: [
        { lat: 46.9985, lon: 9.6906, elev: 1684, name: "Eggli", short: "E", sector: [135, 180], sectorWide: [120, 225], sectorLabel: "SO–S (SW schwach)", calmOk: true },
        { lat: 47.0005, lon: 9.6848, elev: 1779, name: "Höreli Süd", short: "HS", sector: [135, 180], sectorWide: [120, 225], sectorLabel: "SO–S (SW schwach)" },
        { lat: 47.0007, lon: 9.6839, elev: 1787, name: "Höreli Nord", short: "HN", sector: [315, 45], sectorLabel: "NW–NO, nicht bei starkem Wind, gleich links abdrehen", capYellow: true },
      ],
      landing: LANDING_GRUESCH, historyStation: "SRS", measureStation: "SRS", measureRole: "landing",
      holfuy: [{ id: 1448, label: "Fanas-Höreli (1798 m)" }], cams: [],
      liveLink: { t: "Webcam Fanas (bergfex)", u: "https://www.bergfex.ch/sommer/fanas/webcams/c6204/" },
      notes: [
        "Seilbahn: 8:00–11:45 und 13:00–17:15 Uhr, keine Mittagsfahrt. Reservation nur per Telefon 081 325 19 39. Vor dem Ausflug anrufen, Betrieb für 2026/27 nicht bestätigt.",
        "Eggli: Laut APPI gross und leicht. Lage 1684 m ist publiziert, der Gleitschirmstart kann laut DHV bis 200 m höher liegen: Infotafel und Schule fragen. Höreli ca. 20 min zu Fuss ab Eggli.",
        "Höreli Nord: Direkt in Startrichtung liegt ein Wildschutzgebiet. Kurz nach dem Start links abdrehen.",
        "Wildruhezone Eggwald 1.2.–15.4.: Zutritt nur auf dem eingezeichneten Weg, wirkt wie ein Start- und Landeverbot abseits davon.",
        "An thermischen Tagen nachmittags Talwind am Start und starker Wind in Grüsch: für Einsteiger Vormittag oder Abend.",
        "Landungen: Grüsch Feld (Talwind kann stark sein), Grüsch Morgen 46.9788/9.6565 (bei Talwind Turbulenz durch Gebäude), Schiers (westlich des Windsacks anfliegen, Hochspannungsleitung), Fanas 46.9870/9.6611 am Hang, Nutzung vor Ort klären.",
        "Bei Föhn nicht fliegen.",
      ],
      rules: [
        { type: "lift", hours: [8, 17], label: "Seilbahn Fanas (bis 17:15 Uhr)" },
        { type: "penalty", months: [4, 5, 6, 7, 8, 9], hours: [13, 18], label: "Talwind-Zeit (Sommer)" },
        { type: "warnDates", ranges: [["02-01", "04-15"]], label: "Wildruhezone Eggwald: nur auf dem Weg" },
      ],
    },
    {
      id: "aldur", name: "Aldur", area: "Fanas · mit Auto", lat: 46.9965, lon: 9.6669, elev: 1368,
      sector: [180, 225], sectorWide: [135, 250], sectorLabel: "S–SW, SO nur vom oberen Teil",
      guidedOnly: "Zufahrt und Erlaubnis ungeklärt",
      landing: LANDING_GRUESCH, historyStation: "SRS", measureStation: "SRS", measureRole: "landing",
      holfuy: [{ id: 1448, label: "Fanas-Höreli (1798 m)" }], cams: [],
      notes: [
        "Mit dem Auto erreichbar, Ausweiche wenn die Bahn nicht fährt. Fussweg auf der Südostseite des Felds nutzen.",
        "Saison Frühling bis Herbst. Zufahrt und Erlaubnis vor Ort klären.",
        "Die Windmessung am Start fehlt. Holfuy Höreli liegt 400 m höher, nur als Anhaltspunkt.",
      ],
      rules: [{ type: "warnDates", ranges: [["12-01", "12-31"], ["01-01", "02-28"]], label: "Ausserhalb der Saison" }],
    },
    {
      id: "stelserberg", name: "Stelserberg", area: "Schiers", lat: 46.9620, lon: 9.7242, elev: 1464, approx: true,
      sector: [135, 225], sectorLabel: "SO–SW · W · NW (mehrere Starts)",
      guidedOnly: "Landeplatz nicht bestätigt",
      launches: [
        { lat: 46.962, lon: 9.7242, elev: 1464, name: "Mottis", short: "M", sector: [135, 225], sectorLabel: "SO–SW", calmOk: true },
        { lat: 46.9654, lon: 9.7289, elev: 1528, name: "West (1528 m)", short: "W", sector: [250, 290], sectorLabel: "W" },
        { lat: 46.9673, lon: 9.7457, elev: 1682, name: "Abend (1682 m)", short: "A", sector: [295, 335], sectorLabel: "NW, abends" },
      ],
      landing: { ...LANDING_SCHIERS, approx: true }, historyStation: "SRS", measureStation: "SRS", measureRole: "landing",
      cams: [],
      notes: [
        "Keine Infotafel, keine Saisonangaben und kein bestätigter Landeplatz gefunden. Schiers ist nur eine Annahme für die Windprognose: vor dem Flug klären.",
        "Lage von Mottis 46.9620/9.7242, West 46.9654/9.7289, Abend 46.9673/9.7457.",
      ],
      rules: [],
    },
    {
      id: "vilan", name: "Vilan", area: "Hike & Fly · nur mit Einweisung", lat: 47.01161, lon: 9.60356, elev: 2350,
      sector: [157, 202], sectorLabel: "S · N · W · SW (6 Starts)",
      guidedOnly: "Nur mit Einweisung",
      launches: [
        { lat: 47.01161, lon: 9.60356, elev: 2350, name: "Nebengipfel Süd (2350 m)", short: "S", sector: [157, 202], sectorWide: [135, 225], sectorLabel: "SO–SW", calmOk: true },
        { lat: 47.0126, lon: 9.6031, elev: 2375, name: "Gipfel Nord (2375 m)", short: "N", sector: [320, 45], sectorLabel: "N, klein, mittelschwer", capYellow: true },
        { lat: 47.01717, lon: 9.59523, elev: 2170, name: "Vilan West (2170 m)", short: "W", sector: [247, 292], sectorWide: [225, 315], sectorLabel: "SW–NW, Rheintalseite", capYellow: true },
        { lat: 47.01361, lon: 9.59311, elev: 1920, name: "Hang 1920 m", short: "19", sector: [202, 247], sectorLabel: "SW, Angaben widersprüchlich", capYellow: true },
        { lat: 47.01856, lon: 9.59331, elev: 2050, name: "Ortasee (2050 m)", short: "O", sector: [202, 247], sectorLabel: "SW, Schutzgebiet klären", capYellow: true },
        { lat: 47.01173, lon: 9.59039, elev: 1794, name: "Älpli (ca. 1794 m)", short: "Ä", sector: [180, 270], sectorLabel: "S–W, Rheintalseite", capYellow: true },
      ],
      landing: { ...LANDING_GRUESCH, approx: true }, historyStation: "SRS", measureStation: "SRS", measureRole: "landing",
      holfuy: [{ id: 1941, label: "Vilan (2376 m)" }], cams: [],
      liveLink: { t: "Älplibahn Malans", u: "https://www.aelplibahn.ch" },
      notes: [
        "Komplexes Gelände: Bei kräftiger Südströmung sind Lee, Turbulenz und Böen besonders relevant. Der Rheintal-Windkorridor kann stark sein.",
        "Zugang: Älplibahn ab Malans (Reservation, Telefon 081 322 47 64, Saison laut Quelle bis 15.11.), ab Bergstation ca. 1–2 h und rund 600 Hm zum Gipfel. Ab Seewis ca. 4 h.",
        "Grüsch ist als Landung nur aus einer Tourenplanung bekannt. Landquart ohne Beleg: Landewiese vorher klären. Der alte Platz in Malans ist laut DHV wegen Plantage und Kabel womöglich nicht mehr nutzbar.",
        "Ortasee: rund 120 m bis zu einem AuLaV-Gebiet (Start- und Landeverbot möglich) und 200 m bis zum Flachmoor. Ohne Klärung vor Ort nicht nutzen.",
        "Rossboden (H&F, ca. 1079 m) liegt weiter unten am Hang, Koordinaten fehlen noch. Lee-Zone (Talwind) oberhalb Seewis beachten.",
      ],
      rules: [],
    },
    {
      id: "sassauna", name: "Sassauna", area: "Hike & Fly · nur mit Einweisung", lat: 47.01177, lon: 9.69765, elev: 2294,
      sector: [202, 247], sectorWide: [135, 270], sectorLabel: "SW (S, grob)",
      guidedOnly: "Nur mit Einweisung",
      landing: { ...LANDING_GRUESCH, approx: true }, historyStation: "SRS", measureStation: "SRS", measureRole: "landing",
      holfuy: [{ id: 1448, label: "Fanas-Höreli (1798 m)" }], cams: [],
      notes: [
        "Publiziert: 2294 m, Wind SW. Fanas-Tafel und Paraworld prüfen, Aufstieg steile Südflanke.",
        "Ab Eggli ca. 600 Hm, 1,5–2 h (geschätzt). Ab Fanas ca. 1400 Hm, rund 4 h.",
        "Für Einsteiger nur mit Einweisung durch die Schule (Flugcenter Grischa).",
      ],
      rules: [],
    },
    {
      id: "pizol", name: "Pizol", area: "Umgebung · Bad Ragaz", lat: 46.9953, lon: 9.4143, elev: 1750,
      sector: [315, 45], sectorLabel: "N · Laufböden auch S",
      launches: [
        { lat: 46.9953, lon: 9.4143, elev: 1750, name: "Gaffia (1750 m)", short: "G", sector: [315, 45], sectorWide: [290, 70], sectorLabel: "N, einfach", calmOk: true },
        { lat: 47.0057, lon: 9.4222, elev: 1470, name: "Furt (1470 m)", short: "F", sector: [315, 45], sectorWide: [290, 70], sectorLabel: "N, einfach" },
        { lat: 46.9812, lon: 9.4181, elev: 2200, name: "Pizolhütte (2200 m)", short: "P", sector: [315, 45], sectorLabel: "N, mittel", capYellow: true },
        { lat: 46.9794, lon: 9.4363, elev: 2220, name: "Laufböden Nord (2220 m)", short: "LN", sector: [315, 45], sectorLabel: "N, mittel", capYellow: true },
        { lat: 46.9794, lon: 9.4363, elev: 2220, name: "Laufböden Süd (2220 m)", short: "LS", sector: [135, 180], sectorLabel: "SO–S, nicht bei Südföhn", capYellow: true },
      ],
      landing: LANDING_WANGS, historyStation: "RAG", measureStation: "RAG", measureRole: "landing", cams: [],
      liveLink: { t: "Webcam Pizol", u: "https://pizol.com/en/current/webcam/" },
      notes: [
        "Winter: Bahn täglich 27.11.2026–4.4.2027, Gondel 8:15–16:45, Sessellifte 8:30–16:00. Starts auf der Piste im Winter meiden: dann nur Pizolhütte und Laufböden.",
        "Landeverbot in der roten Zone am Flugplatz Bad Ragaz. Talquerung nur ausserhalb oder über 1100 m. Obersäss sehr nah an der Zone.",
        "Graue Hörner nie hangnah befliegen. Gebiet A von Mai bis Bahnbetrieb nicht hangnah.",
        "Bei Bise in Wangs starke Turbulenz. Notlandeplatz südöstlich des Golfplatzes Bad Ragaz.",
      ],
      rules: [
        { type: "closedDates", ranges: [["10-19", "11-26"]], label: "Pizolbahn ausser Betrieb" },
        { type: "warnDates", ranges: [["11-27", "12-31"], ["01-01", "04-04"]], label: "Winter: nur Pizolhütte und Laufböden, nicht auf der Piste" },
        { type: "lift", hours: [9, 15], label: "Pizolbahn (bis ca. 16 Uhr)" },
      ],
    },
  ],
  // MeteoSchweiz Open Data (10-min, km/h)
  // Gemessene Sonne auf Starthöhe hebt die Wolkenbasis-Warnung auf (Davos und Weissfluhjoch)
  sunStations: ["DAV", "WFJ"],
  STATIONS: [
    { id: "SRS", lat: 46.9755, lon: 9.6681, name: "Schiers", elev: 626, role: "Prättigau, Landewind" },
    { id: "CHU", lat: 46.8706, lon: 9.5308, name: "Chur", elev: 556, role: "Föhn-Warnung Rheintal" },
    { id: "RAG", lat: 47.0166, lon: 9.5026, name: "Bad Ragaz", elev: 497, role: "Rheintal, Kaltluftsee" },
    { id: "VAD", lat: 47.1275, lon: 9.5176, name: "Vaduz", elev: 457, role: "Föhn-Reichweite" },
    { id: "DAV", lat: 46.813, lon: 9.8436, name: "Davos", elev: 1594, role: "Oberes Tal" },
    { id: "WFJ", lat: 46.8333, lon: 9.8064, name: "Weissfluhjoch", elev: 2691, role: "Höhenwind" },
    { id: "PMA", lat: 46.5772, lon: 9.5295, name: "Piz Martegnas", elev: 2668, role: "Kamm Süd" },
  ],
  LINKS: [
    { t: "Holfuy Vilan", d: "Wind am Gipfel", u: "https://holfuy.com/de/weather/1941" },
    { t: "Holfuy Madrisa", d: "Schaffürggli", u: "https://holfuy.com/de/weather/1668" },
    { t: "Föhndiagramm Ost-CH/FL", d: "wetterring.li", u: "https://www.wetterring.li/profiwetter/foehndiagramm-fl-ost-ch" },
    { t: "SHV-App Wetter", d: "Föhnsattel, Höhenwind", u: "https://www.shv-fsvl.ch/" },
    { t: "Wildruhezonen / Karten", d: "map.geo.admin.ch", u: "https://map.geo.admin.ch" },
    { t: "GC Grischa", d: "Club Prättigau", u: "https://gc-grischa.ch/" },
    { t: "Flugcenter Grischa", d: "Schule, 079 336 19 19", u: "https://www.graubuenden.ch/de/ausflugsziele/gleitschirm-fluggebiet-startplatz-fanas" },
    { t: "SHV-Tafel Pizol", d: "PDF", u: "https://www.shv-fsvl.ch/fileadmin/files/redakteure/Allgemein/Sicherheit/SHVInfotafeln/Pizol.pdf" },
    { t: "Älplibahn Malans", d: "Bergbahn Vilan", u: "https://www.aelplibahn.ch" },
    { t: "SHV: Föhnlagen", d: "Schwer erkennbare Föhnlagen (PDF)", u: "https://shv-fsvl.ch/fileadmin/files/redakteure/Allgemein/Sicherheit/Sicherheit/Schwer_erkennbare_Foehnlagen.pdf" },
    { t: "Burnair", d: "Startplatz-Prognose (Abo)", u: "https://map.burnair.cloud/" },
    { t: "Windy", d: "Grosswetterlage, Höhenwind", u: "https://www.windy.com/46.98/9.67?46.8,9.6,9" },
  ],
};
export default REGION;
