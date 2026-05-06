# CLAUDE.md – Kodeprinsipper for Verdikjede KI-analyse

Denne fila lesast automatisk av Claude Code ved oppstart. Følg alltid desse prinsippa.

---

## 1. Arkitektur

- **Monolittisk Next.js App Router** – ingen microservices
- **Server Components** som standard – bruk `"use client"` kun når nødvendig (interaktivitet, hooks)
- **Server Actions og API Routes** for all logikk som involverer database, AI eller sensitive nøklar

---

## 2. Single Source of Truth

- Alle dimensjonar (`DIMS`), BXT-kategoriar (`BXT_CATS`) og strategiar (`STRATS`) definerast KUN i `/lib/constants.ts` – aldri hardkod desse andre stader
- Alle TypeScript-typar definerast KUN i `/types/index.ts`
- Ingen duplisering av logikk – gjenbruk funksjonar frå `/lib/`

---

## 3. Separation of Concerns

- UI-komponentar i `/components/` – ingen direkte databasekall eller API-kall her
- All databaselogikk i `/lib/db/` – eigne filer per entitet (`analyses`, `companies`, `users`)
- All AI-logikk i `/lib/ai/claude.ts`
- Ingen SQL-spørjingar direkte i komponentar eller sider

---

## 4. Sikkerheit

- **ALDRI** eksponér `SUPABASE_SERVICE_ROLE_KEY` eller `ANTHROPIC_API_KEY` i klientkode
- Kun variablar med `NEXT_PUBLIC_`-prefiks er trygge å bruke i frontend
- All sensitiv logikk køyrast server-side
- RLS er aktivert på alle Supabase-tabellar – stol på det

### Supabase klient/server-grenser

- `createSupabaseServerClient()` brukast i Server Components og Server Actions
- `createSupabaseAdminClient()` brukast kun server-side for admin-operasjonar
- `createSupabaseBrowserClient()` brukast kun i Client Components med `NEXT_PUBLIC_*`-nøklar

### RLS-logikk (viktig)

- `analyses`: brukar ser kun analysar der `company_id` matchar eiga bedrift
- `profiles`: admin ser alle, company/member ser kun eigen bedrift
- `companies`: admin ser alle, company/member ser kun seg sjølv
- Alle entitetar knytt til ein analyse (vc_steps, processes, bxt_scores, tasks) arvar tilgang frå `analyses`
- `processes`-tabellen har kolonne `manually_excluded boolean NOT NULL DEFAULT false` – legg alltid denne med ved INSERT/UPDATE på prosessar

---

## 5. TypeScript-reglar

- **Strict mode** er aktivert – ingen `any`-typar tillatt
- Alle funksjonar har eksplisitte return-typar
- Bruk `zod` for validering av skjemainput og API-responsar
- **Alle domene- og DB-typar skal definerast i `types/index.ts`** – aldri lokalt i `lib/` eller `components/`
- Lokale UI-typar (`Props`, `ErrorProps`) kan vere lokale i komponenten dei tilhøyrer

### TypeScript-sjekk

- Køyr `npx tsc --noEmit` etter kvar gruppe av endringar
- Viss nye feil dukkar opp: stopp og fiks før du går vidare

---

## 6. Server Actions

- **Alle server actions skal returnere `{ success: boolean, data?: T, error?: string }`**
- Klientkode sjekkar alltid `success`-feltet før den brukar `data`
- Alle asynkrone operasjonar har loading-tilstand synleg for brukar
- Alle `try/catch`-blokkar loggar feil og returnerer meiningsfull feilmelding
- Viss AI-funksjonen feiler: vis feilmelding, men la resten av appen fungere normalt
- **Unntak:** `createAnalyseAction()` brukar `redirect()` ved suksess – dette er eit godkjent Next.js-mønster og returnerer aldri ein `{ success: true }`-verdi. Bruk `useFormState` og sjekk berre feilstaten.

---

