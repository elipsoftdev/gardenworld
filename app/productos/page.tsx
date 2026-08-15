import type { Metadata } from "next";
import FuturePage from "../components/FuturePage";

export const metadata: Metadata = {
  title: "Bases para mangueras Garden World | Acabados y diseño",
  description: "Bases para mangueras Garden World en dos acabados para ordenar e integrar funcionalidad y diseño en tu jardín.",
  alternates: { canonical: "/productos/" },
};

export default function ProductsPage() {
  return (
    <FuturePage
      title="Bases de mangueras Garden World."
      description="Una familia de bases para mangueras diseñada para ordenar el uso cotidiano y acompañar el exterior."
      image="/images/ru-inox-45.webp"
      references={[
        { label: "Plata de acero inoxidable", sku: "GW-RU-INX" },
        { label: "Negro mate", sku: "GW-RU-NGR" },
      ]}
    />
  );
}
