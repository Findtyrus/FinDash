export default function NewsPanel({ news, hasFmp }) {
  if (!hasFmp) {
    return (
      <div className="card">
        <div className="text-xs text-neutral-500 uppercase tracking-widest mb-3">News</div>
        <p className="text-sm text-neutral-400">Add your FMP key to see news.</p>
      </div>
    )
  }

  if (!news?.length) {
    return (
      <div className="card">
        <div className="text-xs text-neutral-500 uppercase tracking-widest mb-3">News</div>
        <p className="text-sm text-neutral-400">No recent news found.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="text-xs text-neutral-500 uppercase tracking-widest mb-3">
        News <span className="ml-1 text-xs bg-brand-900 text-brand-400 px-1.5 py-0.5 rounded">FMP</span>
      </div>
      {news.slice(0, 6).map((item, i) => (
        <div
          key={i}
          className="news-item"
          onClick={() => window.open(item.url, '_blank')}
        >
          <div className="text-xs text-neutral-500 mb-1">{item.site}</div>
          <div className="text-sm text-neutral-200 leading-snug hover:text-white">{item.title}</div>
          {item.publishedDate && (
            <div className="text-xs text-neutral-600 mt-1">
              {new Date(item.publishedDate).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
