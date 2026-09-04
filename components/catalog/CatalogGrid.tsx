'use client';

import { useMemo, useState } from 'react';
import { ProductCard } from './ProductCard';
import type { PublicCategory, PublicProduct } from '@/lib/public/catalog';

export default function CatalogGrid({ products, categories }: { products: PublicProduct[]; categories: PublicCategory[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('es');
    return products.filter((product) => (!category || product.categorySlug === category) && (!needle || `${product.name} ${product.shortDescription ?? ''}`.toLocaleLowerCase('es').includes(needle)));
  }, [category, products, query]);
  const showSearch = products.length >= 6;
  const showCategories = categories.length >= 2;
  return <>
    {showSearch || showCategories ? <div className="catalog-tools" aria-label="Herramientas del catálogo">{showSearch ? <label><span>Buscar</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar productos" /></label> : null}{showCategories ? <label><span>Categoría</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Todas las categorías</option>{categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label> : null}<p aria-live="polite">{visible.length} resultado{visible.length === 1 ? '' : 's'}</p></div> : null}
    {visible.length > 0 ? <div className="catalog-grid">{visible.map((product) => <ProductCard key={product.id} href={`/productos/${product.slug}/`} variant="catalog" product={{ ...product, imageUrl: product.mainImageUrl, imageAlt: product.name }} />)}</div> : <div className="public-empty"><p className="eyebrow">Catálogo</p><h2>No encontramos productos con esa selección.</h2><p>Prueba otra búsqueda o conversa con nuestro equipo para recibir orientación.</p></div>}
  </>;
}
