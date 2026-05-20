import type { Dim, BxtCat, Strat } from '@/types'

export const PLOT_COLORS: string[] = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export const DIMS: Dim[] = [
  { key: 'operational', label: 'Potensial', tip: 'Prosessar med høgt volum, høg frekvens og mykje manuelt arbeid får høgare score – jo meir repetitivt og tidkrevjande, jo betre eignar det seg for KI' },
  { key: 'process', label: 'Prosesskarakter', tip: 'Prosessar som følgjer faste reglar og er godt standardiserte får høgare score – prosessar som krev skjønn og fagleg vurdering er vanskelegare å automatisere' },
  { key: 'data', label: 'Data', tip: 'Prosessar der det finst mykje digitale data av høg kvalitet får høgare score – utan gode data kan KI ikkje lærast opp eller ta avgjersler' },
  { key: 'risk', label: 'Risiko', tip: 'Prosessar der feil får store konsekvensar eller der det er høg sannsynlegheit for feil (regulatorisk, etisk, kundetillit) får lågare score – låg risiko og låg sannsynlegheit for feil gir høgare score' },
  { key: 'change', label: 'Endring', tip: 'Prosessar som er enkle å endre organisatorisk får høgare score – mange roller, kompetansegap eller motstand gir lågare score' },
]

export const BXT_CATS: BxtCat[] = [
  {
    key: 'strategic', label: 'SAMSVAR MED MÅL', color: '#6366F1', items: [
      { key: 'alignment', label: 'Strategisk samsvar', tip: 'I kva grad støttar dette KI-brukstilfellet bedrifta sine strategiske mål? Høg score betyr direkte bidrag til prioriterte satsingar.\n1: Ingen klar samanheng\n3: Delvis samsvar\n5: Direkte bidrag til prioriterte mål' },
    ],
  },
  {
    key: 'business', label: 'FORRETNINGSEFFEKT', color: '#3B82F6', items: [
      { key: 'biz_strategy', label: 'Samsvar med strategi',    tip: 'Kor godt passar KI-løysinga inn i bedrifta sin eksisterande strategi og prioriteringar? Høg score betyr tydeleg strategisk forankring.\n1: Verdi ikkje forstått\n3: Middels\n5: Direkte bidrag til strategiske prioriteringar' },
      { key: 'biz_value',    label: 'Forretningsmessig verdi', tip: 'Kva målbar effekt gir KI-løysinga på kostnad, kvalitet eller inntekt? Høg score betyr tydeleg og skalerbar effekt.\n1: Verdi ikkje forstått\n3: Målbar effekt på kost/kvalitet\n5: Betydeleg og skalerbar effekt' },
      { key: 'biz_timeline', label: 'Tidsramme for endring',   tip: 'Kor raskt kan gevinsten realiserast? Høg score betyr kort tidsramme og låg påverknad på drift.\n1: Lang og høy påvirkning\n3: Moderat endring\n5: Kort og lav påvirkning' },
    ],
  },
  {
    key: 'experience', label: 'BRUKEROPPLEVELSE', color: '#10B981', items: [
      { key: 'exp_personas',   label: 'Brukergrupper',    tip: 'Er det tydeleg kven som brukar løysinga og kva behov dei har? Høg score betyr veldefinerte brukargrupper med dokumenterte behov.\n1: Uklart kven som påverkast\n3: Kjente brukargrupper\n5: Tydelege personas med dokumenterte behov' },
      { key: 'exp_value',      label: 'Verdi for brukere', tip: 'Kor stor og umiddelbar er forbetringa for dei som brukar løysinga? Høg score betyr stor og tydeleg verdi.\n1: Liten eller ukjent\n3: Målbar forbetring\n5: Stor og umiddelbar verdi' },
      { key: 'exp_resistance', label: 'Endringsmotstand',  tip: 'Kor mykje motstand er det forventa frå dei som vert påverka? Høg score betyr låg motstand og minimal påverknad.\n1: Høg motstand\n3: Moderat motstand\n5: Låg motstand, minimal påvirkning' },
    ],
  },
  {
    key: 'tech', label: 'GJENNOMFØRBARHET', color: '#F59E0B', items: [
      { key: 'tech_risk',     label: 'Implementeringsrisiko', tip: 'Kor godt forstått og handterleg er risikoen ved implementering? Høg score betyr låg risiko og godt kjente utfordringar.\n1: Høg risiko\n3: Kjente risikoar med tiltak\n5: Låg risiko, godt forstått' },
      { key: 'tech_security', label: 'Sikkerhetstiltak',      tip: 'Er det etablert tilstrekkelege sikkerheitstiltak for data og system? Høg score betyr robust sikkerhetsarkitektur.\n1: Sikkerheitskrav uklare\n3: Standard tiltak tilstrekkeleg\n5: Robust sikkerhetsarkitektur' },
      { key: 'tech_fit',      label: 'KI/LLM passer?',        tip: 'Kor godt eignar KI/LLM-teknologi seg til å løyse dette konkrete behovet? Høg score betyr sterk match utan store tilpassingar.\n1: Dårleg match\n3: Delvis match, tilpassing nødvendig\n5: Sterk match, teknologi dekker behovet' },
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
