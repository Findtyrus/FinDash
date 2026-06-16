import { useRef, useEffect } from 'react'
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

export default function PriceChart({ history }) {
  const ref = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!history || !ref.current) return

    if (chartRef.current) chartRef.current.destroy()

    const labels = history.timestamps.map(t =>
      new Date(t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    )
    const closes = history.closes.map(c => c != null ? parseFloat(c.toFixed(2)) : null)
    const first  = closes.find(c => c != null)
    const last   = [...closes].reverse().find(c => c != null)
    const pos    = last >= first
    const color  = pos ? '#1D9E75' : '#E24B4A'

    chartRef.current = new Chart(ref.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: closes,
          borderColor: color,
          backgroundColor: color + '18',
          fill: true,
          pointRadius: 0,
          borderWidth: 1.5,
          tension: 0.1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#1a1a1a',
            borderColor: '#333',
            borderWidth: 1,
            callbacks: { label: ctx => `$${ctx.parsed.y.toFixed(2)}` },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxTicksLimit: 8, maxRotation: 0, color: '#666', font: { size: 10 } },
            border: { color: '#333' },
          },
          y: {
            position: 'right',
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#666', font: { size: 10 }, callback: v => '$' + v },
            border: { color: '#333' },
          },
        },
      },
    })

    return () => chartRef.current?.destroy()
  }, [history])

  return (
    <div className="relative w-full h-52">
      <canvas ref={ref} role="img" aria-label="1-year price chart" />
    </div>
  )
}