## 7. AI-åtferd per wizard-steg

### Steg 1 – Generer verdikjede (brukarstyrt)
- Triggerast **berre** ved klikk på "Lag forslag"-knapp – aldri automatisk
- Input: fri tekst + valfri URL + valfri fil (bilde/PDF som base64)
- Output: JSON `{ steps: string[], vc_0: [{name, scores}], vc_1: [...], ... }`
- **Ingen caching** – brukaren kan regenerere fritt
- Feil: vis raud feilboks, la brukaren prøve igjen

### Steg 3 – KI-forslag per prosessteg (automatisk)
- Triggerast første gong eit accordion opnast **manuelt av brukar** – aldri automatisk ved mount
- **Hopar over** viss `problem_desc` eller `usecase_desc` allereie finst i DB
- Output: JSON `{ problem: string, ideas: string }` – fyllast i tekstfelta
- **Cachast i `processes.ai_suggestion`** – hentast frå DB ved neste opning
- Vis spinner i accordion-header medan det genererer

### Steg 4 – Generer oppgåver (automatisk ved sideinnlasting)
- Triggerast **automatisk** når steg 4 lastast og prosessar manglar oppgåver
- **Hopar over** prosessar som allreie har oppgåver i `tasks`-tabell
- Output: JSON `{ proc_0: [{name, automation, potential, tech}], proc_1: [...] }`
- **Cachast i `tasks`-tabell** – regenererast aldri automatisk (berre manuelt)
- Vis global "Genererer oppgåveforslag..."-boks øvst medan det køyrer

### Generelle AI-reglar
- Alle AI-kall går via `/app/api/ai/route.ts` – aldri direkte frå klientkode
- `ANTHROPIC_API_KEY` er aldri eksponert i frontend
- Modell: hentast frå miljøvariabel `ANTHROPIC_MODEL` (default: `claude-sonnet-4-20250514`)
- Ved feil: vis feilmelding, ikkje krasj appen

---

## 8. Ingen hardkoda verdiar

- Alle URL-ar, nøklar og konfigurasjonsverdiar hentast frå miljøvariablar
- Ingen magic strings – bruk TypeScript enums eller konstantar frå `/lib/constants.ts`
- Ingen hardkoda brukar-ID-ar, selskaps-ID-ar eller liknande

---

## 8. Mappestruktur – følg alltid denne

```
verdikjede-ki/
  app/
    (auth)/
      login/
        page.tsx
        LoginForm.tsx
        ForgotPasswordForm.tsx
        actions.ts
      register/
        page.tsx
        RegisterForm.tsx
        actions.ts
      set-password/
        page.tsx
    auth/
      callback/
        route.ts        ← KUN denne fila her, aldri page.tsx
    (app)/
      layout.tsx
      dashboard/
        page.tsx
        loading.tsx
        error.tsx
        InviteMemberForm.tsx
        actions.ts
      analyse/
        ny/
          page.tsx
          loading.tsx
        [id]/
          steg/
            [steg]/
              page.tsx
              loading.tsx
              error.tsx
          rapport/
            page.tsx
            loading.tsx
      admin/
        page.tsx
        loading.tsx
        error.tsx
        bedrifter/
          page.tsx
          actions.ts
    api/
      ai/
        route.ts
  components/
    ui/
    wizard/
      Step1Verdikjede.tsx
      Step2Prosessscoring.tsx
      Step3BXT.tsx
      Step4Oppgaver.tsx
      Step5Rapport.tsx
    rapport/
    layout/
      Navbar.tsx
      LogoutButton.tsx
  lib/
    constants.ts          ← DIMS, BXT_CATS, STRATS – aldri dupliser
    utils.ts              ← delte hjelpefunksjonar (getStratKey, osv.)
    db/
      analyses.ts
      companies.ts
      users.ts
      processes.ts
      tasks.ts
    ai/
      claude.ts
    supabase/
      server.ts
      browser.ts
      admin.ts
    email/
      resend.ts           ← all e-postutsending
  types/index.ts
  middleware.ts
  .env.local              ← aldri i git
  .env.example            ← i git, utan verdiar
```

