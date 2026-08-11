import type { Metadata } from "next";
import FuturePage from "../components/FuturePage";

export const metadata: Metadata = { title: "Productos | Garden World" };

export default function ProductsPage() {
  return (
    <FuturePage
      area="Products"
      title="Objetos para el exterior."
      description="Roll Up abre una colección de productos donde función, material y arquitectura comparten el mismo criterio."
      next="Ficha completa de Roll Up, accesorios y arquitectura de productos."
      image="/images/ru-piedra-45.webp"
      references={[
        { label: "Roll Up · Blanco", sku: "GW-RU-BLC" },
        { label: "Roll Up · Piedra", sku: "GW-RU-PDR" },
        { label: "Roll Up · Inoxidable", sku: "GW-RU-INX" },
        { label: "Roll Up · Corten", sku: "GW-RU-COR" },
        { label: "Roll Up · Negro mate", sku: "GW-RU-NGR" },
        { label: "Nylon de corte", sku: "GW-NYL-500" },
        { label: "Malla de sombra", sku: "GW-MAL-2100" },
        { label: "Tutores de bambú", sku: "GW-TUT-50" },
        { label: "Grapas de anclaje", sku: "GW-GRP-100" },
      ]}
    />
  );
}
