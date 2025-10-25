import { useRouter } from 'next/router'
import useSWR from 'swr'
import axios from 'axios'
import { useEffect } from 'react'

const fetcher = url => axios.get(url).then(r => r.data)

export default function DistrictPage() {
  const router = useRouter()
  const { code } = router.query
  const { data: summary } = useSWR(code ? `/api/proxy/districts/${code}/summary` : null, fetcher)
  const { data: trend } = useSWR(code ? `/api/proxy/districts/${code}/trend?months=12` : null, fetcher)

  useEffect(() => {
    // speak summary in Hindi (TTS)
    if (summary && 'speechSynthesis' in window) {
      const text = `${summary.district_name_hi || summary.district_name_en} के लिए ${summary.metrics.people_benefitted} लाभार्थियों को इस महीने काम मिला।`
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'hi-IN'
      // don't auto-play on load without user interaction in some browsers
      // attach to a button in real UI
      // window.speechSynthesis.speak(u)
    }
  }, [summary])

  if (!summary) return <div style={{padding:20}}>Loading...</div>

  return (
    <div style={{padding:20}}>
      <h1 style={{fontSize:26}}>{summary.district_name_hi || summary.district_name_en}</h1>
      <div style={{display:'flex', gap:10}}>
        <Card title="लाभार्थी" value={summary.metrics.people_benefitted}/>
        <Card title="कुल काम (work days)" value={summary.metrics.total_work_days}/>
        <Card title="भुगतान (₹)" value={summary.metrics.total_payments}/>
      </div>

      <h3>पिछले 12 महीने</h3>
      <ol>
        {trend && trend.map(t => (
          <li key={t.year_month}>{t.year_month}: {t.people_benefitted} लाभार्थी</li>
        ))}
      </ol>
    </div>
  )
}

function Card({title, value}) {
  return <div style={{border:'1px solid #ddd', padding:12, minWidth:140}}>
    <div style={{fontSize:14}}>{title}</div>
    <div style={{fontSize:20, fontWeight:700}}>{value !== null ? value : '—'}</div>
    <button onClick={() => speak(`${title} ${value}`)}>🔊</button>
  </div>
}

function speak(text) {
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'hi-IN'
    window.speechSynthesis.speak(u)
  }
}
