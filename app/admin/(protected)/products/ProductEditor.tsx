'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProductCard, type ProductCardVariant } from '@/components/catalog/ProductCard';
import { adminApi, messageForError, slugFromName } from '@/lib/admin/api';
import { buildProductPreview } from '@/lib/admin/product-preview';
import type { Category, Product, ProductImage, ProductSpec, Upload } from '@/lib/admin/types';
import { LoadingBlock } from '../../components/Loading';
import { Modal } from '../../components/Modal';
import { useAdmin } from '../../components/AdminShell';

type FormState = {
  name: string; slug: string; sku: string; brand: string; model: string; categoryId: string;
  shortDescription: string; description: string; benefits: string; uses: string;
  price: string; compareAtPrice: string; currency: string; stockQuantity: string; stockStatus: string;
  deliveryText: string; warrantyText: string; status: Product['status']; published: boolean;
  featured: boolean; onSale: boolean; newArrival: boolean; indexable: boolean;
  seoTitle: string; seoDescription: string; mainImagePath: string;
};

const emptyForm: FormState = {
  name: '', slug: '', sku: '', brand: '', model: '', categoryId: '', shortDescription: '',
  description: '', benefits: '', uses: '', price: '', compareAtPrice: '', currency: 'USD',
  stockQuantity: '', stockStatus: 'in_stock', deliveryText: '', warrantyText: '', status: 'draft',
  published: false, featured: false, onSale: false, newArrival: false, indexable: true,
  seoTitle: '', seoDescription: '', mainImagePath: '',
};

function formFromProduct(product: Product): FormState {
  return {
    name: product.name, slug: product.slug, sku: product.sku ?? '', brand: product.brand ?? '', model: product.model ?? '', categoryId: product.categoryId?.toString() ?? '',
    shortDescription: product.shortDescription ?? '', description: product.description ?? '', benefits: product.benefits ?? '', uses: product.uses ?? '',
    price: String(product.price), compareAtPrice: product.compareAtPrice?.toString() ?? '', currency: product.currency,
    stockQuantity: product.stockQuantity?.toString() ?? '', stockStatus: product.stockStatus,
    deliveryText: product.deliveryText ?? '', warrantyText: product.warrantyText ?? '', status: product.status,
    published: product.published, featured: product.featured, onSale: product.onSale, newArrival: product.newArrival,
    indexable: product.indexable, seoTitle: product.seoTitle ?? '', seoDescription: product.seoDescription ?? '', mainImagePath: product.mainImagePath ?? '',
  };
}

const nullable = (value: string) => value.trim() || null;

