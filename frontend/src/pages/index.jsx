import useSWR from 'swr'
import axios from 'axios'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const fetcher = url => axios.get(url).then(r => r.data)

export default function Home() {
  const [lang, setLang] = useState('hi')
  const [search, setSearch] = useState('')
  const [detected, setDetected] = useState(null)
  const [detecting, setDetecting] = useState(false)
  const [geoError, setGeoError] = useState(null)

  const { data: districts, error } = useSWR('/api/proxy/districts', fetcher)

  // Auto-detect location
  const detectLocation = () => {
    setGeoError(null)

    if (!("geolocation" in navigator)) {
      setGeoError(lang === 'hi'
        ? 'आपके डिवाइस पर लोकेशन उपलब्ध नहीं है'
        : 'Location not available on your device')
      return
    }

    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          console.log('Got position:', pos.coords.latitude, pos.coords.longitude)
          const res = await axios.get(
            `/api/proxy/resolve?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          )
          console.log('Geocoding result:', res.data)

          if (res.data && res.data.district_code) {
            setDetected(res.data)
          } else {
            setGeoError(res.data.error || (lang === 'hi'
              ? 'जिला नहीं मिला'
              : 'District not found'))
          }
        } catch (err) {
          console.error('Geocoding failed:', err)
          setGeoError(lang === 'hi'
            ? 'जिला पता नहीं लगा सके'
            : 'Could not detect district')
        } finally {
          setDetecting(false)
        }
      },
      (err) => {
        console.error('Geolocation error:', err)
        setDetecting(false)

        let errorMsg = ''
        if (err.code === 1) {
          errorMsg = lang === 'hi'
            ? 'लोकेशन परमिशन दें'
            : 'Please allow location access'
        } else if (err.code === 2) {
          errorMsg = lang === 'hi'
            ? 'लोकेशन उपलब्ध नहीं है'
            : 'Location unavailable'
        } else {
          errorMsg = lang === 'hi'
            ? 'लोकेशन टाइमआउट'
            : 'Location timeout'
        }
        setGeoError(errorMsg)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  // Filter districts based on search
  const filteredDistricts = districts?.filter(d => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      (d.district_name_en && d.district_name_en.toLowerCase().includes(searchLower)) ||
      (d.district_name_hi && d.district_name_hi.includes(search)) ||
      (d.district_code && d.district_code.toLowerCase().includes(searchLower)) ||
      (d.state && d.state.toLowerCase().includes(searchLower))
    )
  })

  const t = translations[lang]

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🏛️</span>
          <h1 style={styles.title}>{t.title}</h1>
        </div>
        <button
          onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}
          style={styles.langButton}
        >
          {lang === 'hi' ? 'English' : 'हिंदी'}
        </button>
      </div>

      {/* Subtitle */}
      <p style={styles.subtitle}>{t.subtitle}</p>

      {/* Location Detection Card */}
      <div style={styles.locationCard}>
        <div style={styles.locationIcon}>📍</div>
        <div style={styles.locationContent}>
          <h3 style={styles.locationTitle}>{t.autoDetect}</h3>
          <p style={styles.locationText}>{t.autoDetectDesc}</p>

          {detected && detected.district_code ? (
            <div style={styles.detectedBox}>
              <div style={styles.detectedText}>
                ✅ {t.detected}: <strong>
                  {lang === 'hi' ? detected.district_name_hi : detected.district_name_en}
                </strong>
              </div>
              <Link href={`/district/${detected.district_code}`}>
                <a style={styles.viewButton}>{t.view} →</a>
              </Link>
            </div>
          ) : geoError ? (
            <div>
              <div style={styles.errorText}>⚠️ {geoError}</div>
              <button
                onClick={detectLocation}
                style={styles.detectButton}
              >
                🔄 {t.tryAgain}
              </button>
            </div>
          ) : (
            <button
              onClick={detectLocation}
              disabled={detecting}
              style={{
                ...styles.detectButton,
                opacity: detecting ? 0.6 : 1,
                cursor: detecting ? 'wait' : 'pointer'
              }}
            >
              {detecting ? t.detecting : t.detectMyLocation}
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div style={styles.searchBox}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={styles.clearButton}
          >
            ✕
          </button>
        )}
      </div>

      {/* Districts List */}
      <div style={styles.districtsList}>
        <h2 style={styles.listTitle}>
          {t.selectDistrict}
          {filteredDistricts && ` (${filteredDistricts.length})`}
        </h2>

        {error && (
          <div style={styles.errorBox}>
            ⚠️ {t.errorLoading}
          </div>
        )}

        {!districts && !error && (
          <div style={styles.loading}>
            <div style={styles.spinner} />
            <p>{t.loading}</p>
          </div>
        )}

        {filteredDistricts && filteredDistricts.length === 0 && (
          <div style={styles.noResults}>
            {t.noResults}
          </div>
        )}

        <div style={styles.grid}>
          {filteredDistricts?.slice(0, 50).map(d => (
            <Link key={d.district_code} href={`/district/${d.district_code}`}>
              <a style={styles.districtCard}>
                <div style={styles.districtIcon}>🏛️</div>
                <div style={styles.districtInfo}>
                  <div style={styles.districtName}>
                    {lang === 'hi' ? (d.district_name_hi || d.district_name_en) : d.district_name_en}
                  </div>
                  <div style={styles.districtState}>{d.state}</div>
                </div>
                <div style={styles.arrow}>→</div>
              </a>
            </Link>
          ))}
        </div>

        {filteredDistricts && filteredDistricts.length > 50 && (
          <div style={styles.moreResults}>
            {t.showing50of} {filteredDistricts.length} {t.districts}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div style={styles.infoBox}>
        <h3 style={styles.infoTitle}>ℹ️ {t.aboutTitle}</h3>
        <p style={styles.infoPara}>{t.aboutText1}</p>
        <p style={styles.infoPara}>{t.aboutText2}</p>
        <div style={styles.helpline}>
          <strong>📞 {t.helpline}:</strong> 1800-345-4224
        </div>
      </div>
    </div>
  )
}

const translations = {
  hi: {
    title: 'हमारा मनरेगा',
    subtitle: 'अपने जिले का मनरेगा डेटा देखें - सरल भाषा में',
    autoDetect: 'अपना जिला ऑटो-डिटेक्ट करें',
    autoDetectDesc: 'अपने फ़ोन की लोकेशन से जिला पता करें',
    detectMyLocation: '📍 मेरा जिला पता करें',
    detecting: 'पता लगा रहे हैं...',
    detected: 'आपका जिला',
    view: 'देखें',
    tryAgain: 'फिर कोशिश करें',
    searchPlaceholder: 'जिला खोजें... (नाम या कोड)',
    selectDistrict: 'या अपना जिला चुनें',
    errorLoading: 'डेटा लोड नहीं हो सका',
    loading: 'लोड हो रहा है...',
    noResults: 'कोई जिला नहीं मिला',
    showing50of: 'दिखा रहे हैं पहले 50',
    districts: 'जिले',
    aboutTitle: 'मनरेगा के बारे में',
    aboutText1: 'मनरेगा (महात्मा गांधी राष्ट्रीय ग्रामीण रोज़गार गारंटी अधिनियम) गांव के लोगों को साल में कम से कम 100 दिन का रोज़गार देता है।',
    aboutText2: 'यह वेबसाइट आपको आपके जिले का मनरेगा डेटा सरल तरीके से दिखाती है।',
    helpline: 'हेल्पलाइन'
  },
  en: {
    title: 'Our MGNREGA',
    subtitle: 'View your district\'s MGNREGA data - in simple language',
    autoDetect: 'Auto-detect Your District',
    autoDetectDesc: 'Use your phone\'s location to find your district',
    detectMyLocation: '📍 Detect My District',
    detecting: 'Detecting...',
    detected: 'Your District',
    view: 'View',
    tryAgain: 'Try Again',
    searchPlaceholder: 'Search district... (name or code)',
    selectDistrict: 'Or select your district',
    errorLoading: 'Could not load data',
    loading: 'Loading...',
    noResults: 'No districts found',
    showing50of: 'Showing first 50 of',
    districts: 'districts',
    aboutTitle: 'About MGNREGA',
    aboutText1: 'MGNREGA (Mahatma Gandhi National Rural Employment Guarantee Act) provides at least 100 days of employment per year to rural households.',
    aboutText2: 'This website shows you your district\'s MGNREGA data in a simple way.',
    helpline: 'Helpline'
  }
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '16px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logoIcon: {
    fontSize: '40px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
    color: '#333'
  },
  langButton: {
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '24px',
    textAlign: 'center'
  },
  locationCard: {
    backgroundColor: '#E3F2FD',
    border: '2px solid #2196F3',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    display: 'flex',
    gap: '16px'
  },
  locationIcon: {
    fontSize: '48px'
  },
  locationContent: {
    flex: 1
  },
  locationTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
    color: '#1976D2'
  },
  locationText: {
    fontSize: '14px',
    color: '#555',
    marginBottom: '16px'
  },
  detectButton: {
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    width: '100%',
    maxWidth: '300px',
    marginTop: '8px'
  },
  detectedBox: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  detectedText: {
    fontSize: '16px'
  },
  viewButton: {
    padding: '10px 20px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    textDecoration: 'none',
    display: 'inline-block'
  },
  errorText: {
    color: '#f44336',
    fontSize: '14px',
    marginBottom: '8px'
  },
  searchBox: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  searchIcon: {
    fontSize: '24px'
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '16px',
    backgroundColor: 'transparent'
  },
  clearButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#999',
    padding: '4px 8px'
  },
  districtsList: {
    marginBottom: '24px'
  },
  listTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#333'
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    color: '#C62828',
    padding: '16px',
    borderRadius: '8px',
    textAlign: 'center',
    fontSize: '16px'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px',
    gap: '16px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #2196F3',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  noResults: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '16px',
    color: '#666'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px'
  },
  districtCard: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textDecoration: 'none',
    color: 'inherit',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'all 0.2s',
    cursor: 'pointer',
    border: '2px solid transparent'
  },
  districtIcon: {
    fontSize: '32px'
  },
  districtInfo: {
    flex: 1
  },
  districtName: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '4px',
    color: '#333'
  },
  districtState: {
    fontSize: '13px',
    color: '#666'
  },
  arrow: {
    fontSize: '20px',
    color: '#2196F3'
  },
  moreResults: {
    textAlign: 'center',
    padding: '16px',
    color: '#666',
    fontSize: '14px'
  },
  infoBox: {
    backgroundColor: '#FFF3E0',
    border: '2px solid #FFB74D',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '24px'
  },
  infoTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0 0 12px 0',
    color: '#E65100'
  },
  infoPara: {
    fontSize: '15px',
    lineHeight: '1.6',
    marginBottom: '12px',
    color: '#555'
  },
  helpline: {
    fontSize: '16px',
    backgroundColor: 'white',
    padding: '12px',
    borderRadius: '8px',
    marginTop: '12px'
  }
}