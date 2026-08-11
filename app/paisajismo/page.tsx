import type { Metadata } from "next";
import FuturePage from "../components/FuturePage";

export const metadata: Metadata = { title: "Paisajismo | Garden World" };

export default function LandscapePage() {
  return <FuturePage area="Landscapes" title="Diseñamos el conjunto." description="Un servicio para integrar vegetación, materiales, distribución y ejecución en una visión completa." next="Proceso, alcance, formulario de proyecto y casos documentados." />;
}
