import type { Metadata } from "next";
import FuturePage from "../components/FuturePage";

export const metadata: Metadata = {
  title: "Bases para mangueras Garden World | Acabados y diseño",
  description: "Bases para mangueras Garden World en cinco acabados para ordenar e integrar funcionalidad y diseño en tu jardín.",
  alternates: { canonical: "/productos/" },
};

export default function ProductsPage() {
  return (
    <FuturePage
      title="Bases de mangueras Garden World."
      description="Una familia de bases para mangueras diseñada para ordenar el uso cotidiano y acompañar el exterior."
      image="/images/ru-piedra-45.webp"
      references={[
        { label: "Blanco", sku: "GW-RU-BLC" },
        { label: "Piedra", sku: "GW-RU-PDR" },
        { label: "Inoxidable", sku: "GW-RU-INX" },
        { label: "Corten", sku: "GW-RU-COR" },
        { label: "Negro mate", sku: "GW-RU-NGR" },
      ]}
    />
  );
}
