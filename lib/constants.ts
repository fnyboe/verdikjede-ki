import type { Dim, BxtCat, Strat } from '@/types'

export const DIMS: Dim[] = [
  { key: 'operational', label: 'Potensial', tip: 'Variabler:\n• Volum (antall transaksjoner/hendelser)\n• Frekvens (daglig, ukentlig, sporadisk)\n• Kost per enhet / tidsbruk\n• Grad av manuelt arbeid\n👉 Høy score = godt automasjonskandidatur' },
  { key: 'process', label: 'Prosesskarakter', tip: 'Variabler:\n• Regelbasert vs. skjønnsbasert\n• Variasjon i input\n• Standardisering av prosess\n• Antall unntak\n👉 Mer struktur = lettere AI/automatisering' },
  { key: 'data', label: 'Data', tip: 'Variabler:\n• Finnes data allerede?\n• Datakvalitet (komplett, korrekt, historisk)\n• Digital vs. analog input\n• Datatilgang på tvers av systemer\n👉 Uten data → ikke AI' },
  { key: 'risk', label: 'Risiko', tip: 'Variabler:\n• Konsekvens av feil\n• Regulatorisk sensitivitet\n• Etisk / tillitsmessig risiko\n• Kunde- eller sikkerhetspåvirkning\n👉 Høy score = lav risiko' },
  { key: 'change', label: 'Endring', tip: 'Variabler:\n• Antall roller involvert\n• Fagforening / compliance\n• Kompetansegap\n• Avhengighet til andre initiativ\n👉 Høy score = lav organisatorisk motstand' },
]

export const BXT_CATS: BxtCat[] = [
  {
    key: 'strategic', label: 'SAMSVAR MED MÅL', color: '#6366F1', items: [
      { key: 'alignment', label: 'Strategisk samsvar', tip: '1: Inget samsvar\n3: Middels\n5: Høyt samsvar med støtte på styrenivå' },
    ],
  },
  {
    key: 'business', label: 'FORRETNINGSEFFEKT', color: '#3B82F6', items: [
      { key: 'biz_strategy', label: 'Samsvar med strategi',    tip: '1: Verdi ikke forstått\n3: Middels\n5: Direkte bidrag til strategiske prioriteringer' },
      { key: 'biz_value',    label: 'Forretningsmessig verdi', tip: '1: Verdi ikke forstått\n3: Målbar effekt på kost/kvalitet\n5: Betydelig og skalerbar effekt' },
      { key: 'biz_timeline', label: 'Tidsramme for endring',   tip: '1: Lang og høy påvirkning\n3: Moderat endring\n5: Kort og lav påvirkning' },
    ],
  },
  {
    key: 'experience', label: 'BRUKEROPPLEVELSE', color: '#10B981', items: [
      { key: 'exp_personas',   label: 'Brukergrupper',    tip: '1: Uklart hvem som påvirkes\n3: Kjente brukergrupper\n5: Tydelige personas med dokumenterte behov' },
      { key: 'exp_value',      label: 'Verdi for brukere', tip: '1: Liten eller ukjent\n3: Målbar forbedring\n5: Stor og umiddelbar verdi' },
      { key: 'exp_resistance', label: 'Endringsmotstand',  tip: '1: Høy motstand\n3: Moderat motstand\n5: Lav motstand, minimal påvirkning' },
    ],
  },
  {
    key: 'tech', label: 'GJENNOMFØRBARHET', color: '#F59E0B', items: [
      { key: 'tech_risk',     label: 'Implementeringsrisiko', tip: '1: Høy risiko\n3: Kjente risikoer med tiltak\n5: Lav risiko, godt forstått' },
      { key: 'tech_security', label: 'Sikkerhetstiltak',      tip: '1: Sikkerhetskrav uklare\n3: Standard tiltak tilstrekkelig\n5: Robust sikkerhetsarkitektur' },
      { key: 'tech_fit',      label: 'KI/LLM passer?',        tip: '1: Dårlig match\n3: Delvis match, tilpasning nødvendig\n5: Sterk match, teknologi dekker behovet' },
    ],
  },
]

export const STRATS: Record<string, Strat> = {
  collaborative: {
    title: 'Samarbeidsvillig økosystem', sub: 'Bruk nettverket', color: '#3B82F6', bg: '#DBEAFE',
    desc: 'Begrenset kontroll og mange teknologier. Bygg partnerskap og delta i teknologi-økosystemer.',
    actions: ['Kartlegg bransje-økosystemer', 'Prioriter åpne API-er', 'Bygg integrasjonskompetanse', 'Samarbeid med partnere', 'Unngå leverandør-innlåsing'],
  },
  platform: {
    title: 'Plattformlederskap', sub: 'Skap normene', color: '#8B5CF6', bg: '#EDE9FE',
    desc: 'Høy kontroll og mange teknologier. Bygg intern KI-plattform som setter standarden.',
    actions: ['Bygg intern KI-plattform', 'Invester i datainfrastruktur', 'Sett teknologistandarder', 'Rekrutter KI-kompetanse', 'Driv bransjeinnovasjon'],
  },
  focused: {
    title: 'Fokusert differensiering', sub: 'Spiss fortrinnet', color: '#F59E0B', bg: '#FEF3C7',
    desc: 'Begrenset kontroll og få teknologier. Spiss KI mot høyverdiprosesser.',
    actions: ['Finn 2-3 kjerneprosesser', 'Kjøp SaaS for standard', 'Fokuser på domeneforståelse', 'Start med pilotprosjekter', 'Bruk nisjeverktøy'],
  },
  vertical: {
    title: 'Vertikal integrering', sub: 'Koble maskineriet', color: '#10B981', bg: '#D1FAE5',
    desc: 'Høy kontroll og få teknologier. End-to-end KI gjennom hele verdikjeden.',
    actions: ['Bygg helhetlig datapipeline', 'Automatiser end-to-end', 'Integrer KI i systemer', 'Prioriter intern utvikling', 'Mål verdi på tvers'],
  },
}
