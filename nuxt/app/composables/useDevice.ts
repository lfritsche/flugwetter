// Desktop = breites Fenster: grosse Karte neben der Tabelle und alle Kartenebenen
const QUERY = "(min-width: 1100px)";
export function useDevice() {
  const isDesktop = useState("isDesktop", () => false);
  onMounted(() => {
    const m = window.matchMedia(QUERY), on = () => { isDesktop.value = m.matches; };
    on(); m.addEventListener("change", on);
    onUnmounted(() => m.removeEventListener("change", on));
  });
  return { isDesktop };
}
