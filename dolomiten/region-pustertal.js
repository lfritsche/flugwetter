/* Region Pustertal / Ahrntal / Gsiesertal (Südtirol).
   Quellen: ahrntal.com Flugordnung, paragliding365, paraglidingearth, Tourismusvereine (Stand Okt. 2026).
   Koordinaten mit approx: true sind geschätzt. */
const LANDING_SAND = { name: "Landeplatz Sand in Taufers (Sportzone)", lat: 46.9125, lon: 11.9583, elev: 860 };
const fw = (id, label) => ({ label, img: `https://www.foto-webcam.eu/webcam/${id}/current/1200.jpg`, link: `https://www.foto-webcam.eu/webcam/${id}/`,
  archive: { type: "fotowebcam", id, from: 7, to: 19 } });

window.REGION = {
  storeKey: "flugwetter.pustertal.v1",
  brand: 'Flugwetter <span>Pustertal</span>',
  areaName: "Pustertal",
  bg: "bg.jpg",
  credits: 'Daten: Open-Meteo (ICON-D2, ICON-CH2, ICON-EU, ECMWF, GFS), Landeswetterdienst Südtirol, foto-webcam.eu, Panomax, Kronplatz. Hintergrund: Friedrich Haag, „Two paragliders in the Dolomites“ (<a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>, via Wikimedia Commons). Auch: <a href="../">Flugwetter Walgau</a>.',
  stationProvider: "suedtirol",
  stationLabel: "Landeswetterdienst Südtirol",
  foehn: {
    // Positiv = Nordföhn. Das Föhndiagramm des Landeswetterdienstes zeigt Bozen − Innsbruck, dort ist Nordföhn negativ.
    primary:   { label: "Innsbruck − Bozen", a: { lat: 47.26, lon: 11.39 }, b: { lat: 46.50, lon: 11.35 } },
    secondary: { label: "Bozen − Innsbruck (Südföhn)", a: { lat: 46.50, lon: 11.35 }, b: { lat: 47.26, lon: 11.39 } },
    explain: "Positiv = Nordföhn, der Hauptfeind im Pustertal. Achtung: Das Föhndiagramm des Landeswetterdienstes zeigt Bozen − Innsbruck, dort ist Nordföhn negativ.",
    warnStation: { id: "45100WS", name: "Regelspitze (Gsies, 2747 m)", sector: [315, 45], dirLabel: "Nordwind", note: "Nordföhn zeigt sich am Hauptkamm zuerst." },
  },
  SITES: [
    {
      id: "ahornach", name: "Ahornach", area: "Sand in Taufers", lat: 46.9262, lon: 11.9678, elev: 1429,
      sector: [195, 245], sectorWide: [165, 260], sectorLabel: "S–SW",
      landing: LANDING_SAND, historyStation: "56900MS", measureStation: "56900MS",
      cams: [fw("amonti", "Mühlen in Taufers")],
      liveLink: { t: "Wetterstation Landeplatz", u: "http://stazioni.soluzionimeteo.it/tures/index.php" },
      notes: [
        "FlyCard Pflicht für Start und Landung: 5 € Tag, 10 € 3 Tage, 15 € Woche (tickets.ahrntal.com oder Tourismusbüro Sand). Wird kontrolliert.",
        "Am Start im umzäunten Bereich bleiben. Volte: rechts bei Südwind, links bei Nordwind. Kein Groundhandling am Landeplatz.",
        "Nach dem Start nicht nach links Richtung Rein: dort keine Landeplätze.",
        "Bei Nordwind oder Nordföhn nicht fliegbar. Frühjahrsthermik kann ruppig sein.",
        "Anfahrt per Straße, ganzjährig. Ca. 40 min von Gsies.",
      ],
      rules: [{ type: "lee", sector: [315, 45], minSpeed: 12, label: "Nordströmung in der Höhe (Lee/Föhn)" }],
    },
    {
      id: "kronplatz", name: "Kronplatz", area: "Reischach", lat: 46.7396, lon: 11.9589, elev: 2260,
      // mehrere Startplätze am Gipfel: Nordseite Richtung Reischach optimal, andere Seiten mit Ortskenntnis
      sector: [290, 70], sectorWide: [0, 360], sectorLabel: "NW–NO (Gipfel, alle Seiten)",
      landing: { name: "Landeplatz Reischach", lat: 46.7735, lon: 11.9380, elev: 950 }, historyStation: "59700MS",
      cams: [fw("kronplatz", "Kronplatz Gipfel"), { label: "Kronplatz Gipfel (offiziell)", img: "https://webcams.kronplatz.com/webcam/kronplatz/150/webcam15.jpg", link: "https://www.kronplatz.com/de/der-kronplatz/webcams" }],
      liveLink: { t: "Wetter Kronplatz", u: "https://www.kronplatz.com/de/der-kronplatz/wetter" },
      notes: [
        "Gondel Kronplatz 2000 ab Reischach, 9–17 Uhr, laut Tourismusseiten bis 8.11. (beim Betreiber prüfen). Wintersaison ab ca. 28.11. Bike/Para-Ticket ca. 5 €.",
        "Nordwind/kein Wind: Start an der großen Antenne bei der Kapelle. Westwind: hinter der Finanzwache, Soaring an der Kante möglich.",
        "Seilbahnen auf allen Seiten (Reischach, Olang, Piz de Plaies). Viel Tandembetrieb.",
        "Talwind in Reischach ab Mittag zunehmend: früh landen. Nach Süden kaum Landemöglichkeiten.",
        "Im Winter nicht von der Piste nach Osten starten. Ca. 30 min von Gsies.",
      ],
      rules: [{ type: "closedDates", ranges: [["11-09", "11-27"]], label: "Gondel außer Betrieb (zwischen den Saisonen)" }],
    },
    {
      id: "gsies", name: "Spielalm / Uwaldalm", area: "Gsiesertal", lat: 46.8573, lon: 12.2670, elev: 2200,
      sector: [160, 200], sectorWide: [135, 225], sectorLabel: "S (SO–SW)",
      landing: { name: "Landeplatz Bruggen", lat: 46.8422, lon: 12.2480, elev: 1460 }, historyStation: "44500MS", measureStation: "45200SF",
      cams: [fw("taisten", "Taisten")],
      liveLink: { t: "Webcams Gsies", u: "https://webcam.valcasies.com" },
      notes: [
        "Sehr Nordföhn-empfindlich: Prallhang am Talschluss. Bei Nordwind in der Höhe nicht fliegen.",
        "Fahrverbot zur Uwaldalm. Zu Fuß ab Parkplatz Talschlusshütte (ca. 1,5 h, geschätzt) oder Clubbus Para Alpin Gsies nach Absprache.",
        "Spielalm: großes Plateau, sehr leichter Start, Toplanden möglich. Uwaldalm ca. 2000–2070 m.",
        "Landeplatz Bruggen kann je nach Mahd wechseln: vor Ort fragen (Treffpunkt Talschlusshütte).",
        "Guide/Tandem vor Ort: Manuel Hofmann („fliagmo“).",
      ],
      rules: [{ type: "lee", sector: [315, 45], minSpeed: 10, label: "Nordströmung in der Höhe (Nordföhn-Gefahr)" }],
    },
    {
      id: "pfalzen", name: "Plata", area: "Pfalzen", lat: 46.8289, lon: 11.8765, elev: 1590,
      sector: [160, 200], sectorWide: [135, 225], sectorLabel: "S (SO–SW)",
      landing: { name: "Landeplatz Sportplatz Pfalzen", lat: 46.8095, lon: 11.8840, elev: 1020, approx: true }, historyStation: "59700MS", measureStation: "65600MS",
      cams: [fw("bruneck", "Bruneck")],
      notes: [
        "Schulungsgelände der Flugschule Südtirol: gut für Einsteiger. Holzrampe und Wiesenstart.",
        "Anfahrt per Straße, ca. 35 min von Gsies. Gebühr ca. 3 € beim Hof (nicht geprüft).",
        "Landeplatz am Sportplatz Pfalzen: Lage hier nur geschätzt, vor Ort ansehen.",
      ],
      rules: [],
    },
    {
      id: "speikboden", name: "Speikboden", area: "Luttach", lat: 46.9150, lon: 11.8992, elev: 2400,
      sector: [135, 225], sectorWide: [45, 250], sectorLabel: "S (NO–SW möglich)",
      landing: LANDING_SAND, historyStation: "53200SF", measureStation: "53200SF",
      cams: [{ label: "Speikboden Sonnklar 2400 m", img: "https://live-image.panomax.com/cams/8058/sonnklar1.jpg", link: "https://speikboden.panomax.com/sonnklar" }],
      notes: [
        "Bahn: Kabinenbahn bis 2000 m, dann Sessellift Sonnklar bis 2400 m. Sommersaison 30.5.–18.10., Winter ab ca. Dezember.",
        "Beste Startplätze ca. 10 min westlich der Bergstation. Richtung Gipfel Starts nach N, O und S.",
        "Durreck schirmt schwachen Nordwind ab, bei starkem Nordwind/Nordföhn nicht fliegen. Kräftige Frühjahrsthermik.",
        "Landung wie Ahornach in Sand in Taufers (FlyCard klären).",
      ],
      rules: [
        { type: "closedDates", ranges: [["10-19", "12-05"], ["04-15", "05-29"]], label: "Bahn außer Betrieb" },
        { type: "lee", sector: [315, 45], minSpeed: 15, label: "Starke Nordströmung in der Höhe" },
      ],
    },
    {
      id: "antholz", name: "Grente", area: "Antholz · nur Profis", lat: 46.8491, lon: 12.0583, elev: 2250,
      sector: [70, 160], sectorLabel: "O–SO",
      landing: { name: "Talwiesen Antholz Mittertal", lat: 46.8600, lon: 12.0800, elev: 1240, approx: true }, historyStation: "47400MS",
      cams: [fw("olang", "Olang")],
      notes: [
        "Top-Streckenfluggebiet, für Einsteiger nicht geeignet. Unfall bei Nordföhn dokumentiert (DHV, Juni 2025).",
        "Nur Hike & Fly: ca. 2 h / 1000 Hm ab Säge Außerweger oder Kirche Niedertal (Weg 6).",
        "Landeplatz nicht dokumentiert: vor Ort fragen. Wildtiere schonen.",
      ],
      rules: [{ type: "lee", sector: [315, 45], minSpeed: 10, label: "Nordströmung in der Höhe (Nordföhn-Gefahr)" }],
    },
    {
      id: "helm", name: "Helm", area: "Sexten", lat: 46.7159, lon: 12.3648, elev: 2080,
      sector: [135, 200], sectorLabel: "SO–S",
      landing: { name: "Landeplatz Sexten (Tal)", lat: 46.7030, lon: 12.3520, elev: 1330, approx: true }, historyStation: "41000MS",
      cams: [fw("sexten-west", "Sexten West")],
      notes: [
        "Helmjet-Gondel 1310 → 2039 m. Ob die Bahn gerade fährt: vor Ort prüfen.",
        "Markierter Landeplatz im Tal, Lage hier nur geschätzt. Tandem: Tandemfly 3 Zinnen.",
        "Ca. 35 min von Gsies.",
      ],
      rules: [],
    },
  ],
  // Landeswetterdienst Südtirol (WG/WG.BOE in m/s, WR in °)
  STATIONS: [
    { id: "45100WS", name: "Regelspitze", elev: 2747, role: "Gsies Gipfel · Nordföhn-Warnung" },
    { id: "45200SF", name: "Pfinnalm", elev: 2152, role: "Gsies, Höhe der Spielalm" },
    { id: "44500MS", name: "St. Magdalena", elev: 1412, role: "Gsies Talschluss" },
    { id: "43200MS", name: "Welsberg", elev: 1131, role: "Pustertal" },
    { id: "59700MS", name: "Bruneck", elev: 828, role: "Talwind Reischach" },
    { id: "56900MS", name: "Sand-Mühlen", elev: 851, role: "Landeplatz Ahornach" },
    { id: "53200SF", name: "Fadner Alm", elev: 2155, role: "Höhe Ahrntal / Speikboden" },
    { id: "41000MS", name: "Toblach", elev: 1219, role: "Hochpustertal" },
    { id: "65600MS", name: "Terenten", elev: 1349, role: "Messung für Pfalzen" },
  ],
  LINKS: [
    { t: "Föhndiagramm Südtirol", d: "Bozen − Innsbruck, Nordföhn = negativ", u: "https://weather.provinz.bz.it/foehn-chart.asp" },
    { t: "Wetter Südtirol", d: "Landeswetterdienst, Radar", u: "https://wetter.provinz.bz.it/" },
    { t: "Ahrntal Paragliding", d: "Gelände, FlyCard", u: "https://www.ahrntal.com/paragliding" },
    { t: "Flugordnung Ahrntal", d: "Regeln Ahornach/Speikboden (PDF)", u: "https://www.ahrntal.com/media/e3f7a4b8-649a-4f9e-a93a-5d7ec52444e8/ahrntal-flugordnung-a3-v06-20240906.pdf" },
    { t: "FlyCard kaufen", d: "tickets.ahrntal.com", u: "https://tickets.ahrntal.com" },
    { t: "Falkenclub Ahrntal", d: "Club Ahornach", u: "https://falkenclub.jimdofree.com/" },
    { t: "Gsies auf paragliding365", d: "Uwaldalm / Spielalm", u: "https://www.paragliding365.com/index-p-flightarea_details_6309.html" },
    { t: "Kronplatz auf paragliding365", d: "Startplätze, Landeplatz", u: "https://www.paragliding365.com/index-p-flightarea_details_349.html" },
    { t: "Flugschule Südtirol", d: "Pfalzen, Antholz", u: "https://flugschule-suedtirol.it/" },
    { t: "foto-webcam.eu", d: "Webcams mit Archiv", u: "https://www.foto-webcam.eu/" },
    { t: "xcTherm", d: "Thermikprognose (Login/Abo)", u: "https://xctherm.com/" },
    { t: "Burnair", d: "Startplatz-Prognose (Abo)", u: "https://map.burnair.cloud/" },
    { t: "DHV-Wetter", d: "Alpenwetter für Piloten", u: "https://www.dhv.de/wetter/dhv-wetter/" },
    { t: "Windy", d: "Großwetterlage, Höhenwind", u: "https://www.windy.com/46.85/12.05?46.7,12.0,9" },
  ],
};
