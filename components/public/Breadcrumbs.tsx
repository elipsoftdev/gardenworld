import Link from 'next/link';
import { absoluteUrl } from '@/lib/site';

export type BreadcrumbItem = { label: string; href?: string };

export default function Breadcrumbs({ items, structured = true }: { items: BreadcrumbItem[]; structured?: boolean }) {
  const data = structured ? { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.label, ...(item.href ? { item: absoluteUrl(item.href) } : {}) })) } : null;
  return <>{data ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} /> : null}<nav className="breadcrumbs" aria-label="Migas de pan"><ol>{items.map((item, index) => <li key={`${item.label}-${index}`}>{item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>)}</ol></nav></>;
}
