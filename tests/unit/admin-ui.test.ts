import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AdminApiError, formatMoney, messageForError, slugFromName } from '../../lib/admin/api';
import { buildProductPreview } from '../../lib/admin/product-preview';

describe('admin UI helpers', () => {
  it('normalises product names into stable slugs', () => {
    assert.equal(slugFromName('  Porta Mangueras Ágata  '), 'porta-mangueras-agata');
  });

  it('maps API errors to safe Spanish copy', () => {
    const error = new AdminApiError(403, 'forbidden', 'No tienes permisos para realizar esta acción.');
    assert.equal(messageForError(error), 'No tienes permisos para realizar esta acción.');
    assert.equal(messageForError(new Error('database secret')), 'No se pudo completar la acción.');
  });

  it('formats product prices without inventing missing values', () => {
    assert.equal(formatMoney(null), 'Precio por definir');
    assert.match(formatMoney(140, 'USD'), /140/);
  });
});

describe('live ProductCard preview', () => {
  const base = {
    name: '', shortDescription: '', price: '', compareAtPrice: '', currency: 'USD',
    mainImagePath: '', featured: false, onSale: false,
  };

  it('reacts to unsaved name, price, sale and description changes', () => {
    const preview = buildProductPreview({
      ...base,
      name: 'Premium Silver', shortDescription: 'Orden y diseño para exteriores.',
      price: '140', compareAtPrice: '165', onSale: true,
    }, []);
    assert.equal(preview.name, 'Premium Silver');
    assert.equal(preview.shortDescription, 'Orden y diseño para exteriores.');
    assert.equal(preview.price, 140);
    assert.equal(preview.compareAtPrice, 165);
    assert.equal(preview.onSale, true);
  });

  it('uses the selected main image and tolerates an incomplete form', () => {
    assert.deepEqual(buildProductPreview(base, []).imageUrl, undefined);
    const preview = buildProductPreview({...base, mainImagePath: 'b.webp'}, [
      {path: 'a.webp', url: '/media/a.webp', altText: 'A', displayOrder: 1},
      {path: 'b.webp', url: '/media/b.webp', altText: 'B', displayOrder: 2},
    ]);
    assert.equal(preview.imageUrl, '/media/b.webp');
    assert.equal(preview.imageAlt, 'B');
  });
});