---

## 9. Brukargrensesnitt

- Alle tekstar på **norsk**
- Fargar: navbar `#1E293B`, primær `#10B981`, sekundær `#3B82F6`
- Komponentar frå **shadcn/ui** og **Tailwind CSS**
- Font: **DM Sans**
- Alle side-mapper skal ha `loading.tsx` og `error.tsx`
- Tooltip ved hover over alle scoringsfelt (frå `DIMS` og `BXT_CATS` i `constants.ts`)

---

## 10. Roller og tilgang

| Rolle | Kan gjere |
|---|---|
| `admin` | Ser alle bedrifter, alle analysar. Inviterer bedrifter. Kan ikkje redigere andre sin analyse. |
| `company` | Fyller ut analysar, inviterer inntil 2 `member`-brukarar, lastar ned rapport. |
| `member` | Same som `company` – kan lese og redigere alle analysane til si bedrift. |

- Maks 3 brukarar per bedrift (1 company + 2 members)
- Ulike bedrifter skal ALDRI sjå kvarandres data

---

## 11. Analysar

- Ei bedrift kan ha fleire analysar
- Alle tre brukarar i ei bedrift kan opprette og redigere alle analysane til bedrifta
- Analysar har eit brukardefinerert tittel/namn
- Dashboard listar alle analysar for innlogga bedrift

---

## 12. Gjennomgang etter endringar

Etter kvar større endring, sjekk:
- [ ] Ingen hardkoda verdiar i koden
- [ ] Ingen `any`-typar i TypeScript
- [ ] Ingen databasekall direkte i komponentar
- [ ] Alle API-nøklar er server-side
- [ ] Alle nye sider har `loading.tsx` og `error.tsx`
- [ ] Konstantar er ikkje dupliserte frå `constants.ts`
- [ ] Nye typar er lagde i `types/index.ts`
- [ ] Nye server actions returnerer `{ success, data?, error? }`
- [ ] `app/auth/callback/` inneheld kun `route.ts` – ikkje `page.tsx` samtidig

---

## 13. Auth-løysing

### Prinsipp: Éin funksjon = eigne filer

- Kvar auth-funksjon skal ha eigne dedikerte filer
- Når du endrar éin funksjon, skal du ALDRI røre filer som tilhøyrer andre funksjonar

### Filer per funksjon

**Innlogging**
- `app/(auth)/login/page.tsx`
- `app/(auth)/login/LoginForm.tsx`
- `app/(auth)/login/actions.ts`

**Logout**
- `components/layout/Navbar.tsx`
- `components/layout/LogoutButton.tsx`

**Glemt passord**
- `app/(auth)/login/ForgotPasswordForm.tsx`
- `app/(auth)/set-password/page.tsx`
- `app/auth/callback/route.ts`

**Invitasjonsflyt (admin inviterer bedrift)**
- `app/(app)/admin/bedrifter/actions.ts`
- `app/auth/callback/route.ts`
- `app/(auth)/set-password/page.tsx`

**Bedrift inviterer intern brukar**
- `app/(app)/dashboard/InviteMemberForm.tsx`
- `app/(app)/dashboard/actions.ts`

### Auth-flyt

**Vanleg innlogging:**
1. Brukar fyller ut e-post og passord i `LoginForm`
2. `signInWithPassword` vert kalla – Supabase set session-cookie
3. `middleware.ts` fangar opp redirect og sender autentisert brukar til `/dashboard`
4. Feil (feil passord, ikkje funnen) visast inline i `LoginForm`

