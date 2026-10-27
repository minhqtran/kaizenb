import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return <section className="page-container not-found"><div className="eyebrow">Page not found</div><h1>Lost for words?</h1><p>That page isn't here, but there's always another story to read.</p><Link className="button" to="/">Explore stories</Link></section>
}