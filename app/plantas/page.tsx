import type { Metadata } from "next";
import FuturePage from "../components/FuturePage";

export const metadata: Metadata = { title: "Plantas | Garden World" };

export default function PlantsPage() {
  return <FuturePage area="Plants" title="Vegetación seleccionada." description="La colección se organizará por luz, lugar y uso cuando estén confirmados el inventario y la fotografía." next="Catálogo real, filtros, disponibilidad y relación con paisajismo." />;
}