export function ProductEditor({ productId }: { productId?: number }) {
  const router = useRouter();
  const { notify } = useAdmin();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [specs, setSpecs] = useState<ProductSpec[]>([]);
  const [deletedSpecIds, setDeletedSpecIds] = useState<number[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(Boolean(productId));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [slugTouched, setSlugTouched] = useState(Boolean(productId));
  const [variant, setVariant] = useState<ProductCardVariant>('catalog');
  const [previewMobile, setPreviewMobile] = useState(false);
  const [removeImageIndex, setRemoveImageIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const requests: Promise<unknown>[] = [adminApi<{ categories: Category[] }>('/api/admin/categories')];
      if (productId) requests.push(adminApi<{ product: Product; images: ProductImage[]; specs: ProductSpec[] }>(`/api/admin/products/${productId}`));
      const [categoryData, productData] = await Promise.all(requests) as [{ categories: Category[] }, { product: Product; images: ProductImage[]; specs: ProductSpec[] }?];
      setCategories(categoryData.categories);
      if (productData) {
        setForm(formFromProduct(productData.product));
        setImages(productData.images);
        setSpecs(productData.specs);
      }
    } catch (caught) { setError(messageForError(caught)); }
    finally { setLoading(false); }
  }, [productId]);
  useEffect(() => { void load(); }, [load]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function updateName(value: string) {
    setForm((current) => ({ ...current, name: value, slug: slugTouched ? current.slug : slugFromName(value) }));
  }

  const preview = useMemo(() => buildProductPreview(form, images), [form, images]);

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { notify('El archivo supera el tamaño permitido.', 'error'); return; }
    setUploading(true);
    try {
      const body = new FormData(); body.set('file', file);
      const { upload } = await adminApi<{ upload: Upload }>('/api/admin/uploads', { method: 'POST', body });
      let added: ProductImage = { uploadId: upload.id, path: upload.path, url: upload.url, altText: form.name || file.name, displayOrder: images.length + 1 };
      if (productId) {
        const result = await adminApi<{ image: ProductImage }>(`/api/admin/products/${productId}/images`, { method: 'POST', body: JSON.stringify({ path: upload.path, altText: added.altText, displayOrder: added.displayOrder }) });
        added = result.image;
      }
      setImages((current) => [...current, added]);
      if (!form.mainImagePath) update('mainImagePath', upload.path);
      notify('Imagen subida');
    } catch (caught) { notify(messageForError(caught, 'No fue posible subir la imagen.'), 'error'); }
    finally { setUploading(false); }
  }

  function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return items;
    const next = [...items]; [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    return next;
  }

  async function removeImage() {
    if (removeImageIndex === null) return;
    const image = images[removeImageIndex];
    setSaving(true);
    try {
      if (productId && image.id) await adminApi(`/api/admin/products/${productId}/images/${image.id}`, { method: 'DELETE' });
      else if (image.uploadId) await adminApi(`/api/admin/uploads/${image.uploadId}`, { method: 'DELETE' });
      const remaining = images.filter((_, index) => index !== removeImageIndex);
      setImages(remaining);
      if (form.mainImagePath === image.path) update('mainImagePath', remaining[0]?.path ?? '');
      notify('Imagen eliminada');
      setRemoveImageIndex(null);
    } catch (caught) { notify(messageForError(caught), 'error'); }
    finally { setSaving(false); }
  }

  async function syncImages(id: number): Promise<ProductImage[]> {
    const attached: ProductImage[] = [];
    for (const [index, image] of images.entries()) {
      if (image.id) {
        const result = await adminApi<{ image: ProductImage }>(`/api/admin/products/${id}/images/${image.id}`, { method: 'PUT', body: JSON.stringify({ altText: image.altText, displayOrder: index + 1 }) });
        attached.push(result.image);
      } else {
        const result = await adminApi<{ image: ProductImage }>(`/api/admin/products/${id}/images`, { method: 'POST', body: JSON.stringify({ path: image.path, altText: image.altText, displayOrder: index + 1 }) });
        attached.push(result.image);
      }
    }
    if (attached.length) await adminApi(`/api/admin/products/${id}/images/order`, { method: 'PUT', body: JSON.stringify({ ids: attached.map((image) => image.id) }) });
    return attached;
  }

  async function syncSpecs(id: number): Promise<ProductSpec[]> {
    await Promise.all(deletedSpecIds.map((specId) => adminApi(`/api/admin/products/${id}/specs/${specId}`, { method: 'DELETE' })));
    const saved: ProductSpec[] = [];
    for (const [index, spec] of specs.entries()) {
      const endpoint = spec.id ? `/api/admin/products/${id}/specs/${spec.id}` : `/api/admin/products/${id}/specs`;
      const result = await adminApi<{ spec: ProductSpec }>(endpoint, { method: spec.id ? 'PUT' : 'POST', body: JSON.stringify({ name: spec.name, value: spec.value, displayOrder: index + 1 }) });
      saved.push(result.spec);
    }
    if (saved.length) await adminApi(`/api/admin/products/${id}/specs/order`, { method: 'PUT', body: JSON.stringify({ ids: saved.map((spec) => spec.id) }) });
    return saved;
  }

  async function save() {
    setError('');
    if (form.name.trim().length < 2) { setError('El nombre debe tener al menos 2 caracteres.'); return; }
    if (form.onSale && (!form.compareAtPrice || Number(form.compareAtPrice) <= Number(form.price || 0))) { setError('Para activar Oferta, el precio anterior debe ser mayor al precio actual.'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), slug: form.slug.trim() || undefined, sku: nullable(form.sku), brand: nullable(form.brand), model: nullable(form.model),
        categoryId: form.categoryId ? Number(form.categoryId) : null, shortDescription: nullable(form.shortDescription), description: nullable(form.description),
        benefits: nullable(form.benefits), uses: nullable(form.uses), price: Number(form.price || 0), compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
        currency: form.currency, stockQuantity: form.stockQuantity ? Number(form.stockQuantity) : null, stockStatus: form.stockStatus,
        deliveryText: nullable(form.deliveryText), warrantyText: nullable(form.warrantyText), status: form.status,
        published: form.status === 'published' ? form.published : false, featured: form.featured, onSale: form.onSale, newArrival: form.newArrival,
        mainImagePath: form.mainImagePath || null, seoTitle: nullable(form.seoTitle), seoDescription: nullable(form.seoDescription), indexable: form.indexable,
      };
      const endpoint = productId ? `/api/admin/products/${productId}` : '/api/admin/products';
      const { product } = await adminApi<{ product: Product }>(endpoint, { method: productId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      const [savedImages, savedSpecs] = await Promise.all([syncImages(product.id), syncSpecs(product.id)]);
      setImages(savedImages); setSpecs(savedSpecs); setDeletedSpecIds([]);
      notify(productId ? 'Producto guardado' : 'Producto creado');
      if (!productId) router.replace(`/admin/products/${product.id}`);
      else setForm(formFromProduct(product));
      router.refresh();
    } catch (caught) { setError(messageForError(caught, 'No fue posible guardar el producto.')); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="admin-panel"><LoadingBlock rows={7}/></div>;

  return <>
    <header className="admin-page-head"><div><p className="admin-kicker">{productId ? 'Editar catálogo' : 'Crear catálogo'}</p><h2>{productId ? form.name || 'Editar producto' : 'Nuevo producto'}</h2><p>Completa la información y revisa la card antes de publicar.</p></div><Link href="/admin/products" className="admin-button admin-button--quiet">← Volver a productos</Link></header>
    {error ? <div className="admin-alert" role="alert">{error}</div> : null}
    <div className="admin-form-grid">
      <div className="admin-form-stack">
        <FormPanel title="Información" subtitle="Datos principales del producto."><div className="admin-fields">
          <Field label="Nombre" id="product-name" full><input id="product-name" required value={form.name} onChange={(e) => updateName(e.target.value)}/></Field>
          <Field label="Slug" id="product-slug"><input id="product-slug" value={form.slug} onChange={(e) => { setSlugTouched(true); update('slug', slugFromName(e.target.value)); }}/></Field>
          <Field label="SKU" id="product-sku"><input id="product-sku" value={form.sku} onChange={(e) => update('sku', e.target.value)}/></Field>
          <Field label="Marca" id="product-brand"><input id="product-brand" value={form.brand} onChange={(e) => update('brand', e.target.value)}/></Field>
          <Field label="Modelo" id="product-model"><input id="product-model" value={form.model} onChange={(e) => update('model', e.target.value)}/></Field>
          <Field label="Categoría" id="product-category" full><select id="product-category" value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)}><option value="">Sin categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
          <Field label="Descripción corta" id="product-short" full><textarea id="product-short" maxLength={400} value={form.shortDescription} onChange={(e) => update('shortDescription', e.target.value)}/><small>{form.shortDescription.length}/400</small></Field>
          <Field label="Descripción completa" id="product-description" full><textarea id="product-description" maxLength={8000} value={form.description} onChange={(e) => update('description', e.target.value)}/></Field>
          <Field label="Beneficios" id="product-benefits" full><textarea id="product-benefits" maxLength={4000} value={form.benefits} onChange={(e) => update('benefits', e.target.value)}/></Field>
          <Field label="Usos" id="product-uses" full><textarea id="product-uses" maxLength={4000} value={form.uses} onChange={(e) => update('uses', e.target.value)}/></Field>
        </div></FormPanel>

        <FormPanel title="Imágenes" subtitle="JPEG, PNG o WebP. Máximo 5 MB por archivo.">
          <label className="admin-upload-drop"><strong>{uploading ? 'Subiendo imagen…' : 'Añadir imagen del producto'}</strong><small>La primera imagen se marca como principal.</small><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading || saving} onChange={(event) => { void uploadImage(event.target.files?.[0]); event.currentTarget.value = ''; }}/></label>
          <div className="admin-image-list">{images.map((image, index) => <div className="admin-image-row" key={image.id ?? image.path}><img src={image.url} alt=""/><div><label className="sr-only" htmlFor={`alt-${index}`}>Texto alternativo de imagen {index + 1}</label><input id={`alt-${index}`} placeholder="Texto alternativo" value={image.altText ?? ''} onChange={(e) => setImages((items) => items.map((item, i) => i === index ? {...item, altText: e.target.value} : item))}/>{form.mainImagePath === image.path ? <small>Imagen principal</small> : <button type="button" className="admin-text-button" onClick={() => update('mainImagePath', image.path)}>Hacer principal</button>}</div><div className="admin-order-controls"><button type="button" className="admin-button admin-button--quiet admin-button--icon" aria-label="Subir imagen" disabled={index === 0} onClick={() => setImages((items) => moveItem(items, index, -1))}>↑</button><button type="button" className="admin-button admin-button--quiet admin-button--icon" aria-label="Bajar imagen" disabled={index === images.length - 1} onClick={() => setImages((items) => moveItem(items, index, 1))}>↓</button><button type="button" className="admin-button admin-button--quiet admin-button--icon" aria-label="Eliminar imagen" onClick={() => setRemoveImageIndex(index)}>×</button></div></div>)}</div>
        </FormPanel>

        <FormPanel title="Precio y disponibilidad" subtitle="Información comercial y estado de stock."><div className="admin-fields">
          <Field label="Precio actual" id="product-price"><input id="product-price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => update('price', e.target.value)}/></Field>
          <Field label="Precio anterior" id="product-compare"><input id="product-compare" type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={(e) => update('compareAtPrice', e.target.value)}/></Field>
          <Field label="Moneda" id="product-currency"><select id="product-currency" value={form.currency} onChange={(e) => update('currency', e.target.value)}><option value="USD">USD</option><option value="VES">VES</option><option value="EUR">EUR</option></select></Field>
          <Field label="Cantidad en stock" id="product-stock"><input id="product-stock" type="number" min="0" step="1" value={form.stockQuantity} onChange={(e) => update('stockQuantity', e.target.value)}/></Field>
          <Field label="Estado de stock" id="product-stock-status" full><select id="product-stock-status" value={form.stockStatus} onChange={(e) => update('stockStatus', e.target.value)}><option value="in_stock">Disponible</option><option value="out_of_stock">Agotado</option><option value="preorder">Preventa</option><option value="discontinued">Descontinuado</option></select></Field>
          <Field label="Delivery" id="product-delivery" full><input id="product-delivery" value={form.deliveryText} onChange={(e) => update('deliveryText', e.target.value)}/></Field>
          <Field label="Garantía" id="product-warranty" full><input id="product-warranty" value={form.warrantyText} onChange={(e) => update('warrantyText', e.target.value)}/></Field>
        </div></FormPanel>

        <FormPanel title="Especificaciones" subtitle="Añade pares de nombre y valor; el orden se conserva.">
          <div className="admin-repeat-list">{specs.map((spec, index) => <div className="admin-repeat-row" key={spec.id ?? `new-${index}`}><input aria-label={`Nombre de especificación ${index + 1}`} placeholder="Material" value={spec.name} onChange={(e) => setSpecs((items) => items.map((item, i) => i === index ? {...item, name: e.target.value} : item))}/><input aria-label={`Valor de especificación ${index + 1}`} placeholder="Acero inoxidable 304" value={spec.value} onChange={(e) => setSpecs((items) => items.map((item, i) => i === index ? {...item, value: e.target.value} : item))}/><div className="admin-order-controls"><button type="button" className="admin-button admin-button--quiet admin-button--icon" aria-label="Subir especificación" disabled={index === 0} onClick={() => setSpecs((items) => moveItem(items, index, -1))}>↑</button><button type="button" className="admin-button admin-button--quiet admin-button--icon" aria-label="Bajar especificación" disabled={index === specs.length - 1} onClick={() => setSpecs((items) => moveItem(items, index, 1))}>↓</button><button type="button" className="admin-button admin-button--quiet admin-button--icon" aria-label="Eliminar especificación" onClick={() => { if (spec.id) setDeletedSpecIds((ids) => [...ids, spec.id!]); setSpecs((items) => items.filter((_, i) => i !== index)); }}>×</button></div></div>)}</div>
          <button type="button" className="admin-button admin-button--quiet" style={{marginTop: '.8rem'}} onClick={() => setSpecs((items) => [...items, {name: '', value: '', displayOrder: items.length + 1}])}>＋ Añadir especificación</button>
        </FormPanel>

        <FormPanel title="SEO del producto" subtitle="Se usará en la ficha pública durante la Fase 3."><div className="admin-fields">
          <Field label="SEO title" id="product-seo-title" full><input id="product-seo-title" maxLength={200} value={form.seoTitle} onChange={(e) => update('seoTitle', e.target.value)}/></Field>
          <Field label="SEO description" id="product-seo-description" full><textarea id="product-seo-description" maxLength={400} value={form.seoDescription} onChange={(e) => update('seoDescription', e.target.value)}/></Field>
          <div className="admin-field admin-field--full"><span>Vista previa en Google</span><div style={{padding: '1rem', border: '1px solid rgba(23,56,47,.14)', background: '#fff'}}><strong style={{display: 'block', color: '#315148', fontSize: '.88rem'}}>{form.seoTitle || form.name || 'Título SEO del producto'}</strong><small style={{display: 'block', color: '#398146', margin: '.2rem 0'}}>gardenworld.online/productos/{form.slug || 'slug'}/</small><p style={{margin: 0, color: '#66756f', fontSize: '.68rem'}}>{form.seoDescription || form.shortDescription || 'La descripción SEO aparecerá aquí.'}</p></div></div>
        </div></FormPanel>

        <div className="admin-savebar"><p>Los cambios se aplican al guardar.</p><div className="admin-button-row"><Link href="/admin/products" className="admin-button admin-button--quiet">Cancelar</Link><button type="button" className="admin-button admin-button--accent" disabled={saving || uploading} onClick={save}>{saving ? 'Guardando…' : productId ? 'Guardar cambios' : 'Crear producto'}</button></div></div>
      </div>

      <aside className="admin-sticky">
        <div className="admin-panel"><div className="admin-panel__head"><div><h2>Vista previa en la web</h2><p>Se actualiza mientras escribes.</p></div></div><div className="admin-panel__body">
          <div className="admin-preview-tabs" aria-label="Variante de card">{([['catalog','Catálogo'],['featured','Destacado'],['offer','Oferta']] as const).map(([key,label]) => <button type="button" key={key} className={variant === key ? 'is-active' : ''} aria-pressed={variant === key} onClick={() => setVariant(key)}>{label}</button>)}</div>
          <div className="admin-preview-tabs" aria-label="Ancho de vista previa"><button type="button" className={!previewMobile ? 'is-active' : ''} aria-pressed={!previewMobile} onClick={() => setPreviewMobile(false)}>Desktop</button><button type="button" className={previewMobile ? 'is-active' : ''} aria-pressed={previewMobile} onClick={() => setPreviewMobile(true)}>Mobile</button></div>
          <div className={`admin-preview-frame ${previewMobile ? 'is-mobile' : ''}`}><ProductCard product={preview} variant={variant}/></div>
        </div></div>
        <div className="admin-panel"><div className="admin-panel__head"><h2>Visibilidad</h2></div><div className="admin-panel__body admin-form-stack">
          <Field label="Estado" id="product-status" full><select id="product-status" value={form.status} onChange={(e) => { const status = e.target.value as Product['status']; setForm((current) => ({...current, status, published: status === 'published'})); }}><option value="draft">Borrador</option><option value="published">Publicado</option><option value="archived">Archivado</option></select></Field>
          <div className="admin-checks"><Check label="Publicado" checked={form.published} disabled={form.status !== 'published'} onChange={(value) => update('published', value)}/><Check label="Destacado" checked={form.featured} onChange={(value) => update('featured', value)}/><Check label="Oferta" checked={form.onSale} onChange={(value) => update('onSale', value)}/><Check label="Novedad" checked={form.newArrival} onChange={(value) => update('newArrival', value)}/><Check label="Indexable" checked={form.indexable} onChange={(value) => update('indexable', value)}/></div>
        </div></div>
      </aside>
    </div>
    <Modal open={removeImageIndex !== null} title="Quitar imagen" description="La imagen se retirará del producto. Esta acción no se puede deshacer desde el panel." confirmLabel="Quitar imagen" destructive busy={saving} onClose={() => setRemoveImageIndex(null)} onConfirm={removeImage}/>
  </>;
}

function FormPanel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <section className="admin-panel"><div className="admin-panel__head"><div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div></div><div className="admin-panel__body">{children}</div></section>;
}

function Field({ label, id, full = false, children }: { label: string; id: string; full?: boolean; children: React.ReactNode }) {
  return <div className={`admin-field ${full ? 'admin-field--full' : ''}`}><label htmlFor={id}>{label}</label>{children}</div>;
}

function Check({ label, checked, disabled = false, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return <label className="admin-check"><input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)}/><span>{label}</span></label>;
}
