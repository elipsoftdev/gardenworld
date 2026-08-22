import type { Metadata } from "next";
import FuturePage from "../components/FuturePage";

export const metadata: Metadata = {
  title: "Base Premium Silver y Base Black | Garden World",
  description: "Dos bases para mangueras Garden World: Base Premium Silver en acero inoxidable y Base Black en acero al carbono.",
  alternates: { canonical: "/productos/" },
};

export default function ProductsPage() {
  return (
    <FuturePage
      title="Elige tu estilo."
      description="Conoce las dos bases Garden World disponibles actualmente y cotiza la que mejor se integra con tu exterior."
      image="/images/products/premium-silver-garden.webp"
      references={[
        { label: "Base Premium Silver", sku: "Acero inoxidable 304 · 3 mm" },
        { label: "Base Black", sku: "Acero al carbono · 3 mm" },
      ]}
    />
  );
}
