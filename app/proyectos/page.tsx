import type { Metadata } from "next";
import FuturePage from "../components/FuturePage";

export const metadata: Metadata = { title: "Proyectos | Garden World" };

export default function ProjectsPage() {
  return <FuturePage area="Projects" title="El exterior, documentado." description="Este archivo mostrará proyectos reales cuando existan fotografías, ubicación, tipología y alcance confirmados." next="Casos editoriales con productos, plantas y servicios utilizados." />;
}
