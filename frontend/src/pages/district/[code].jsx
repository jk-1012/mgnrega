import { useRouter } from 'next/router'
import useSWR from 'swr'
import axios from 'axios'
import { useState, useEffect } from 'react'

const fetcher = url => axios.get(url).then(r => r.data)

export default function DistrictPage() {
  const router = useRouter()
  const { code } = router.query
  const [lang, setLang] = useState('hi') // Default Hindi
  const [speaking, setSpeaking] = useState(false)

  const { data: summary, error: summaryError } = useSWR(
    code ? `/api/proxy/districts/${code}/summary` : null,
    fetcher,
    { refreshInterval: 300000 } // Refresh every 5 mins
  )

  const { data: trend } = useSWR(
    code ? `/api/proxy/districts/${code}/trend?months=12` : null,
    fetcher
  )

  // Auto-speak summary on load (with user gesture)
  const speakSummary = () => {
    if (!summary || !('speechSynthesis' in window)) return

    setSpeaking(true)
    const text = lang === 'hi'
      ? `${summary.district_name_hi || summary.district_name_en} में ${formatNumber(summary.metrics.people_benefitted)} लोगों को काम मिला। कुल ${formatNumber(summary.metrics.total_work_days)} दिन का काम हुआ। ${formatRupees(summary.metrics.total_payments)} रुपये का भुगतान हुआ।`
      : `In ${summary.district_name_en}, ${formatNumber(summary.metrics.people_benefitted)} people got work. Total ${formatNumber(summary.metrics.total_work_days)} work days. Payment of ${formatRupees(summary.metrics.total_payments)} rupees.`

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN'
    utterance.rate = 0.9
    utterance.onend = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  if (summaryError) {
    return <ErrorView error="डेटा लोड नहीं हो सका / Data not available" />
  }

  if (!summary) {
    return <LoadingView />
  }

  const t = translations[lang]

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => router.push('/')} style={styles.backButton}>
          ← {t.back}
        </button>
        <button
          onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}
          style={styles.langButton}
        >
          {lang === 'hi' ? 'English' : 'हिंदी'}
        </button>
      </div>

      {/* District Name */}
      <div style={styles.districtHeader}>
        <h1 style={styles.districtName}>
          {lang === 'hi' ? summary.district_name_hi : summary.district_name_en}
        </h1>
        <p style={styles.stateName}>{summary.state}</p>
      </div>

      {/* Voice Button - Large and prominent */}
      <button
        onClick={speakSummary}
        style={{...styles.voiceButton, opacity: speaking ? 0.6 : 1}}
        disabled={speaking}
      >
        <span style={styles.voiceIcon}>🔊</span>
        <span style={styles.voiceText}>
          {speaking ? t.speaking : t.listenSummary}
        </span>
      </button>

      {/* Main Metrics - Visual Cards */}
      <div style={styles.metricsGrid}>
        <MetricCard
          icon="👥"
          label={t.people}
          value={summary.metrics.people_benefitted}
          color="#4CAF50"
          explanation={t.peopleExplain}
          onSpeak={() => speakMetric(t.people, summary.metrics.people_benefitted, t.peopleExplain, lang)}
        />

        <MetricCard
          icon="📅"
          label={t.workDays}
          value={summary.metrics.total_work_days}
          color="#2196F3"
          explanation={t.workDaysExplain}
          onSpeak={() => speakMetric(t.workDays, summary.metrics.total_work_days, t.workDaysExplain, lang)}
        />

        <MetricCard
          icon="🏠"
          label={t.households}
          value={summary.metrics.households_worked}
          color="#FF9800"
          explanation={t.householdsExplain}
          onSpeak={() => speakMetric(t.households, summary.metrics.households_worked, t.householdsExplain, lang)}
        />

        <MetricCard
          icon="💰"
          label={t.payment}
          value={formatRupees(summary.metrics.total_payments)}
          isRupee={true}
          color="#9C27B0"
          explanation={t.paymentExplain}
          onSpeak={() => speakMetric(t.payment, formatRupees(summary.metrics.total_payments), t.paymentExplain, lang)}
        />
      </div>

      {/* Simple Comparison */}
      {trend && trend.length > 1 && (
        <ComparisonSection trend={trend} lang={lang} t={t} />
      )}

      {/* Trend Chart - Simple Visual */}
      {trend && trend.length > 0 && (
        <TrendSection trend={trend} lang={lang} t={t} />
      )}

      {/* Help Section */}
      <HelpSection lang={lang} t={t} />

      {/* Last Updated */}
      <div style={styles.footer}>
        <p style={styles.lastUpdated}>
          {t.lastUpdated}: {formatDate(summary.month, lang)}
        </p>
      </div>
    </div>
  )
}

