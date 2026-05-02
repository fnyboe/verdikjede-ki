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
  coverTitle: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 6 },
  coverCompany: { fontSize: 13, color: C.muted, marginBottom: 4 },
  coverDate: { fontSize: 9, color: C.muted, marginTop: 6 },
  coverLine: { height: 3, backgroundColor: C.emerald, marginTop: 14, marginBottom: 14 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 2 },
  sectionBadge: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: C.dark,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgeText: { color: C.white, fontSize: 10, fontFamily: 'Helvetica-Bold' },
  sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.dark },
  sectionSubtitle: { fontSize: 8, color: C.muted, marginTop: 1 },
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
  stratCard: {
    borderWidth: 2,
    borderRadius: 6,
    padding: 14,
    marginBottom: 14,
  },
  stratTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  stratDesc: { fontSize: 9, marginBottom: 10 },
  stratAction: { fontSize: 9, marginBottom: 3 },
  stratText: { fontSize: 9, lineHeight: 1.7 },
})

function SectionHeader({ badge, title, subtitle }: { badge: string; title: string; subtitle?: string }) {
  return (
    <View style={s.sectionRow}>
      <View style={s.sectionBadge}>
        <Text style={s.sectionBadgeText}>{badge}</Text>
      </View>
      <View>
        <Text style={s.sectionTitle}>{title}</Text>
        {subtitle && <Text style={s.sectionSubtitle}>{subtitle}</Text>}
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
    <Document title={analysis.title} author={companyName}>
      <Page size="A4" style={s.page}>

        {/* FORSIDEINFO */}
        <View style={{ marginBottom: 28 }}>
          {analysis.logo_base64 ? (
            <Image src={analysis.logo_base64} style={{ height: 48, marginBottom: 14, objectFit: 'contain', alignSelf: 'flex-start' }} />
          ) : null}
          <Text style={s.coverTitle}>{analysis.title}</Text>
          <Text style={s.coverCompany}>{analysis.company_name ?? companyName}</Text>
          <View style={s.coverLine} />
          <Text style={s.coverDate}>Generert: {formatDate(analysis.created_at)}</Text>
        </View>

        {/* STEG 1 – VERDIKJEDE */}
        <SectionHeader badge="1" title="Verdikjede" subtitle="Identifiserte steg i verdikjeda" />
        <View style={{ marginBottom: 18 }}>
          {vcSteps.map((vs, i) => (
            <View key={vs.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
              <View style={{
                width: 18, height: 18, borderRadius: 9,
                backgroundColor: C.emerald, marginRight: 8,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ color: C.white, fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{i + 1}</Text>
              </View>
              <Text style={{ fontSize: 10 }}>{vs.name}</Text>
            </View>
          ))}
        </View>

        <View style={s.divider} />

        {/* STEG 2 – PROSESSSCORING */}
        <SectionHeader badge="2" title="Prosessscoring" subtitle="Scorar per dimensjon (1–5). Prosessar med ✓ er inkluderte i vidare analyse." />
        {vcSteps.map(vs => {
          const procs = procsByVcStep[vs.id] ?? []
          if (procs.length === 0) return null
          return (
            <View key={vs.id} style={{ marginBottom: 14 }}>
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

        {/* STEG 3 – BXT-ANALYSE */}
        <View break>
          <SectionHeader badge="3" title="BXT-analyse" subtitle="Detaljert analyse per inkludert prosess" />
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
        </View>

        {/* STEG 4 – OPPGÅVER */}
        <View break>
          <SectionHeader badge="4" title="Oppgåver" subtitle="KI-kandidatar per inkludert prosess" />
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
        </View>

        {/* STEG 5 – STRATEGI */}
        <View break>
          <SectionHeader badge="5" title="Implementeringsstrategi" />
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
        </View>

      </Page>
    </Document>
  )
}
