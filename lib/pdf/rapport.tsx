import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { DIMS, BXT_CATS, STRATS } from '@/lib/constants'
import type { Analysis, VcStep, Process, Task } from '@/types'

export interface RapportData {
  analysis: Analysis
  companyName: string
  vcSteps: VcStep[]
  processes: Process[]
  tasks: Task[]
}

const C = {
  dark: '#1E293B',
  emerald: '#10B981',
  muted: '#64748B',
  border: '#E2E8F0',
  bg: '#F8FAFC',
  white: '#FFFFFF',
}

const s = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingLeft: 48,
    paddingRight: 48,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.dark,
    lineHeight: 1.4,
  },
  coverPage: {
    paddingTop: 60,
    paddingBottom: 60,
    paddingLeft: 60,
    paddingRight: 60,
    fontFamily: 'Helvetica',
    color: C.dark,
    justifyContent: 'space-between',
  },
  coverLogo: { height: 80, width: 'auto', alignSelf: 'flex-start', marginBottom: 20 },
  coverCompanyName: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 16 },
  coverLine: { height: 4, backgroundColor: C.emerald, marginTop: 20, marginBottom: 24 },
  coverMainTitle: { fontSize: 19, fontFamily: 'Helvetica-Bold', color: C.emerald, marginBottom: 10 },
  coverSubtitle: { fontSize: 13, color: C.muted },
  coverDate: { fontSize: 9, color: C.muted },
  tocPageTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 28 },
  tocEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tocNumber: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: C.emerald, width: 32 },
  tocLabel: { fontSize: 12, color: C.dark },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionBadge: {
    width: 28,
    height: 28,
    borderRadius: 5,
    backgroundColor: C.emerald,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgeText: { color: C.white, fontSize: 12, fontFamily: 'Helvetica-Bold' },
  sectionTitle: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.emerald },
  sectionSubtitle: { fontSize: 8, color: C.muted, marginTop: 3 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
  label: { fontSize: 7, color: C.muted, fontFamily: 'Helvetica-Bold', marginBottom: 2, letterSpacing: 0.5 },
  value: { fontSize: 9, color: C.dark, marginBottom: 8 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.dark,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 3,
    marginBottom: 1,
  },
  tableHeaderCell: { color: C.white, fontFamily: 'Helvetica-Bold', fontSize: 8 },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableRowAlt: { backgroundColor: C.bg },
  tableCell: { fontSize: 8, color: C.dark },
  tableCellMuted: { fontSize: 8, color: C.muted },
  processCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  processTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 8 },
  stratCard: { borderWidth: 2, borderRadius: 6, padding: 14, marginBottom: 14 },
  stratTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  stratDesc: { fontSize: 9, marginBottom: 10 },
  stratAction: { fontSize: 9, marginBottom: 3 },
  stratText: { fontSize: 9, lineHeight: 1.7 },
})

const TOC_ENTRIES = [
  'Definer verdikjede',
  'Definer verdikjede-prosesser – evaluer og vel prosessar',
  'Evaluer og vel prosessar for vidare oppgåveanalyse',
  'Evaluer oppgåver',
  'Strategisk tilnærming og forslag til implementering',
]

