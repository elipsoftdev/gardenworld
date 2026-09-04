export function LoadingBlock({ rows = 4 }: { rows?: number }) {
  return <div className="admin-skeleton" aria-label="Cargando" aria-busy="true">{Array.from({ length: rows }, (_, index) => <span key={index}/>)}</div>;
}

export function EmptyState({ title, action }: { title: string; action?: React.ReactNode }) {
  return <div className="admin-empty"><span aria-hidden="true">✦</span><h2>{title}</h2>{action}</div>;
}