// Metric Card Component
function MetricCard({ icon, label, value, color, explanation, onSpeak, isRupee }) {
  const [showHelp, setShowHelp] = useState(false)

  return (
    <div style={{...styles.metricCard, borderLeft: `5px solid ${color}`}}>
      <div style={styles.cardHeader}>
        <span style={styles.icon}>{icon}</span>
        <button onClick={onSpeak} style={styles.cardVoiceBtn}>🔊</button>
      </div>

      <h3 style={styles.metricLabel}>{label}</h3>
      <div style={styles.metricValue}>
        {value !== null && value !== undefined ? (isRupee ? value : formatNumber(value)) : '—'}
      </div>

      <button
        onClick={() => setShowHelp(!showHelp)}
        style={styles.helpBtn}
      >
        ❓ {showHelp ? 'छुपाएं' : 'समझें'}
      </button>

      {showHelp && (
        <div style={styles.helpText}>
          {explanation}
        </div>
      )}
    </div>
  )
}

// Comparison Section
function ComparisonSection({ trend, lang, t }) {
  const latest = trend[trend.length - 1]
  const previous = trend[trend.length - 2]

  const change = latest.people_benefitted - previous.people_benefitted
  const isIncrease = change > 0

  return (
    <div style={styles.comparisonBox}>
      <h3 style={styles.sectionTitle}>
        📊 {t.comparison}
      </h3>
      <div style={styles.comparisonContent}>
        <div style={styles.comparisonIcon}>
          {isIncrease ? '📈' : '📉'}
        </div>
        <p style={styles.comparisonText}>
          {isIncrease ? t.increased : t.decreased}{' '}
          <strong style={{color: isIncrease ? '#4CAF50' : '#f44336'}}>
            {Math.abs(change)}
          </strong> {t.beneficiaries}
        </p>
      </div>
      <p style={styles.comparisonSubtext}>
        {t.comparedToLast}
      </p>
    </div>
  )
}

