import type { Metadata } from "next";
import FuturePage from "../components/FuturePage";

export const metadata: Metadata = { title: "Nosotros | Garden World" };

export default function AboutPage() {
  return <FuturePage area="About" title="Una mirada completa al exterior." description="Garden World evoluciona para reunir productos, plantas y paisajismo bajo una dirección clara y contemporánea." next="Historia, equipo, criterios de selección y canales de atención." />;
}
