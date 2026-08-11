type FuturePageProps = {
  area: string;
  title: string;
  description: string;
  next: string;
  image?: string;
  references?: Array<{ sku: string; label: string }>;
};

export default function FuturePage({ area, title, description, next, image, references }: FuturePageProps) {
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
          <p className="eyebrow">Garden World · {area}</p>
          <h1>{title}</h1>
          <p>{description}</p>
          <span className="future-status">Fase 2 · Contenido en preparación</span>
          <div className="future-actions">
            <a href="/" className="button">Volver a la Home <span aria-hidden="true">←</span></a>
            <a href="/#cotizar" className="text-link">Conversar ahora <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <div className="future-media">
          {image ? (
            <img src={image} alt="Roll Up, producto de Garden World" />
          ) : (
            <div className="future-placeholder" aria-label={area} data-content-status="pending">
              <span>Archivo visual</span>
              <strong>{area}</strong>
            </div>
          )}
          <p><span>Siguiente fase</span>{next}</p>
          {references && (
            <div className="future-references">
              <p>Referencias existentes preservadas</p>
              <ul>
                {references.map((reference) => (
                  <li key={reference.sku}><span>{reference.label}</span><code>{reference.sku}</code></li>
                ))}
              </ul>
              <small>La disponibilidad y las especificaciones se confirmarán en la ficha de Fase 2.</small>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
