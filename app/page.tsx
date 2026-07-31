"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    const WA = "584143228003";

    // año en el footer
    const yr = document.getElementById("yr");
    if (yr) yr.textContent = String(new Date().getFullYear());

    // nav pegajoso
    const nav = document.getElementById("nav");
    const onScroll = () => {
      if (nav) nav.classList.toggle("stuck", window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const burger = document.getElementById("burger");
    const onBurger = () => {
      document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
    };
    burger?.addEventListener("click", onBurger);

    // dibujo del aro (hero)
    document.querySelectorAll(".coil circle, .coil path").forEach((el, i) => {
      const path = el as SVGGeometryElement & HTMLElement;
      const len = path.getTotalLength ? path.getTotalLength() : 1200;
      path.style.setProperty("--len", String(len));
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
      path.style.animationDelay = 0.12 * i + "s";
    });

    // reveal on scroll
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".rv").forEach((el) => io.observe(el));

    // dial de acabados — inicial
    pickFinish("piedra");

    // cotizador
    const prod = document.getElementById("q-prod") as HTMLSelectElement | null;
    const fin = document.getElementById("q-fin") as HTMLSelectElement | null;
    const qty = document.getElementById("q-qty") as HTMLInputElement | null;
    const city = document.getElementById("q-city") as HTMLInputElement | null;
    const who = document.getElementById("q-who") as HTMLSelectElement | null;
    const out = document.getElementById("waMsg");
    const go = document.getElementById("waGo");
    const finWrap = document.getElementById("finishWrap");
    const fab = document.getElementById("fab");

    const needsFinish = () => prod?.value === "Roll up";

    const FIN_SKU: Record<string, string> = {
      Blanco: "GW-RU-BLC",
      Piedra: "GW-RU-PDR",
      Inoxidable: "GW-RU-INX",
      Corten: "GW-RU-COR",
      "Negro mate": "GW-RU-NGR",
    };

    const compose = () => {
      if (!prod || !fin || !qty || !city || !who || !out || !go) return;
      if (finWrap) finWrap.style.display = needsFinish() ? "" : "none";
      let prodLine = prod.value;
      if (needsFinish() && FIN_SKU[fin.value]) {
        prodLine += " · " + fin.value + " (" + FIN_SKU[fin.value] + ")";
      }
      const lines = ["Hola GardenWorld,", "", "Quiero cotizar:", "· Producto: " + prodLine];
      lines.push("· Cantidad: " + (qty.value || "1"));
      if (city.value.trim()) lines.push("· Ciudad: " + city.value.trim());
      lines.push("· Compro como: " + who.value);
      lines.push("", "¿Me confirman precio y disponibilidad?");
      const msg = lines.join("\n");
      out.textContent = msg;
      const url = "https://wa.me/" + WA + "?text=" + encodeURIComponent(msg);
      go.setAttribute("href", url);
      fab?.setAttribute("href", url);
      return msg;
    };

    [prod, fin, qty, city, who].forEach((el) => {
      el?.addEventListener("input", compose);
      el?.addEventListener("change", compose);
    });
    compose();

    // botones "Cotizar" de las tarjetas preseleccionan el producto
    const pickButtons = document.querySelectorAll<HTMLElement>("[data-pick]");
    const onPick = function (this: HTMLElement) {
      const want = this.getAttribute("data-pick");
      if (!prod) return;
      for (let i = 0; i < prod.options.length; i++) {
        if (prod.options[i].value === want) {
          prod.selectedIndex = i;
          break;
        }
      }
      compose();
    };
    pickButtons.forEach((a) => a.addEventListener("click", onPick));

    return () => {
      window.removeEventListener("scroll", onScroll);
      burger?.removeEventListener("click", onBurger);
      io.disconnect();
      [prod, fin, qty, city, who].forEach((el) => {
        el?.removeEventListener("input", compose);
        el?.removeEventListener("change", compose);
      });
      pickButtons.forEach((a) => a.removeEventListener("click", onPick));
    };
  }, []);

  return (
    <>
<nav className="nav" id="nav">
  <a className="lockup" href="#top" aria-label="GardenWorld — inicio">
    <svg className="mark" viewBox="0 0 44 44" aria-hidden="true">
      <g fill="none" stroke="#C8A64B" strokeWidth="1.5">
        <circle cx="22" cy="23" r="17"/><circle cx="22" cy="23" r="12.5"/><circle cx="22" cy="23" r="8"/>
      </g>
      <path d="M30 12c4-3 8-3.5 8-3.5s-1 4.5-4.5 6.2" fill="none" stroke="#E3C878" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
    <span className="type"><b>GARDEN</b><i>WORLD</i></span>
  </a>
  <ul className="nav-links">
    <li><a href="#acabados">Acabados</a></li>
    <li><a href="#catalogo">Catálogo</a></li>
    <li><a href="#materiales">Materiales</a></li>
    <li><a href="#instalacion">Instalación</a></li>
    <li><a href="#mayoristas">Mayoristas</a></li>
    <li><a href="#cotizar" className="pill">Cotizar</a></li>
  </ul>
  <button className="nav-burger" id="burger" aria-label="Ir al catálogo">Menú</button>
</nav>


<header className="hero" id="top">
  <div className="hero-veil"></div>
  <div className="hero-grain"></div>
  <div className="wrap hero-inner">
    <div>
      <span className="eyebrow up d1s">
        <svg className="rings" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1"><circle cx="9" cy="9" r="7.5"/><circle cx="9" cy="9" r="4.5"/><circle cx="9" cy="9" r="1.6"/></g></svg>
        Jardín · Venezuela &amp; LATAM
      </span>
      <h1 className="d1 up d2s">Piezas de jardín<br/>que <em>se quedan.</em></h1>
      <p className="lede up d3s">Soportes de manguera en acero inoxidable y aluminio, más insumos de jardinería seleccionados uno por uno. Metal que aguanta la intemperie, no plástico que se raja en dos veranos.</p>
      <div className="hero-cta up d4s">
        <a href="#catalogo" className="btn btn-brass">Ver el catálogo</a>
        <a href="#cotizar" className="btn btn-line">Pedir cotización</a>
      </div>
    </div>
    <div className="coil-stage up d2s">
      <svg className="coil" viewBox="0 0 400 400" aria-label="Manguera enrollada — el aro">
        <g>
          <circle className="ring faint" cx="200" cy="200" r="184"/>
          <circle className="ring" cx="200" cy="200" r="158"/>
          <circle className="ring faint" cx="200" cy="200" r="132"/>
          <circle className="ring" cx="200" cy="200" r="106"/>
          <circle className="ring faint" cx="200" cy="200" r="80"/>
          <circle className="ring" cx="200" cy="200" r="54"/>
          <circle className="ring faint" cx="200" cy="200" r="28"/>
        </g>
        <path className="leaf" d="M262 78c34-28 72-31 72-31s-8 40-40 55"/>
        <path className="leaf" d="M296 74c-6 12-14 21-24 28" opacity=".65"/>
      </svg>
      <span className="coil-cap">Enrollada · sin nudos · fuera del piso</span>
    </div>
  </div>
</header>


<section className="ribbon" aria-label="Datos rápidos">
  <div className="ribbon-grid">
    <div className="rib"><b>1 <span>pieza</span></b><i>Acero doblado, sin partes móviles ni engranajes</i></div>
    <div className="rib"><b>0 <span>plástico</span></b><i>Nada que se decolore ni se raje con el sol</i></div>
    <div className="rib"><b>5 <span>acabados</span></b><i>De fábrica; otros RAL a partir de volumen</i></div>
    <div className="rib"><b>LATAM</b><i>Despacho nacional y a la región</i></div>
  </div>
</section>



<section className="band finish-feature" id="acabados">
  <div className="wrap">
    <div className="head rv">
      <span className="eyebrow">Roll up · un producto, cinco acabados</span>
      <h2 className="d2">Gira el dial. Elige la fachada.</h2>
      <p className="lede">Misma pieza, mismo montaje. Lo único que cambia es la pintura en polvo — y con ella, si se nota o desaparece en tu muro.</p>
    </div>
    <div className="finish-stage rv">
      <div className="finish-photo" id="finishPhoto">
          <img id="fph-blanco" src="images/ru-blanco-45.webp" alt="Roll up en acabado Blanco"/>
          <img id="fph-piedra" src="images/ru-piedra-45.webp" alt="Roll up en acabado Piedra" className="on"/>
          <img id="fph-inox" src="images/ru-inox-45.webp" alt="Roll up en acabado Inoxidable"/>
          <img id="fph-corten" src="images/ru-corten-45.webp" alt="Roll up en acabado Corten"/>
          <img id="fph-negro" src="images/ru-negro-45.webp" alt="Roll up en acabado Negro mate"/>
        <span className="fcap" id="finishCap"><b>›</b> Roll up · Piedra</span>
      </div>
      <div className="finish-copy">
        <span className="eyebrow">Acabado seleccionado</span>
        <h3 className="finish-name" id="finishName">Piedra</h3>
        <p className="finish-ral" id="finishRal"><b>RAL 1019</b> · Gris beige</p>
        <p>Pintura en polvo poliéster para exterior sobre acero doblado. Los cinco salen de la misma línea de producción — pedir uno u otro no cambia precio ni plazo.</p>
        <div className="dial" role="group" aria-label="Elegir acabado">
          <button type="button" className="" data-key="blanco" aria-label="Acabado Blanco" onClick={() => pickFinish("blanco")}><span className="chip" style={{background: '#F8F7F6'}}></span><span className="lbl">Blanco</span></button>
          <button type="button" className="on" data-key="piedra" aria-label="Acabado Piedra" onClick={() => pickFinish("piedra")}><span className="chip" style={{background: '#C3B7A6'}}></span><span className="lbl">Piedra</span></button>
          <button type="button" className="" data-key="inox" aria-label="Acabado Inoxidable" onClick={() => pickFinish("inox")}><span className="chip" style={{background: '#CDCECA'}}></span><span className="lbl">Inoxidable</span></button>
          <button type="button" className="" data-key="corten" aria-label="Acabado Corten" onClick={() => pickFinish("corten")}><span className="chip" style={{background: '#935537'}}></span><span className="lbl">Corten</span></button>
          <button type="button" className="" data-key="negro" aria-label="Acabado Negro mate" onClick={() => pickFinish("negro")}><span className="chip" style={{background: '#3F3E39'}}></span><span className="lbl">Negro mate</span></button>
        </div>
        <div className="finish-cta">
          <a className="btn btn-brass" id="finishWa" href="#" target="_blank" rel="noopener">Cotizar este acabado</a>
          <span className="finish-sku" id="finishSku">GW-RU-PDR</span>
        </div>
      </div>
    </div>
  </div>
</section>


<section className="band">
  <div className="wrap">
    <div className="head rv">
      <span className="eyebrow">El problema</span>
      <h2 className="d2">La manguera siempre termina en el piso.</h2>
      <p className="lede">Enredada, pisada, con el carrete plástico partido por el sol. En un jardín que costó diseñar, es lo primero que se ve y lo último que alguien resolvió.</p>
    </div>
    <div className="compare rv">
      <div className="pane">
        <div className="pane-slot"><span className="slot-note">Foto “antes”<br/>manguera en el piso · 4:3</span></div>
        <div className="pane-body">
          <span className="pane-tag">Antes</span>
          <h3>Carrete plástico</h3>
          <p>Se decolora, se raja, se reemplaza cada dos o tres temporadas. Y nunca deja de verse como un accesorio de ferretería.</p>
        </div>
      </div>
      <div className="pane good">
        <div className="pane-slot"><img src="images/ru-corten-43.webp" alt="Roll up en acabado corten, montado en pared con la manguera enrollada" loading="lazy" decoding="async"/></div>
        <div className="pane-body">
          <span className="pane-tag">Después</span>
          <h3>Roll up</h3>
          <p>Una sola pieza de acero doblado. La columna central deja el grifo y el acople a la vista, la horquilla inferior sostiene el rollo y la boquilla descansa arriba.</p>
        </div>
      </div>
    </div>
  </div>
</section>


<section className="band band-bone" id="catalogo">
  <div className="wrap">
    <div className="head rv">
      <span className="eyebrow">Catálogo</span>
      <h2 className="d2">Dos familias: piezas que duran, insumos que se reponen.</h2>
      <p className="lede">Roll up es la línea propia, fabricada en metal. Los consumibles son importados y seleccionados por lote, no por precio.</p>
    </div>

    <div className="cat-grid rv">
      <article className="card">
        <div className="card-media">
          <span className="card-flag">5 acabados</span>
          <img src="images/ru-piedra-1x1.webp" alt="Roll up, acabado piedra" loading="lazy" decoding="async"/>
        </div>
        <div className="card-body">
          <span className="card-line">Acero · pintura en polvo</span>
          <h3>Roll up</h3>
          <p>Blanco, piedra, inoxidable, corten o negro mate. Mismo montaje, mismo precio — el acabado se elige según la fachada.</p>
          <span className="card-sku">GW-RU-···</span>
          <div className="card-foot">
            <span className="price">USD —<small>precio por confirmar</small></span>
            <a className="btn btn-line" href="#acabados">Ver los 5 acabados</a>
          </div>
        </div>
      </article>

      <article className="card">
        <div className="card-media">
          <span className="card-flag">Consumible</span>
          <svg className="card-rings" viewBox="0 0 200 200" aria-hidden="true"><g><circle cx="100" cy="100" r="88"/><circle cx="100" cy="100" r="62"/><circle cx="100" cy="100" r="36"/></g></svg>
        </div>
        <div className="card-body">
          <span className="card-line">1,6 · 2,0 · 2,4 mm</span>
          <h3>Nylon de corte</h3>
          <p>Hilo para desmalezadora en carrete de 500 m. Perfil cuadrado, tratado contra UV.</p>
          <span className="card-sku">GW-NYL-500</span>
          <div className="card-foot">
            <span className="price">USD —<small>precio por confirmar</small></span>
            <a className="btn btn-line" href="#cotizar" data-pick="Nylon de corte (GW-NYL-500)">Cotizar</a>
          </div>
        </div>
      </article>

      <article className="card">
        <div className="card-media">
          <span className="card-flag">Consumible</span>
          <svg className="card-rings" viewBox="0 0 200 200" aria-hidden="true"><g><circle cx="100" cy="100" r="88"/><circle cx="100" cy="100" r="62"/><circle cx="100" cy="100" r="36"/></g></svg>
        </div>
        <div className="card-body">
          <span className="card-line">35 % · 50 % · 70 % de sombra</span>
          <h3>Malla de sombra</h3>
          <p>Rollo de 2 × 100 m en polietileno con aditivo UV. Para vivero, patio o sombreado de obra.</p>
          <span className="card-sku">GW-MAL-2100</span>
          <div className="card-foot">
            <span className="price">USD —<small>precio por confirmar</small></span>
            <a className="btn btn-line" href="#cotizar" data-pick="Malla de sombra (GW-MAL-2100)">Cotizar</a>
          </div>
        </div>
      </article>

      <article className="card">
        <div className="card-media">
          <span className="card-flag">Consumible</span>
          <svg className="card-rings" viewBox="0 0 200 200" aria-hidden="true"><g><circle cx="100" cy="100" r="88"/><circle cx="100" cy="100" r="62"/><circle cx="100" cy="100" r="36"/></g></svg>
        </div>
        <div className="card-body">
          <span className="card-line">60 · 90 · 120 cm</span>
          <h3>Tutores de bambú</h3>
          <p>Paquete de 50 unidades, tratados. Para guiar trepadoras, tomate y arbustos jóvenes.</p>
          <span className="card-sku">GW-TUT-50</span>
          <div className="card-foot">
            <span className="price">USD —<small>precio por confirmar</small></span>
            <a className="btn btn-line" href="#cotizar" data-pick="Tutores de bambú (GW-TUT-50)">Cotizar</a>
          </div>
        </div>
      </article>

      <article className="card">
        <div className="card-media">
          <span className="card-flag">Consumible</span>
          <svg className="card-rings" viewBox="0 0 200 200" aria-hidden="true"><g><circle cx="100" cy="100" r="88"/><circle cx="100" cy="100" r="62"/><circle cx="100" cy="100" r="36"/></g></svg>
        </div>
        <div className="card-body">
          <span className="card-line">1″ · 1½″ · 2″</span>
          <h3>Grapas de anclaje</h3>
          <p>Caja de 100 en acero galvanizado. Para fijar malla antimaleza, riego por goteo y cable.</p>
          <span className="card-sku">GW-GRP-100</span>
          <div className="card-foot">
            <span className="price">USD —<small>precio por confirmar</small></span>
            <a className="btn btn-line" href="#cotizar" data-pick="Grapas de anclaje (GW-GRP-100)">Cotizar</a>
          </div>
        </div>
      </article>
    </div>
  </div>
</section>


<section className="band" id="ficha">
  <div className="wrap">
    <div className="head rv">
      <span className="eyebrow">Ficha técnica · Roll up</span>
      <h2 className="d2">Los números, sin adornos.</h2>
    </div>
    <div className="spec-split">
      <div className="spec-media rv">
        <img src="images/ru-piedra-45.webp" alt="Roll up en acabado piedra, vista de producto" loading="lazy" decoding="async"/>
      </div>
      <div className="rv">
        <table className="spec-table">
          <tbody>
            <tr><th>Formato</th><td>Una sola pieza de acero doblado: placa superior, columna central y horquilla inferior</td></tr>
            <tr><th>Montaje</th><td>Anclaje a pared. La columna deja el grifo y el acople rápido accesibles</td></tr>
            <tr><th>Uso</th><td>La manguera se enrolla alrededor de la columna; la boquilla descansa sobre la placa</td></tr>
            <tr><th>Acabados</th><td>Bronce y piedra. Otros colores RAL por pedido de volumen</td></tr>
            <tr><th>Material</th><td>Acero con pintura en polvo para exterior — calibre por confirmar con fábrica</td></tr>
            <tr><th>Medidas y capacidad</th><td>Por confirmar con fábrica</td></tr>
            <tr><th>Peso</th><td>Por confirmar</td></tr>
            <tr><th>Garantía</th><td>Por definir</td></tr>
          </tbody>
        </table>
        <div className="swatches">
          <div className="sw"><span style={{background: '#F8F7F6'}}></span><i>Blanco</i></div>
          <div className="sw"><span style={{background: '#C3B7A6'}}></span><i>Piedra</i></div>
          <div className="sw"><span style={{background: '#CDCECA'}}></span><i>Inoxidable</i></div>
          <div className="sw"><span style={{background: '#935537'}}></span><i>Corten</i></div>
          <div className="sw"><span style={{background: '#3F3E39'}}></span><i>Negro mate</i></div>
        </div>
      </div>
    </div>
  </div>
</section>


<section className="band band-loam2" id="materiales">
  <div className="wrap">
    <div className="head rv">
      <span className="eyebrow">Guía de acabados</span>
      <h2 className="d2">Cuál pedir, según la pared.</h2>
      <p className="lede">Los dos acabados cuestan igual. La decisión es de fachada, no de presupuesto.</p>
    </div>
    <div className="mat-grid rv">
      <div className="mat">
        <span className="mat-k">Claros</span>
        <h3>Blanco y Piedra</h3>
        <p>Para estuco, muros pintados y obra nueva. La pieza se lee como parte del muro en vez de un añadido.</p>
        <ul><li>Blanco — RAL 9010</li><li>Piedra — RAL 1019</li><li>Reflejan calor, no se calientan al sol</li></ul>
      </div>
      <div className="mat">
        <span className="mat-k">Metal</span>
        <h3>Inoxidable y Corten</h3>
        <p>Para fachadas de madera, ladrillo visto o cuando la pieza quiere notarse como objeto, no camuflarse.</p>
        <ul><li>Inoxidable — acero natural, sin pintar</li><li>Corten — RAL 8004</li><li>Envejecen bien a la intemperie</li></ul>
      </div>
      <div className="mat">
        <span className="mat-k">Oscuro</span>
        <h3>Negro mate</h3>
        <p>El más pedido. Se apoya en cualquier fachada oscura y disimula el polvo y las marcas de agua mejor que los claros.</p>
        <ul><li>Negro mate — RAL 9005</li><li>Pintura en polvo, no esmalte</li><li>Costa: aún así, evaluar inoxidable</li></ul>
      </div>
    </div>
  </div>
</section>


<section className="band band-bone" id="instalacion">
  <div className="wrap">
    <div className="head rv">
      <span className="eyebrow">Instalación</span>
      <h2 className="d2">Tres pasos y queda puesta.</h2>
    </div>
    <div className="steps rv">
      <div className="step">
        <div className="step-n">01</div>
        <h3>Marca y ancla</h3>
        <p>La columna se fija a la pared dejando el grifo centrado en el hueco. Tornillos y tacos según el muro.</p>
      </div>
      <div className="step">
        <div className="step-n">02</div>
        <h3>Conecta</h3>
        <p>El acople rápido queda accesible en el hueco central. La llave se sigue abriendo y cerrando sin estorbo.</p>
      </div>
      <div className="step">
        <div className="step-n">03</div>
        <h3>Enrolla</h3>
        <p>La manguera da la vuelta alrededor de la columna y se apoya en la horquilla. La boquilla descansa arriba.</p>
      </div>
    </div>
  </div>
</section>


<section className="band" id="mayoristas">
  <div className="wrap">
    <div className="head rv" style={{marginBottom: '44px'}}>
      <span className="eyebrow">Mayoristas y especificadores</span>
      <h2 className="d2">Si compras por volumen, hablamos distinto.</h2>
      <p className="lede">Para viveros, ferreterías, constructoras y estudios de paisajismo que especifican en obra.</p>
    </div>
    <div className="b2b">
      <div className="rv">
        <table className="tiers">
          <thead><tr><th>Volumen</th><th>Descuento</th><th>Condición</th></tr></thead>
          <tbody>
            <tr><td>5 – 19 u.</td><td>Por definir</td><td>Pago contra entrega</td></tr>
            <tr><td>20 – 49 u.</td><td>Por definir</td><td>Anticipo parcial</td></tr>
            <tr><td>50 u. o más</td><td>Por definir</td><td>Condiciones a convenir</td></tr>
          </tbody>
        </table>
        <p className="lede" style={{fontSize: '.86rem', marginTop: '18px'}}>Los porcentajes se cierran con el cliente antes de publicar. Preferimos no anunciar cifras que después no se sostengan.</p>
      </div>
      <div className="b2b-notes rv">
        <h4>Cómo trabajamos con comercios</h4>
        <dl>
          <dt>Lista de precios</dt><dd>Se envía por WhatsApp o correo tras la primera conversación.</dd>
          <dt>Despacho</dt><dd>Nacional y a la región. El flete se cotiza aparte según destino y peso.</dd>
          <dt>Reposición</dt><dd>Consumibles con stock rotativo; las piezas de metal se producen por lote.</dd>
          <dt>Material de venta</dt><dd>Fotos, fichas y medidas para tu catálogo o vitrina.</dd>
        </dl>
        <a href="#cotizar" className="btn btn-brass" style={{marginTop: '24px', width: '100%'}}>Pedir lista mayorista</a>
      </div>
    </div>
  </div>
</section>


<section className="band band-loam2" id="nosotros">
  <div className="wrap">
    <div className="head rv">
      <span className="eyebrow">GardenWorld</span>
      <h2 className="d2">Empezamos por lo que más molestaba.</h2>
      <p className="lede">GardenWorld nace en Venezuela con una idea corta: el jardín se llena de cosas que se rompen. Arrancamos fabricando Roll up, la pieza que resuelve la manguera, y desde ahí ampliamos a los insumos que un jardín consume todo el año.</p>
      <p className="lede">Importamos directo y revisamos por lote, no por catálogo. Lo que no pasa nuestra propia prueba de patio, no entra a la lista.</p>
    </div>
  </div>
</section>


<section className="band band-bone" id="cotizar">
  <div className="wrap">
    <div className="head rv">
      <span className="eyebrow">Cotizar</span>
      <h2 className="d2">Armas el mensaje aquí, se abre en WhatsApp.</h2>
      <p className="lede">Sin formularios que caen en un correo que nadie lee. Eliges, ves el mensaje y lo envías.</p>
    </div>
    <div className="quote">
      <form className="rv" id="qForm" onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label htmlFor="q-prod">Producto</label>
          <select id="q-prod">
            <option>Roll up</option>
            <option>Nylon de corte (GW-NYL-500)</option>
            <option>Malla de sombra (GW-MAL-2100)</option>
            <option>Tutores de bambú (GW-TUT-50)</option>
            <option>Grapas de anclaje (GW-GRP-100)</option>
            <option>Todavía no sé — necesito asesoría</option>
          </select>
        </div>
        <div className="field" id="finishWrap">
          <label htmlFor="q-fin">Acabado</label>
          <select id="q-fin">
            <option>Blanco</option>
            <option>Piedra</option>
            <option>Inoxidable</option>
            <option>Corten</option>
            <option>Negro mate</option>
            <option>Otro color RAL</option>
          </select>
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="q-qty">Cantidad</label>
            <input id="q-qty" type="number" min="1" value="1"/>
          </div>
          <div className="field">
            <label htmlFor="q-city">Ciudad</label>
            <input id="q-city" type="text" placeholder="Caracas"/>
          </div>
        </div>
        <div className="field">
          <label htmlFor="q-who">Compras como</label>
          <select id="q-who">
            <option>Particular</option>
            <option>Paisajista o estudio de diseño</option>
            <option>Vivero o ferretería</option>
            <option>Constructora</option>
          </select>
        </div>
        <a className="btn btn-wa" id="waGo" href="#" style={{width: '100%', marginTop: '6px'}}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1a12 12 0 0 1-5.9-4.6c-.6-1-.9-1.9-.9-2.7 0-.8.4-1.4.8-1.8.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .5.4l.8 1.8c.1.2 0 .4-.1.5l-.4.5c-.1.2-.2.3 0 .6a8 8 0 0 0 3.4 2.7c.3.1.4 0 .6-.1l.6-.7c.2-.2.3-.2.6-.1l1.8.9c.3.1.3.3.3.5s0 .8-.2 1.2Z"/></svg>
          Abrir WhatsApp con este mensaje
        </a>
      </form>
      <aside className="preview rv">
        <div className="preview-k">Esto es lo que se envía</div>
        <div id="waMsg"></div>
        <p className="fine">No guardamos nada. El mensaje se abre en tu WhatsApp y lo envías tú.</p>
      </aside>
    </div>
  </div>
</section>


<footer className="foot">
  <div className="wrap">
    <div className="foot-grid">
      <div className="foot-brand">
        <a className="lockup" href="#top" aria-label="GardenWorld">
          <svg className="mark" viewBox="0 0 44 44" aria-hidden="true">
            <g fill="none" stroke="#C8A64B" strokeWidth="1.5"><circle cx="22" cy="23" r="17"/><circle cx="22" cy="23" r="12.5"/><circle cx="22" cy="23" r="8"/></g>
            <path d="M30 12c4-3 8-3.5 8-3.5s-1 4.5-4.5 6.2" fill="none" stroke="#E3C878" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          <span className="type"><b>GARDEN</b><i>WORLD</i></span>
        </a>
        <p>Piezas de metal para el jardín e insumos seleccionados. Venezuela y LATAM.</p>
      </div>
      <div className="foot-col">
        <h5>Catálogo</h5>
        <ul>
          <li><a href="#catalogo">Roll up</a></li>
          <li><a href="#catalogo">Consumibles</a></li>
          <li><a href="#ficha">Ficha técnica</a></li>
          <li><a href="#materiales">Guía de materiales</a></li>
        </ul>
      </div>
      <div className="foot-col">
        <h5>Ayuda</h5>
        <ul>
          <li><a href="#instalacion">Instalación</a></li>
          <li><a href="#mayoristas">Mayoristas</a></li>
          <li><a href="#cotizar">Cotizar</a></li>
          <li><a href="#nosotros">Nosotros</a></li>
        </ul>
      </div>
      <div className="foot-col">
        <h5>Contacto</h5>
        <ul>
          <li>Atención: Sr. Héctor Guevara</li>
          <li><a href="#cotizar">WhatsApp directo</a></li>
          <li><a href="#">Instagram</a></li>
          <li><a href="#">Correo</a></li>
        </ul>
      </div>
    </div>
    <div className="foot-bot">
      <p>© <span id="yr"></span> GardenWorld · Todos los derechos reservados</p>
      <p className="tag">GARDEN · WORLD</p>
    </div>
  </div>
</footer>

<a className="fab" id="fab" href="#" aria-label="Escribir por WhatsApp">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1a12 12 0 0 1-5.9-4.6c-.6-1-.9-1.9-.9-2.7 0-.8.4-1.4.8-1.8.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .5.4l.8 1.8c.1.2 0 .4-.1.5l-.4.5c-.1.2-.2.3 0 .6a8 8 0 0 0 3.4 2.7c.3.1.4 0 .6-.1l.6-.7c.2-.2.3-.2.6-.1l1.8.9c.3.1.3.3.3.5s0 .8-.2 1.2Z"/></svg>
  <span>WhatsApp</span>
</a>
    </>
  );
}