// Trend Section - Simple Bar Chart
function TrendSection({ trend, lang, t }) {
  const maxValue = Math.max(...trend.map(t => t.people_benefitted || 0))

  return (
    <div style={styles.trendBox}>
      <h3 style={styles.sectionTitle}>
        📈 {t.last12Months}
      </h3>
      <div style={styles.chartContainer}>
        {trend.map((item, idx) => {
          const height = ((item.people_benefitted || 0) / maxValue) * 100
          return (
            <div key={idx} style={styles.barWrapper}>
              <div
                style={{
                  ...styles.bar,
                  height: `${height}%`,
                  backgroundColor: idx === trend.length - 1 ? '#4CAF50' : '#90CAF9'
                }}
              />
              <div style={styles.barLabel}>
                {formatMonth(item.year_month, lang)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Help Section
function HelpSection({ lang, t }) {
  return (
    <div style={styles.helpSection}>
      <h3 style={styles.sectionTitle}>❓ {t.whatIsMGNREGA}</h3>
      <div style={styles.helpContent}>
        <p style={styles.helpPara}>{t.mgnregaExplain1}</p>
        <p style={styles.helpPara}>{t.mgnregaExplain2}</p>
        <div style={styles.contactBox}>
          <p style={styles.contactTitle}>📞 {t.needHelp}</p>
          <p style={styles.contactText}>
            {t.callTollFree}: <strong>1800-345-4224</strong>
          </p>
        </div>
      </div>
    </div>
  )
}

// Loading and Error Views
function LoadingView() {
  return (
    <div style={styles.centerView}>
      <div style={styles.spinner} />
      <p style={styles.loadingText}>लोड हो रहा है... / Loading...</p>
    </div>
  )
}

function ErrorView({ error }) {
  return (
    <div style={styles.centerView}>
      <div style={styles.errorIcon}>⚠️</div>
      <p style={styles.errorText}>{error}</p>
    </div>
  )
}

// Utility Functions
function formatNumber(num) {
  if (num === null || num === undefined) return '—'
  // Indian number format (lakhs/crores)
  if (num >= 10000000) return `${(num / 10000000).toFixed(2)} करोड़`
  if (num >= 100000) return `${(num / 100000).toFixed(2)} लाख`
  if (num >= 1000) return `${(num / 1000).toFixed(1)} हज़ार`
  return num.toString()
}

function formatRupees(amount) {
  if (amount === null || amount === undefined) return '—'
  return `₹${formatNumber(amount)}`
}

function formatDate(dateStr, lang) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const months = lang === 'hi'
    ? ['जन', 'फर', 'मार', 'अप्र', 'मई', 'जून', 'जुल', 'अग', 'सित', 'अक्ट', 'नव', 'दिस']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getMonth()]} ${date.getFullYear()}`
}

function formatMonth(dateStr, lang) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const months = lang === 'hi'
    ? ['ज', 'फ', 'मा', 'अ', 'म', 'जू', 'जु', 'अ', 'सि', 'अ', 'न', 'दि']
    : ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
  return months[date.getMonth()]
}

function speakMetric(label, value, explanation, lang) {
  if (!('speechSynthesis' in window)) return

  const text = lang === 'hi'
    ? `${label} ${value}। ${explanation}`
    : `${label} ${value}. ${explanation}`

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN'
  utterance.rate = 0.85
  window.speechSynthesis.speak(utterance)
}

// Translations
const translations = {
  hi: {
    back: 'वापस',
    listenSummary: 'सारांश सुनें',
    speaking: 'बोल रहा है...',
    people: 'लोगों को काम मिला',
    workDays: 'कुल काम के दिन',
    households: 'घरों को लाभ',
    payment: 'भुगतान राशि',
    peopleExplain: 'इतने लोगों को इस महीने मनरेगा में काम मिला',
    workDaysExplain: 'कुल इतने दिन का काम किया गया',
    householdsExplain: 'इतने परिवारों को रोज़गार मिला',
    paymentExplain: 'कुल इतना पैसा मज़दूरों को दिया गया',
    comparison: 'पिछले महीने से तुलना',
    increased: 'बढ़ गए',
    decreased: 'कम हुए',
    beneficiaries: 'लाभार्थी',
    comparedToLast: 'पिछले महीने की तुलना में',
    last12Months: 'पिछले 12 महीने',
    whatIsMGNREGA: 'मनरेगा क्या है?',
    mgnregaExplain1: 'मनरेगा एक सरकारी योजना है जो गांव के लोगों को साल में कम से कम 100 दिन का काम देती है।',
    mgnregaExplain2: 'इसमें सड़क बनाना, तालाब खोदना, और दूसरे विकास के काम शामिल हैं।',
    needHelp: 'मदद चाहिए?',
    callTollFree: 'टोल-फ्री नंबर',
    lastUpdated: 'अंतिम अपडेट'
  },
  en: {
    back: 'Back',
    listenSummary: 'Listen to Summary',
    speaking: 'Speaking...',
    people: 'People Got Work',
    workDays: 'Total Work Days',
    households: 'Households Benefited',
    payment: 'Total Payment',
    peopleExplain: 'This many people got work in MGNREGA this month',
    workDaysExplain: 'Total days of work completed',
    householdsExplain: 'This many families got employment',
    paymentExplain: 'Total money paid to workers',
    comparison: 'Comparison with Last Month',
    increased: 'Increased by',
    decreased: 'Decreased by',
    beneficiaries: 'beneficiaries',
    comparedToLast: 'Compared to last month',
    last12Months: 'Last 12 Months',
    whatIsMGNREGA: 'What is MGNREGA?',
    mgnregaExplain1: 'MGNREGA is a government scheme that provides at least 100 days of work per year to rural households.',
    mgnregaExplain2: 'It includes work like road building, pond digging, and other development activities.',
    needHelp: 'Need Help?',
    callTollFree: 'Toll-free number',
    lastUpdated: 'Last Updated'
  }
}

// Styles
const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '16px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '20px'
  },
  backButton: {
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#fff',
    border: '2px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
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
  districtHeader: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  districtName: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
    color: '#333'
  },
  stateName: {
    fontSize: '16px',
    color: '#666',
    margin: 0
  },
  voiceButton: {
    width: '100%',
    padding: '20px',
    fontSize: '20px',
    fontWeight: 'bold',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
  },
  voiceIcon: {
    fontSize: '32px'
  },
  voiceText: {
    fontSize: '18px'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  metricCard: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  icon: {
    fontSize: '32px'
  },
  cardVoiceBtn: {
    fontSize: '20px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px'
  },
  metricLabel: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 8px 0',
    fontWeight: 'normal'
  },
  metricValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '12px'
  },
  helpBtn: {
    fontSize: '12px',
    padding: '6px 12px',
    backgroundColor: '#f0f0f0',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    width: '100%'
  },
  helpText: {
    marginTop: '12px',
    fontSize: '13px',
    color: '#555',
    backgroundColor: '#f9f9f9',
    padding: '10px',
    borderRadius: '6px',
    lineHeight: '1.5'
  },
  comparisonBox: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  comparisonContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginTop: '12px'
  },
  comparisonIcon: {
    fontSize: '48px'
  },
  comparisonText: {
    fontSize: '18px',
    margin: 0
  },
  comparisonSubtext: {
    fontSize: '14px',
    color: '#666',
    marginTop: '8px'
  },
  trendBox: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0 0 16px 0'
  },
  chartContainer: {
    display: 'flex',
    gap: '8px',
    height: '150px',
    alignItems: 'flex-end'
  },
  barWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%'
  },
  bar: {
    width: '100%',
    borderRadius: '4px 4px 0 0',
    minHeight: '10px'
  },
  barLabel: {
    fontSize: '10px',
    marginTop: '4px',
    color: '#666'
  },
  helpSection: {
    backgroundColor: '#FFF3E0',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    border: '2px solid #FFB74D'
  },
  helpContent: {
    marginTop: '12px'
  },
  helpPara: {
    fontSize: '15px',
    lineHeight: '1.6',
    marginBottom: '12px'
  },
  contactBox: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '8px',
    marginTop: '16px'
  },
  contactTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 8px 0'
  },
  contactText: {
    fontSize: '18px',
    margin: 0
  },
  footer: {
    textAlign: 'center',
    padding: '20px',
    color: '#666'
  },
  lastUpdated: {
    fontSize: '14px',
    margin: 0
  },
  centerView: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #f3f3f3',
    borderTop: '5px solid #2196F3',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '20px',
    fontSize: '18px',
    color: '#666'
  },
  errorIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  errorText: {
    fontSize: '18px',
    color: '#f44336',
    textAlign: 'center'
  }
}