function SectionHeader({ badge, title, subtitle }: { badge: string; title: string; subtitle?: string }) {
  return (
    <View style={s.sectionRow}>
      <View style={s.sectionBadge}>
        <Text style={s.sectionBadgeText}>{badge}</Text>
      </View>
      <View>
        <Text style={s.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={s.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  )
}

function getStratKey(vc: string, tech: string): string {
  if (vc === 'low' && tech === 'few') return 'focused'
  if (vc === 'low' && tech === 'many') return 'collaborative'
  if (vc === 'high' && tech === 'few') return 'vertical'
  return 'platform'
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('nb-NO', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function RapportDocument({ analysis, companyName, vcSteps, processes, tasks }: RapportData) {
  const displayCompanyName = analysis.company_name ?? companyName
  const includedProcs = processes.filter(p => p.included)

  const tasksByProcess = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    acc[t.process_id] = [...(acc[t.process_id] ?? []), t]
    return acc
  }, {})

  const procsByVcStep = processes.reduce<Record<string, Process[]>>((acc, p) => {
    if (p.vc_step_id) acc[p.vc_step_id] = [...(acc[p.vc_step_id] ?? []), p]
    return acc
  }, {})

  const stratKey = analysis.vc_control && analysis.tech_breadth
    ? getStratKey(analysis.vc_control, analysis.tech_breadth)
    : null
  const strat = stratKey ? STRATS[stratKey] : null

  return (
    <Document title={analysis.title} author={displayCompanyName}>

      {/* ── PAGE 1: COVER ── */}
      <Page size="A4" style={s.coverPage}>
        <View>
          <Text style={s.coverCompanyName}>{displayCompanyName}</Text>
          {analysis.logo_base64 ? (
            <Image src={analysis.logo_base64} style={s.coverLogo} />
          ) : null}
          <View style={s.coverLine} />
          <Text style={s.coverMainTitle}>KI-analyse: Kor i verdikjeda passar KI best?</Text>
          <Text style={s.coverSubtitle}>{analysis.title}</Text>
        </View>
        <View>
          <Text style={s.coverDate}>Generert: {formatDate(analysis.created_at)}</Text>
        </View>
      </Page>

      {/* ── PAGE 2: TABLE OF CONTENTS ── */}
      <Page size="A4" style={s.page}>
        <Text style={s.tocPageTitle}>Innhald</Text>
        {TOC_ENTRIES.map((label, i) => (
          <View key={i} style={s.tocEntry}>
            <Text style={s.tocNumber}>{i + 1}</Text>
            <Text style={s.tocLabel}>{label}</Text>
          </View>
        ))}
      </Page>

      {/* ── PAGE 3: STEG 1 – VERDIKJEDE ── */}
      <Page size="A4" style={s.page}>
        <SectionHeader badge="1" title="Definer verdikjede" subtitle="Identifiserte steg i verdikjeda" />
        <View>
          {vcSteps.map((vs, i) => (
            <View key={vs.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 7 }}>
              <View style={{
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: C.emerald, marginRight: 10,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ color: C.white, fontSize: 9, fontFamily: 'Helvetica-Bold' }}>{i + 1}</Text>
              </View>
              <Text style={{ fontSize: 11 }}>{vs.name}</Text>
            </View>
          ))}
        </View>
      </Page>

      {/* ── PAGE 4: STEG 2 – PROSESSSCORING ── */}
      <Page size="A4" style={s.page}>
        <SectionHeader badge="2" title="Definer verdikjede-prosesser" subtitle="Evaluer og vel prosessar. Scorar per dimensjon (1–5). Prosessar med ✓ er inkluderte i vidare analyse." />
        {vcSteps.map(vs => {
          const procs = procsByVcStep[vs.id] ?? []
          if (procs.length === 0) return null
          return (
            <View key={vs.id} style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.muted, marginBottom: 5 }}>{vs.name}</Text>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, { flex: 3 }]}>Prosess</Text>
                {DIMS.map(d => (
                  <Text key={d.key} style={[s.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>{d.label}</Text>
                ))}
                <Text style={[s.tableHeaderCell, { width: 18, textAlign: 'center' }]}>✓</Text>
              </View>
              {procs.map((p, i) => (
                <View key={p.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                  <Text style={[s.tableCell, { flex: 3 }]}>{p.name}</Text>
                  {DIMS.map(d => (
                    <Text key={d.key} style={[s.tableCell, { flex: 1, textAlign: 'center' }]}>
                      {p.scores?.[d.key] !== undefined ? String(p.scores[d.key]) : '–'}
                    </Text>
                  ))}
                  <Text style={[s.tableCell, { width: 18, textAlign: 'center', color: p.included ? C.emerald : C.muted }]}>
                    {p.included ? '✓' : ''}
                  </Text>
                </View>
              ))}
            </View>
          )
        })}
      </Page>

      {/* ── PAGE 5+: STEG 3 – BXT-ANALYSE ── */}
      <Page size="A4" style={s.page}>
        <SectionHeader badge="3" title="Evaluer og vel prosessar" subtitle="Vidare oppgåveanalyse per inkludert prosess" />
        {includedProcs.map(p => (
          <View key={p.id} style={s.processCard} wrap={false}>
            <Text style={s.processTitle}>{p.name}</Text>

            {p.problem_desc ? (
              <View style={{ marginBottom: 6 }}>
                <Text style={s.label}>PROBLEM</Text>
                <Text style={s.value}>{p.problem_desc}</Text>
              </View>
            ) : null}

            {p.usecase_desc ? (
              <View style={{ marginBottom: 6 }}>
                <Text style={s.label}>BRUKSTILFELLE</Text>
                <Text style={s.value}>{p.usecase_desc}</Text>
              </View>
            ) : null}

            {p.business_goal ? (
              <View style={{ marginBottom: 6 }}>
                <Text style={s.label}>FORRETNINGSMÅL</Text>
                <Text style={s.value}>{p.business_goal}</Text>
              </View>
            ) : null}

            {p.key_results ? (
              <View style={{ marginBottom: 6 }}>
                <Text style={s.label}>NØKKELRESULTAT</Text>
                <Text style={s.value}>{p.key_results}</Text>
              </View>
            ) : null}

            {p.responsible ? (
              <View style={{ marginBottom: 6 }}>
                <Text style={s.label}>ANSVARLEG</Text>
                <Text style={s.value}>{p.responsible}</Text>
              </View>
            ) : null}

            {p.bxt_scores && Object.keys(p.bxt_scores).length > 0 ? (
              <View style={{ marginTop: 4 }}>
                <Text style={[s.label, { marginBottom: 6 }]}>BXT-SCORAR</Text>
                <View style={{ flexDirection: 'row' }}>
                  {BXT_CATS.map(cat => (
                    <View key={cat.key} style={{ flex: 1, marginRight: 6 }}>
                      <Text style={[s.label, { color: cat.color }]}>{cat.label}</Text>
                      {cat.items.map(item => (
                        <View key={item.key} style={{ flexDirection: 'row', marginBottom: 2 }}>
                          <Text style={[s.tableCellMuted, { flex: 3 }]}>{item.label}</Text>
                          <Text style={[s.tableCell, { fontFamily: 'Helvetica-Bold', flex: 1, textAlign: 'right' }]}>
                            {p.bxt_scores?.[item.key] !== undefined ? String(p.bxt_scores[item.key]) : '–'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ))}
      </Page>

      {/* ── PAGE: STEG 4 – OPPGÅVER ── */}
      <Page size="A4" style={s.page}>
        <SectionHeader badge="4" title="Evaluer oppgåver" subtitle="KI-kandidatar per inkludert prosess" />
        {includedProcs.map(p => {
          const procTasks = tasksByProcess[p.id] ?? []
          if (procTasks.length === 0) return null
          return (
            <View key={p.id} style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 5 }}>{p.name}</Text>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, { flex: 3 }]}>Oppgåve</Text>
                <Text style={[s.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Auto.</Text>
                <Text style={[s.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Forb.</Text>
                <Text style={[s.tableHeaderCell, { flex: 2 }]}>Teknologi</Text>
              </View>
              {procTasks.map((t, i) => (
                <View key={t.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
                  <Text style={[s.tableCell, { flex: 3 }]}>{t.name}</Text>
                  <Text style={[s.tableCell, { flex: 1, textAlign: 'center' }]}>{t.automation}</Text>
                  <Text style={[s.tableCell, { flex: 1, textAlign: 'center' }]}>{t.improvement}</Text>
                  <Text style={[s.tableCell, { flex: 2 }]}>{t.tech}</Text>
                </View>
              ))}
            </View>
          )
        })}
      </Page>

      {/* ── PAGE: STEG 5 – STRATEGI OG IMPLEMENTERING ── */}
      <Page size="A4" style={s.page}>
        <SectionHeader badge="5" title="Strategisk tilnærming og forslag til implementering" />
        {strat ? (
          <View style={[s.stratCard, { borderColor: strat.color, backgroundColor: strat.bg }]}>
            <Text style={[s.stratTitle, { color: strat.color }]}>{strat.title}</Text>
            <Text style={[s.stratDesc, { color: C.muted }]}>{strat.desc}</Text>
            <Text style={[s.label, { marginBottom: 6 }]}>TILRÅDDE TILTAK</Text>
            {strat.actions.map((a, i) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 3 }}>
                <Text style={[s.stratAction, { color: strat.color, marginRight: 4 }]}>→</Text>
                <Text style={s.stratAction}>{a}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={s.tableCellMuted}>Ingen strategi valt.</Text>
        )}

        {analysis.strategy_text ? (
          <View style={{ marginTop: 14 }}>
            <Text style={[s.label, { marginBottom: 8 }]}>KI-GENERERT IMPLEMENTERINGSPLAN</Text>
            <Text style={s.stratText}>{analysis.strategy_text}</Text>
          </View>
        ) : null}
      </Page>

    </Document>
  )
}