/* ── dial de acabados (seccion #acabados) ── */
type FinishKey = "blanco" | "piedra" | "inox" | "corten" | "negro";

const FINISHES: Record<FinishKey, { label: string; ral: string; sku: string }> = {
  blanco: { label: "Blanco", ral: "RAL 9010 · Blanco puro", sku: "GW-RU-BLC" },
  piedra: { label: "Piedra", ral: "RAL 1019 · Gris beige", sku: "GW-RU-PDR" },
  inox: { label: "Inoxidable", ral: "Acero natural, sin pintar", sku: "GW-RU-INX" },
  corten: { label: "Corten", ral: "RAL 8004 · Marrón cobre", sku: "GW-RU-COR" },
  negro: { label: "Negro mate", ral: "RAL 9005 · Negro (mate)", sku: "GW-RU-NGR" },
};

function pickFinish(key: FinishKey) {
  const WA = "584143228003";
  const data = FINISHES[key];
  if (!data) return;

  document.querySelectorAll("#finishPhoto img").forEach((im) => {
    im.classList.toggle("on", im.id === "fph-" + key);
  });
  document.querySelectorAll(".dial button").forEach((b) => {
    b.classList.toggle("on", b.getAttribute("data-key") === key);
  });

  const nameEl = document.getElementById("finishName");
  const ralEl = document.getElementById("finishRal");
  const skuEl = document.getElementById("finishSku");
  const capEl = document.getElementById("finishCap");
  const waEl = document.getElementById("finishWa");

  if (nameEl) nameEl.textContent = data.label;
  if (ralEl) {
    const [first, ...rest] = data.ral.split(" · ");
    ralEl.innerHTML = "<b>" + first + "</b>" + (rest.length ? " · " + rest.join(" · ") : "");
  }
  if (skuEl) skuEl.textContent = data.sku;
  if (capEl) capEl.innerHTML = "<b>\u203a</b> Roll up \u00b7 " + data.label;

  const msg =
    "Hola GardenWorld,\n\nQuiero cotizar:\n\u00b7 Producto: Roll up \u00b7 " +
    data.label +
    " (" +
    data.sku +
    ")\n\n\u00bfMe confirman precio y disponibilidad?";
  waEl?.setAttribute("href", "https://wa.me/" + WA + "?text=" + encodeURIComponent(msg));
}
