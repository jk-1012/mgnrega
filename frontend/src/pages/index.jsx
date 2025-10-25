import useSWR from 'swr'
import axios from 'axios'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const fetcher = url => axios.get(url).then(r => r.data)

export default function Home() {
  const { data: districts } = useSWR('/api/proxy/districts', fetcher)

  // Try auto-detect via browser Geolocation if allowed
  const [detected, setDetected] = useState(null)
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        // call backend to reverse-geocode to district
        const res = await axios.get(`/api/proxy/resolve?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
        setDetected(res.data)
      }, (err) => {
        console.log("geo failed", err)
      })
    }
  }, [])

  return (
    <div style={{padding:20, fontFamily:'Arial'}}>
      <h1 style={{fontSize:28}}>हमारा जिला — MGNREGA</h1>
      <p style={{fontSize:16}}>अपना जिला चुनें या अपने डिवाइस का स्थान उपयोग करके ऑटो-डिटेक्ट करें।</p>

      {detected && detected.district_code ? (
        <div style={{padding:12, border:'1px solid #ccc', marginBottom:12}}>
          <strong>Detected:</strong> {detected.district_name_hi || detected.district_name_en} &nbsp;
          <Link href={`/district/${detected.district_code}`}><a>देखें →</a></Link>
        </div>
      ) : (
        <div style={{padding:12, border:'1px dashed #ccc', marginBottom:12}}>
          <em>District detection not available or permission not given</em>
        </div>
      )}

      <h2 style={{fontSize:18}}>Pick District</h2>
      <ul>
      {districts && districts.map(d => (
        <li key={d.district_code}>
          <Link href={`/district/${d.district_code}`}>
            <a>{d.district_name_hi || d.district_name_en} ({d.district_code})</a>
          </Link>
        </li>
      ))}
      </ul>
    </div>
  )
}
