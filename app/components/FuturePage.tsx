type FuturePageProps = {
  title: string;
  description: string;
  image?: string;
  references?: Array<{ sku: string; label: string }>;
};

export default function FuturePage({ title, description, image, references }: FuturePageProps) {
  return (
    <main className="future-page">
      <header className="future-nav">
        <a href="/" className="future-brand" aria-label="Garden World, volver al inicio">
          Garden World
        </a>
        <a href="/#cotizar" className="text-link">Cotizar <span aria-hidden="true">↗</span></a>
      </header>
      <section className="future-hero">
        <div className="future-copy">
          <p className="eyebrow">Bases de mangueras Garden World</p>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="future-actions">
            <a href="/" className="button">Volver a la Home <span aria-hidden="true">←</span></a>
            <a href="/#cotizar" className="text-link">Cotizar <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <div className="future-media">
          {image ? (
            <img src={image} alt="Base para manguera Garden World" />
          ) : (
            <div className="future-placeholder" aria-label="Imagen pendiente" data-content-status="pending">
              <span>Imagen pendiente</span>
              <strong>GW-IMG-BM-01</strong>
            </div>
          )}
          <p><span>Bases Garden World</span>Selecciona un acabado y cotiza directamente por WhatsApp.</p>
          {references && (
            <div className="future-references">
              <p>Acabados disponibles</p>
              <ul>
                {references.map((reference) => (
                  <li key={reference.sku}><span>{reference.label}</span><code>{reference.sku}</code></li>
                ))}
              </ul>
              <small>La disponibilidad se confirma directamente por WhatsApp.</small>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
