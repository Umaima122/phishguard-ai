export type Severity = 'high' | 'medium' | 'low'
export type ThreatLevel = 'Critical' | 'High' | 'Medium' | 'Low'
export type Classification = 'Potential Phishing' | 'Likely Legitimate'
export type EngineKey = 'tfidf' | 'bert'
export type EngineChoice = EngineKey | 'compare'
export type ResultSource = 'model' | 'demo'

export interface AnalyzeRequest {
  subject: string
  sender: string
  body: string
  engine: EngineChoice
  save_to_history: boolean
}

export interface Warning {
  id: string
  title: string
  severity: Severity
  category: 'Language' | 'Request' | 'Attachment' | string
  evidence: string[]
}

export interface Indicator { label: string; severity: Severity; detail: string }

export interface UrlReport {
  url: string
  host: string
  scheme: string
  domain?: string
  indicators: Indicator[]
  risk: Severity
}

export interface SenderReport {
  address: string
  display_name: string | null
  domain: string | null
  indicators: Indicator[]
}

export interface TopTerm { term: string; weight: number }

export interface ComparisonRow {
  engine: EngineKey
  name: string
  score: number | null
  classification: Classification | null
  status?: string
}

export interface AnalysisResult {
  id: string
  timestamp: string
  source: ResultSource
  classification: Classification
  score: number
  threat_level: ThreatLevel
  engine: { key: EngineKey | 'demo'; name: string; trained_at?: string | null }
  warnings: Warning[]
  urls: UrlReport[]
  sender: SenderReport | null
  top_terms: TopTerm[]
  explanation: string
  recommendations: string[]
  comparison: ComparisonRow[]
  saved: boolean
}

export interface ModelMetrics {
  engine: EngineKey
  name: string
  accuracy: number
  precision: number
  recall: number
  f1: number
  roc_auc: number
  confusion_matrix: number[][]
  false_positives: number
  false_negatives: number
  train_size: number
  test_size: number
  train_seconds: number
  features: number
  trained_at: string
  dataset: { file: string; raw_rows: number; usable_rows: number; duplicates_removed: number; phishing: number; legitimate: number }
}

export interface EngineInfo {
  key: EngineKey
  name: string
  status: 'ready' | 'loading' | 'training' | 'unavailable' | 'error'
  error: string | null
  metrics: ModelMetrics | null
}

export interface Health { status: string; version: string; engines: EngineInfo[] }

export interface HistoryItem {
  id: string
  created_at: string
  subject: string
  sender: string
  preview: string
  classification: Classification
  score: number
  threat_level: ThreatLevel
  engine: string
  url_count: number
  warning_count: number
  result?: AnalysisResult
}

export interface Stats {
  total: number
  phishing: number
  legitimate: number
  urls_inspected: number
  by_level: Partial<Record<ThreatLevel, number>>
  daily: { date: string; phishing: number; legitimate: number }[]
  top_warnings: { title: string; count: number }[]
}
