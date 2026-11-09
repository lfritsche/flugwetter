// @ts-nocheck
/* Region Liechtenstein / Drei Schwestern: Rheintal-Seite des Grats (Foppa, Bargella, Sareis) plus Bazora auf der Walgau-Seite.
   Quellen: Gleitschirmclub Vaduz (gleitschirmclubvaduz.li, Koordinaten Foppa/Bargella/Landeplatz), paragliding365 Fluggebiet 6032
   (Sareis, Triesen), SHV-Infotafel Vaduz (2019). Stand Recherche 9.11.2026. Burnair nicht verwendet.
   Startrichtungen Foppa und Bargella sind aus dem Gelände abgeleitet und nicht bestätigt (Quellen nennen keine Grade).
   Zwei Stationsnetze: MeteoSchweiz (Vaduz, Bad Ragaz, Chur) und GeoSphere Austria (Feldkirch, Fraxern, Brand, Laterns). */
import walgau from "./walgau";

const LANDING_VADUZ = { name: "Landeplatz Vaduz", lat: 47.127833, lon: 9.522367, elev: 456 };
const bazora = walgau.SITES.find(s => s.id === "bazora");

const REGION = {
  id: "liechtenstein",
  storeKey: "flugwetter.liechtenstein.v1",
  brand: 'Flugwetter <span>Liechtenstein</span>',
  areaName: "Liechtenstein",
  bg: "/img/dreischwestern.jpg",
  credits: 'Daten: Open-Meteo (ICON-D2, ICON-CH2, ICON-EU, ECMWF, GFS), Quelle: MeteoSchweiz, GeoSphere Austria, Holfuy, walgauwetter.at, Karten: geo.admin.ch (BAFU, BAZL), © OpenStreetMap-Mitwirkende, <a href="https://www.slf.ch" target="_blank" rel="noopener">WSL-Institut für Schnee- und Lawinenforschung SLF</a>. Startplätze: <a href="https://www.gleitschirmclubvaduz.li/fluggebiet/" target="_blank" rel="noopener">Gleitschirmclub Vaduz</a>, paragliding365. Hintergrund: <a href="https://commons.wikimedia.org/wiki/File:Drei_Schwestern_von_%C3%9Cbersaxen.jpg" target="_blank" rel="noopener">Reinhard Müller, CC BY-SA 3.0 AT, via Wikimedia Commons</a>.',
  stationProvider: "meteoswiss",
  stationLabel: "MeteoSchweiz und GeoSphere",
  foehn: {
    // Im Rheintal wirkt vor allem der Schweizer Druckunterschied; zur Sicherheit zählt das Maximum mit Bozen − Innsbruck
    primary:   { label: "Lugano − Zürich",   a: { lat: 46.00, lon: 8.96 },  b: { lat: 47.46, lon: 8.55 } },
    secondary: { label: "Bozen − Innsbruck", a: { lat: 46.50, lon: 11.35 }, b: { lat: 47.26, lon: 11.39 } },
    combine: "max",
    mode: "sued", sector: [150, 240],
    posName: "Südföhn", negName: "Nordströmung",
    explain: "Positiv = Südüberdruck. Bei Föhn gilt in Liechtenstein Flugverbot (Gleitschirmclub Vaduz). Die Föhnregel ist für diese Region nicht rückgetestet.",
    warnStation: { id: "VAD", name: "Vaduz", sector: [140, 220], dirLabel: "Südwind", note: "Föhn erreicht Vaduz oft schon, wenn Feldkirch noch ruhig ist." },
    live: [
      { type: "gust", kind: "tal", src: "meteoswiss", station: "VAD", name: "Vaduz", sector: [140, 220], gust: [25, 25, 35, 40] },
      { type: "gust", kind: "tal", src: "geosphere", station: "11304", name: "Brand", sector: [150, 240], gust: [25, 25, 35, 40] },
      { type: "gust", kind: "kamm", src: "slf", station: "MLB1", name: "Spitz (2186 m)", sector: [150, 240], gust: [50, 50, 60, 80] },
      { type: "split", src: "meteoswiss", a: "CHU", b: "RAG", nameA: "Chur", nameB: "Bad Ragaz", sector: [120, 220], rhMax: 55, dT: 3 },
    ],
  },
  fogCheck: { low: ["VAD"], high: ["11251"] },
  // Gemessene Sonne auf Starthöhe hebt die Wolkenbasis-Warnung auf (Laterns, Brand; in Liechtenstein gibt es keine offene Höhenstation)
  sunStations: ["11251", "11304"],
  zones: [
    { id: "ch.bafu.wrz-wildruhezonen_portal", label: "Wildruhezonen" },
    { id: "ch.bafu.wrz-jagdbanngebiete_select", label: "Wildtierschutzgebiete" },
    { id: "ch.bafu.schutzgebiete-aulav_jagdbanngebiete", label: "AuLaV Jagdbann" },
    { id: "ch.bafu.schutzgebiete-aulav_uebrige", label: "AuLaV übrige" },
    { id: "ch.bazl.luftraeume-kontrollzonen", label: "CTR" },
    { id: "ch.bazl.luftraeume-nahkontrollbezirke", label: "TMA" },
  ],
  SITES: [
    {
      id: "bargella", name: "Bargella", area: "Gaflei · Triesenberg", lat: 47.141483, lon: 9.548917, elev: 1654,
      sector: [230, 290], sectorWide: [200, 310], sectorLabel: "SW–WNW (abgeleitet)", sectorSource: "aus dem Gelände abgeleitet, unbestätigt",
      landing: LANDING_VADUZ, historyStation: "VAD", measureStation: "VAD", measureRole: "landing", cams: [],
      notes: [
        "Bevorzugter Start bei Inversion und für Strecke (Gleitschirmclub Vaduz). Ca. 30 min Fussweg ab Gaflei, Bus 22.",
        "Im Sommer erzeugt der Talwind ein grosses Leegebiet direkt am Start, Rotor auch bei ruhig wirkender Station.",
        "Bei Bise Abwind oder Nordwind, sehr turbulent. Bei Föhn Flugverbot.",
        "Startrichtung aus dem Gelände abgeleitet: vor dem ersten Flug beim Club bestätigen lassen.",
        "Landeplatz Vaduz: CHF 5 pro Tag (Twint oder Landekasse), Mitglieder GCV, Pizol und Werdenberg frei. Bei extremem Talwind Ausweichplatz Triesen.",
      ],
      rules: [{ type: "warnDates", ranges: [["01-01", "03-31"]], label: "Wildschutzzone 1.1.–31.3. nicht überfliegen" }],
    },
    {
      id: "foppa", name: "Foppa", area: "Masescha · Triesenberg", lat: 47.137, lon: 9.542983, elev: 1355,
      sector: [230, 290], sectorWide: [200, 310], sectorLabel: "SW–WNW (abgeleitet)", sectorSource: "aus dem Gelände abgeleitet, unbestätigt",
      landing: LANDING_VADUZ, historyStation: "VAD", measureStation: "VAD", measureRole: "landing", cams: [],
      notes: [
        "Unterer Startplatz an der Strasse Masescha–Gaflei, steiler Wiesenhang: Start gelingt auch bei schwachem Aufwind.",
        "Bäume und Geländeübergang erzeugen Lee, der Rotor kann sehr heftig sein (Gleitschirmclub Vaduz).",
        "Startrichtung aus dem Gelände abgeleitet: vor dem ersten Flug beim Club bestätigen lassen.",
        "Landeplatz Vaduz: CHF 5 pro Tag, Ausweichplatz Triesen bei extremem Talwind.",
      ],
      rules: [{ type: "warnDates", ranges: [["01-01", "03-31"]], label: "Wildschutzzone 1.1.–31.3. nicht überfliegen" }],
    },
    {
      id: "sareis", name: "Sareis", area: "Malbun · Sesselbahn", lat: 47.102722, lon: 9.620278, elev: 2000,
      sector: [270, 45], sectorLabel: "W · N (mehrere Starts)",
      guidedOnly: "Schwieriger Start (paragliding365), Landung Vaduz nur mit rund 700 m Überhöhung",
      launches: [
        { name: "West (Alpwiese)", short: "W", sector: [250, 300], sectorWide: [230, 320], sectorLabel: "W (Alpwiese Richtung Malbun)" },
        { name: "Nord (Naturstart)", short: "N", sector: [320, 30], sectorWide: [300, 45], sectorLabel: "NW–NO, ca. 25 min zu Fuss" },
      ],
      landing: { name: "Malbun (inoffiziell)", lat: 47.1015, lon: 9.6085, elev: 1600, approx: true },
      historyStation: "VAD", cams: [],
      notes: [
        "Sesselbahn ab Malbun mit Transportschalen, nur mit gültiger Lizenz und Versicherungsnachweis. Saison und Zeiten vorher prüfen.",
        "Wer die Thermik verpasst, landet in Malbun. Für Vaduz muss Sareis um rund 700 m überhöht werden.",
        "Malbun ist kein offizieller Landeplatz; Lage hier ungefähr. Offiziell sind nur Vaduz und Triesen.",
        "Bei Föhn Flugverbot. Bei Nord- und Ostwind liegt das Rheintal-Gelände im Lee.",
      ],
      rules: [],
    },
    { ...bazora, area: "Frastanz (AT)" },
  ],
  STATIONS: [
    { id: "VAD", lat: 47.127472, lon: 9.517578, name: "Vaduz", elev: 457, role: "Landeplatz, Föhn im Rheintal" },
    { id: "RAG", lat: 47.0166, lon: 9.5026, name: "Bad Ragaz", elev: 497, role: "Rheintal, Kaltluftsee" },
    { id: "CHU", lat: 46.8706, lon: 9.5308, name: "Chur", elev: 556, role: "Föhn-Warnung Rheintal" },
    { id: "11105", provider: "geosphere", lat: 47.2711, lon: 9.6097, name: "Feldkirch", elev: 438, role: "Landewind Bazora" },
    { id: "11104", provider: "geosphere", lat: 47.3142, lon: 9.6744, name: "Fraxern", elev: 807, role: "Rheintal-Seite" },
    { id: "11304", provider: "geosphere", lat: 47.1031, lon: 9.7383, name: "Brand", elev: 1029, role: "Föhn-Frühwarnung" },
    { id: "11251", provider: "geosphere", lat: 47.275, lon: 9.76, name: "Laterns / Gapfohl", elev: 1559, role: "Höhe (liefert oft keine Daten)" },
  ],
  LINKS: [
    { t: "Gleitschirmclub Vaduz", d: "Fluggebiet, Regeln, Gebühren", u: "https://www.gleitschirmclubvaduz.li/fluggebiet/" },
    { t: "Club-Wetterseite", d: "Windstationen, Föhn, Webcams", u: "https://www.gleitschirmclubvaduz.li/wetter/" },
    { t: "Webcams Liechtenstein", d: "Malbun, Sareis, Steg (tourismus.li)", u: "https://tourismus.li/webcams.html" },
    { t: "Sperrzonen", d: "map.geo.admin.ch", u: "https://map.geo.admin.ch/?topic=bafu&layers=ch.bafu.wrz-wildruhezonen_portal" },
    { t: "SHV: 5 Meteogefahren", d: "Entscheidungsstrategie (PDF)", u: "https://www.meteo-shv.ch/assets/media/Downloads/Meteo/Entscheidungsstrategie_Meteo.pdf" },
    { t: "DHV-Wetter", d: "Alpenwetter für Piloten", u: "https://www.dhv.de/wetter/dhv-wetter/" },
    { t: "Windy", d: "Großwetterlage, Höhenwind", u: "https://www.windy.com/47.14/9.55?47.1,9.6,10" },
    { t: "Föhndiagramme", d: "windinfo.eu", u: "https://www.windinfo.eu/wettervorhersage/foehndiagramme/" },
  ],
};
export default REGION;