**Invitasjonsflyt (admin inviterer bedrift):**
1. Admin fyller ut bedriftsnamn + e-post i `app/(app)/admin/bedrifter/actions.ts`
2. `inviteCompany` oppretter ny rad i `companies`-tabellen via admin-klienten
3. `inviteUserByEmail` sender invitasjons-e-post med `role: 'company'` og `company_id` i metadata
4. Brukar klikkar lenke → Supabase redirectar til `/auth/callback?token_hash=...&type=invite`
5. `route.ts` vekslar token mot sesjon via `verifyOtp`
6. Redirectar til `/set-password` der brukar set nytt passord
7. Etter passord-sett sendast brukar til `/dashboard`
8. Viss noko feiler undervegs: `companies`-rada vert sletta (rollback)

**Invitasjonsflyt (bedrift inviterer intern brukar):**
1. Bedrift fyller ut e-post i `InviteMemberForm` på `/dashboard`
2. `inviteMember` sjekkar at bedrifta har færre enn 3 brukarar (`count < 3`)
3. `inviteUserByEmail` sender invitasjons-e-post med `role: 'member'` og `company_id` i metadata
4. Resten av flyten er identisk med steg 4–7 over

**Glemt passord:**
1. Brukar klikkar "Glemt passord?" i `LoginForm` og ser `ForgotPasswordForm`
2. `resetPasswordForEmail` vert kalla med `redirectTo: .../auth/callback?type=recovery`
3. Supabase sender e-post med tilbakestillingslenke
4. Brukar klikkar lenke → `/auth/callback?token_hash=...&type=recovery`
5. `route.ts` vekslar token og redirectar til `/set-password`
6. Brukar set nytt passord og sendast til `/dashboard`

### KRITISKE Supabase-innstillingar (ikkje endre)

- Site URL: `https://[app-url].netlify.app/auth/callback`
- Redirect URLs: `https://[app-url].netlify.app/**`

---

## 14. Kontrollert endringsprosess

Bruk alltid denne prosessen for endringar som ikkje er trivielle:

**Steg 1 – Kartlegg:** "IKKJE GJER NOKON ENDRINGAR ENNO. Vis kva filer som er relevante."

**Steg 2 – Planlegg:** "IKKJE GJER NOKON ENDRINGAR ENNO. Vis kva du vil endre i kvar fil."

**Steg 3 – Godkjenn:** "Ser bra ut. Gjer endringane no. Ikkje commit enno."

**Steg 4 – Typesjekk:** `npx tsc --noEmit` – vis output.

**Steg 5 – Commit:** `git add` + `git commit -m "[type]: [beskriving]"` – ikkje push enno.

**Steg 6 – Push:** Når commit ser riktig ut, push til main.

**Steg 7 – Test i nettlesar etter deploy.**

---

## 14b. Sjekkliste før commit

Gå gjennom desse punkta før kvar commit:
- [ ] Ingen migrasjonsfiler er utilsikta inkluderte (`git status` – sjekk `.sql`-filer)
- [ ] `app/auth/callback/` inneheld kun `route.ts` – ikkje `page.tsx` samtidig
- [ ] Commit-meldinga er beskrivande: `[type]: [kva og kvifor]`
- [ ] `.env.local` er ikkje staged
- [ ] `.claude/settings.local.json` er ikkje staged

---

## 15. Risikovurdering

| Type endring | Risiko | Test |
|---|---|---|
| Nye filer (loading/error) | LAV | Refresh på berørte sider |
| Flytte TypeScript-typar | MEDIUM | `npx tsc` + refresh |
| Standardisere server actions | MEDIUM | Utfør alle berørte handlingar |
| Auth-endringar | HØG | Full auth-flyt alle roller |
| Migrering | HØG | Alle roller og RLS |

---

## 16. FERDIGSTILT

*(Oppdaterast etter kvart som funksjonalitet er ferdig og verifisert)*

- [x] Prosjektoppsett og mappestruktur
- [x] Database-migrering og RLS
- [x] Autentisering (alle roller)
- [x] Dashboard med analyseoversikt
- [x] Wizard steg 1–5
- [x] AI-funksjonalitet med caching
- [x] PDF-rapport
- [x] Deploy test
- [ ] Deploy prod

