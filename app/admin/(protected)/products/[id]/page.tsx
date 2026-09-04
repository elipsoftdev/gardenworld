import { notFound } from 'next/navigation';
import { ProductEditor } from '../ProductEditor';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) notFound();
  return <ProductEditor productId={id}/>;
}
