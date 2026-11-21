import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import { Footer, Navbar } from './components/Navbar'
import { EmptyState, Toaster } from './components/ui'
import { AppProvider } from './lib/store'
import Home from './pages/Home'

const Analyzer = lazy(() => import('./pages/Analyzer'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const UrlInspector = lazy(() => import('./pages/UrlInspector'))
const Awareness = lazy(() => import('./pages/Awareness'))
const HowItWorks = lazy(() => import('./pages/HowItWorks'))

function Page({ children }: { children: ReactNode }) {
  return <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>{children}</motion.main>
}

function Routed() {
  const loc = useLocation()
  useEffect(() => { if (!loc.hash) window.scrollTo(0, 0) }, [loc.pathname, loc.hash])
  return (
    <AnimatePresence mode="wait">
      <Routes location={loc} key={loc.pathname}>
        <Route path="/" element={<Page><Home /></Page>} />
        <Route path="/analyze" element={<Page><Analyzer /></Page>} />
        <Route path="/dashboard" element={<Page><Dashboard /></Page>} />
        <Route path="/history" element={<Page><HistoryPage /></Page>} />
        <Route path="/url-inspector" element={<Page><UrlInspector /></Page>} />
        <Route path="/awareness" element={<Page><Awareness /></Page>} />
        <Route path="/how-it-works" element={<Page><HowItWorks /></Page>} />
        <Route path="*" element={<Page><div className="mx-auto max-w-xl px-5 pt-20"><EmptyState icon={<span className="font-mono">404</span>} title="Page not found" body="That page doesn't exist." action={<Link to="/" className="btn btn-primary">Back home</Link>} /></div></Page>} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <BrowserRouter>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <div className="flex-1"><Suspense fallback={<div className="mx-auto max-w-7xl space-y-4 px-5 pt-12 lg:px-8"><div className="skeleton h-10 w-72" /><div className="skeleton h-80" /></div>}><Routed /></Suspense></div>
            <Footer />
          </div>
          <Toaster />
        </BrowserRouter>
      </AppProvider>
    </MotionConfig>
  )
}