---

## 19. Miljøvariablar

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[prosjekt-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key]
SUPABASE_SERVICE_ROLE_KEY=[service_role key – KUN server-side]

# Anthropic
ANTHROPIC_API_KEY=[nøkkel]
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Resend (eiga nøkkel for denne appen, same konto som DD-appen)
RESEND_API_KEY=[nøkkel]
RESEND_FROM=noreply@ccnybokonsult.no

# App
NEXT_PUBLIC_APP_URL=https://[netlify-url].netlify.app
```

**Aldri** commit `.env.local` til git. `.env.example` ligg i git utan verdiar.

---

## 19b. Miljøoppsett (Test / Prod)

| | Test | Prod |
|---|---|---|
| Netlify | Auto-deploy (main) | Manuell trigger |
| Supabase | Eige prosjekt | Eige prosjekt |
| Auto-deploy | På | Låst |

### Oppsett prod (i rekkefølge)
1. Opprett nytt Supabase-prosjekt (prod) i West EU (Ireland)
2. Køyr alle migrering på prod-databasen
3. Opprett ny Netlify-site frå same GitHub-repo
4. Legg inn alle miljøvariablar på prod
5. Set Site URL og Redirect URLs i Supabase prod auth
6. Lås auto-publishing på prod i Netlify
7. Opprett admin-brukar i Supabase prod auth
8. Set `role = 'admin'` på admin-brukar via SQL

---

## 20. Verktøy og tenester

| Verktøy | Formål | Detaljar |
|---|---|---|
| Claude Code | AI-kodeeditor, all utvikling | – |
| GitHub | Versjonskontroll | `github.com/fnyboe/verdikjede-ki` |
| Netlify | Hosting og deploy | Test: auto-deploy frå `main`. Prod: manuell trigger |
| Supabase | Auth, Database | Eige prosjekt, same org som DD-appen. Pro plan. |
| Resend | E-postutsending | Same konto (`fnyboe`) og domene (`ccnybokonsult.no`) som DD-appen. **Eiga API-nøkkel** for verdikjede-appen. |
| Anthropic Claude | AI-modell | `claude-sonnet-4-20250514` via `ANTHROPIC_MODEL` env-var |

### Resend – e-postar som sendast

| Trigger | Mottakar | Emne |
|---|---|---|
| Admin inviterer bedrift | Ny bedriftsbrukar | "Du er invitert til Verdikjede KI-analyse" |
| Bedrift inviterer intern brukar | Ny intern brukar | "Du er invitert til [Bedriftsnamn] sin analyse" |
| Glemt passord | Innlogga brukar | "Tilbakestill passord" |

- Avsendaradresse: `noreply@ccnybokonsult.no`
- All e-postlogikk samla i `/lib/email/resend.ts`
- `RESEND_API_KEY` er aldri eksponert i frontend

---

## 21. Testbrukarar

| E-post | Rolle | Merknad |
|---|---|---|
| fnyboe@outlook.com | Admin | Oppretta manuelt i Supabase auth + SQL |
| *(inviterast av admin under testing)* | Bedrift | T.d. fnyboe@gmail.com |
| *(inviterast av bedrift under testing)* | Intern brukar (member) | T.d. fnyboe2@gmail.com |
| *(inviterast av bedrift under testing)* | Intern brukar (member) | T.d. fnyboe@pm.me |

---

## KRITISKE REGLAR

1. **ALDRI** slett `app/auth/callback/route.ts`
2. `app/auth/callback/` skal **KUN** innehalde `route.ts` – aldri `page.tsx` samtidig
3. **Commit aldri** migrasjonsfiler som ikkje er del av oppgåva
4. Bruk `middleware.ts` – ikkje `proxy.ts`
5. Alle konstantar (DIMS, BXT_CATS, STRATS) kjem frå `/lib/constants.ts` – aldri hardkod
