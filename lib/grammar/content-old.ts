/**
 * Grammar content - static data for grammar tenses
 * 
 * All content is authored and transferred 1:1 from provided materials.
 */

import { GrammarContent, GrammarTense } from "./types";

export const grammarContent: GrammarContent = {
  tenses: [
    // A) PRESENT SIMPLE
    {
      slug: "present-simple",
      title: "Present Simple",
      description: "Podstawowy czas teraźniejszy",
      content: {
        sections: [
          {
            id: "usage",
            title: "Po co używamy Present Simple",
            content: `Present Simple to czas, którego używasz, gdy mówisz o rzeczach stałych albo powtarzalnych:

Rutyny i nawyki: co robisz zwykle, regularnie.

Ogólne prawdy i fakty: rzeczy prawdziwe „z zasady".

Stany i preferencje: like, know, believe, want (często).

Rozkłady i harmonogramy: pociągi, zajęcia, loty (nawet gdy dotyczą przyszłości).

Pytanie kontrolne: Czy to jest „zwykle / zawsze / ogólnie", a nie „teraz w tej chwili"?
Jeśli tak → Present Simple.`,
          },
          {
            id: "characteristic-words",
            title: "Charakterystyczne słowa i zwroty",
            content: `often, usually, always, sometimes, never

every day / week / month

on Mondays, at weekends

Wskazówka: te słowa często stoją przed głównym czasownikiem, ale po "to be".`,
          },
          {
            id: "structure",
            title: "Struktura i odmiana",
            content: `Twierdzenie (affirmative)

I/you/we/they + base form

he/she/it + base form + s/es

Przykłady:

I work in Warsaw.

She works in Warsaw.

Przeczenie (negative)

I/you/we/they do not (don't) + base form

he/she/it does not (doesn't) + base form

Przykłady:

I don't eat meat.

He doesn't eat meat.

Pytanie (question)

Do + I/you/we/they + base form?

Does + he/she/it + base form?

Przykłady:

Do you work here?

Does she work here?

Słówko pomocnicze (auxiliary): do/does

"do/does" wchodzi w pytania i przeczenia. Główny czasownik wraca do base form.

Najczęstsza pułapka:

❌ Does she works?

✅ Does she work?

Końcówka -s / -es / -ies (3. osoba)

Zwykle: work → works

-es: watch → watches, go → goes, fix → fixes

spółgłoska + y: study → studies

samogłoska + y: play → plays`,
          },
          {
            id: "examples",
            title: "Przykłady zdań",
            content: `I drink coffee every morning.

She studies English on Mondays.

The shop opens at 9 a.m.`,
          },
          {
            id: "dialog",
            title: "Dialog w praktyce",
            content: `Mia: What do you do after work?
Tom: I go to the gym twice a week.
Mia: And your sister?
Tom: She works from home and teaches online.
Mia: Do you cook at home?
Tom: Yes, I cook almost every day.`,
          },
          {
            id: "when-not",
            title: "Kiedy NIE używać Present Simple",
            content: `Gdy coś dzieje się teraz, w tej chwili → zwykle Present Continuous.

Gdy mówisz o doświadczeniu / wyniku teraz → często Present Perfect.

Zobacz też: Present Perfect.`,
          },
          {
            id: "comparison",
            title: "Porównaj: Present Simple vs Present Perfect",
            content: `Intencja:

Present Simple: rutyna / fakt / harmonogram

Present Perfect: doświadczenie / skutek teraz / okres „do teraz"

Przykłady:

I live in Kraków.

I have lived in Kraków for three years.

She works in IT.

She has worked in IT since 2019.

Dialog kontrastowy:
A: Do you travel a lot?
B: Yes, I travel for work.
A: Where have you been recently?
B: I have been to Berlin and Prague this month.`,
          },
          {
            id: "common-mistakes",
            title: "Najczęstsze błędy",
            content: `❌ Does she works? → ✅ Does she work?

❌ He go to work. → ✅ He goes to work.

❌ I am go to work. → ✅ I go to work.`,
          },
        ],
        chips: [
          { text: "often", description: "często" },
          { text: "usually", description: "zwykle" },
          { text: "always", description: "zawsze" },
          { text: "sometimes", description: "czasami" },
          { text: "never", description: "nigdy" },
          { text: "every day", description: "codziennie" },
          { text: "on Mondays", description: "w poniedziałki" },
        ],
        relatedLinks: [
          { slug: "present-perfect", title: "Present Perfect", description: "Doświadczenie / skutek teraz" },
        ],
        comparisons: [
          {
            tense1: "present-simple",
            tense2: "present-perfect",
            title: "Present Simple vs Present Perfect",
            description: "Rutyna vs doświadczenie",
          },
        ],
      },
      practiceLink: "/app/vocab", // Placeholder - będzie w przyszłości dedykowana strona
      courseLink: "#", // Placeholder - "wkrótce"
    },

    // B) PRESENT CONTINUOUS
    {
      slug: "present-continuous",
      title: "Present Continuous",
      description: "Czas teraźniejszy ciągły",
      content: {
        sections: [
          {
            id: "usage",
            title: "Po co używamy Present Continuous",
            content: `Present Continuous opisuje co dzieje się teraz lub wokół teraz:

Akcja w trakcie: "w tej chwili".

Tymczasowość: sytuacje „na ten okres", nie na stałe.

Zmiany i trendy: coś się zmienia, rozwija.

Ustalone plany w przyszłości: gdy mamy zaplanowane spotkanie/podróż.

Pytanie kontrolne: Czy to jest "w trakcie", "w tym okresie" albo "umówione"?
Jeśli tak → Present Continuous.`,
          },
          {
            id: "characteristic-words",
            title: "Charakterystyczne słowa i zwroty",
            content: `now, right now, at the moment

today, this week, these days

currently

Look! / Listen!`,
          },
          {
            id: "structure",
            title: "Struktura i odmiana",
            content: `Twierdzenie

am/is/are + verb-ing

I am working

he/she/it is working

you/we/they are working

Przeczenie

am not / isn't / aren't + verb-ing

I am not working

She isn't working

They aren't working

Pytanie

Am/Is/Are + subject + verb-ing?

Are you working now?

Is he studying?

Jak tworzymy -ing

Najczęstsze reguły:

work → working

take → taking (usuń "e")

run → running (podwójna spółgłoska: run → running)

lie → lying (ie → y)`,
          },
          {
            id: "examples",
            title: "Przykłady zdań",
            content: `I am reading a new book right now.

She is learning English these days.

They are meeting the teacher tomorrow.`,
          },
          {
            id: "dialog",
            title: "Dialog w praktyce",
            content: `A: Hi! Can you talk?
B: Not now. I am cooking dinner.
A: What are you making?
B: I am making pasta.
A: Nice. We are coming to your place tomorrow, right?
B: Yes, we are meeting at 6.`,
          },
          {
            id: "when-not",
            title: "Kiedy NIE używać Present Continuous",
            content: `Gdy mówisz o rutynie/fakcie → Present Simple.

Z czasownikami stanu (często): know, like, love, believe
Zwykle: "I know", a nie "I am knowing".

Zobacz też: Present Simple.`,
          },
          {
            id: "comparison",
            title: "Porównaj: Present Simple vs Present Continuous",
            content: `Intencja:

Present Simple: rutyna / stały fakt

Present Continuous: teraz / tymczasowo / w trakcie

Przykłady:

I work in a bank. (stała praca)

I am working from home this week. (tymczasowo)

She teaches English. (zawód)

She is teaching a new group today. (dziś)`,
          },
          {
            id: "common-mistakes",
            title: "Najczęstsze błędy",
            content: `❌ I am work now. → ✅ I am working now.

❌ She are studying. → ✅ She is studying.

❌ I am knowing him. → ✅ I know him.`,
          },
        ],
        chips: [
          { text: "now", description: "teraz" },
          { text: "right now", description: "w tej chwili" },
          { text: "at the moment", description: "w tym momencie" },
          { text: "today", description: "dzisiaj" },
          { text: "this week", description: "w tym tygodniu" },
          { text: "these days", description: "w dzisiejszych czasach" },
          { text: "currently", description: "obecnie" },
        ],
        relatedLinks: [
          { slug: "present-simple", title: "Present Simple", description: "Rutyna / stały fakt" },
        ],
        comparisons: [
          {
            tense1: "present-simple",
            tense2: "present-continuous",
            title: "Present Simple vs Present Continuous",
            description: "Rutyna vs teraz",
          },
        ],
      },
      practiceLink: "/app/vocab",
      courseLink: "#",
    },

    // C) PAST SIMPLE
    {
      slug: "past-simple",
      title: "Past Simple",
      description: "Czas przeszły prosty",
      content: {
        sections: [
          {
            id: "usage",
            title: "Po co używamy Past Simple",
            content: `Past Simple opisuje zakończone wydarzenia w przeszłości:

Jednorazowe zdarzenie w konkretnym momencie w przeszłości.

Sekwencję wydarzeń w opowiadaniu.

Dawne nawyki (często z "used to", albo same Past Simple w kontekście).

Pytanie kontrolne: Czy to jest „skończone" i ma wyraźny czas/przeszłość?
Jeśli tak → Past Simple.`,
          },
          {
            id: "characteristic-words",
            title: "Charakterystyczne słowa i zwroty",
            content: `yesterday, last week/month/year

two days ago, in 2019, when I was a child

then, after that`,
          },
          {
            id: "structure",
            title: "Struktura i odmiana",
            content: `Twierdzenie

regular: verb + -ed (work → worked)

irregular: 2. forma (go → went)

Przykłady:

I visited my friend yesterday.

She went to London last year.

Przeczenie

did not (didn't) + base form

I didn't go there.

He didn't watch TV.

Pytanie

Did + subject + base form?

Did you see him?

Did she call you?

-ed: szybkie zasady wymowy (dla ucznia)

/t/: worked, watched

/d/: played, cleaned

/ɪd/: wanted, needed`,
          },
          {
            id: "examples",
            title: "Przykłady zdań",
            content: `We watched a movie last night.

I bought a new laptop two weeks ago.

She didn't answer my message.`,
          },
          {
            id: "dialog",
            title: "Dialog w praktyce",
            content: `A: How was your weekend?
B: Great. I visited my grandparents.
A: Nice. What did you do there?
B: We cooked together and played cards.
A: Did you go anywhere else?
B: Yes, we went to the park on Sunday.`,
          },
          {
            id: "when-not",
            title: "Kiedy NIE używać Past Simple",
            content: `Gdy mówisz o doświadczeniu „do teraz" bez konkretnego czasu → Present Perfect.

Gdy opisujesz tło i akcję "w trakcie" w przeszłości → Past Continuous.

Zobacz też: Present Perfect, Past Continuous.`,
          },
          {
            id: "comparison",
            title: "Porównaj: Past Simple vs Present Perfect (bardzo częste)",
            content: `Past Simple: konkretna przeszłość (yesterday, in 2020)

Present Perfect: „kiedyś" + efekt/doświadczenie do teraz

Przykłady:

I went to Spain in 2022.

I have been to Spain. (w życiu / do teraz)`,
          },
          {
            id: "common-mistakes",
            title: "Najczęstsze błędy",
            content: `❌ Did you went? → ✅ Did you go?

❌ I didn't went. → ✅ I didn't go.

❌ He goed. → ✅ He went.`,
          },
        ],
        chips: [
          { text: "yesterday", description: "wczoraj" },
          { text: "last week", description: "w zeszłym tygodniu" },
          { text: "last month", description: "w zeszłym miesiącu" },
          { text: "last year", description: "w zeszłym roku" },
          { text: "ago", description: "temu" },
          { text: "in 2019", description: "w 2019" },
          { text: "then", description: "wtedy" },
        ],
        relatedLinks: [
          { slug: "present-perfect", title: "Present Perfect", description: "Doświadczenie do teraz" },
          { slug: "past-continuous", title: "Past Continuous", description: "Akcja w trakcie w przeszłości" },
        ],
        comparisons: [
          {
            tense1: "past-simple",
            tense2: "present-perfect",
            title: "Past Simple vs Present Perfect",
            description: "Konkretna przeszłość vs doświadczenie",
          },
        ],
      },
      practiceLink: "/app/vocab",
      courseLink: "#",
    },

    // D) PAST CONTINUOUS
    {
      slug: "past-continuous",
      title: "Past Continuous",
      description: "Czas przeszły ciągły",
      content: {
        sections: [
          {
            id: "usage",
            title: "Po co używamy Past Continuous",
            content: `Past Continuous opisuje akcję w trakcie w przeszłości:

Tło dla innego wydarzenia (które wchodzi Past Simple).

Akcja przerwana przez inne zdarzenie.

Dwie równoległe czynności w tym samym czasie w przeszłości.

Pytanie kontrolne: Czy coś „trwało", gdy coś innego się wydarzyło?
Jeśli tak → Past Continuous.`,
          },
          {
            id: "characteristic-words",
            title: "Charakterystyczne słowa i zwroty",
            content: `while, when

at 7 p.m. yesterday, at that moment

all day, all evening (w opisie)`,
          },
          {
            id: "structure",
            title: "Struktura i odmiana",
            content: `Twierdzenie

was/were + verb-ing

I/he/she/it was working

you/we/they were working

Przeczenie

wasn't/weren't + verb-ing

She wasn't sleeping

They weren't listening

Pytanie

Was/Were + subject + verb-ing?

Were you studying at 9?

Was he driving?`,
          },
          {
            id: "examples",
            title: "Przykłady zdań",
            content: `I was studying when you called.

They were playing football at 5 p.m.

While she was cooking, he was setting the table.`,
          },
          {
            id: "dialog",
            title: "Dialog w praktyce",
            content: `A: Why didn't you answer the phone?
B: Sorry, I was driving.
A: What were you doing at 8?
B: I was meeting a client.
A: And what happened then?
B: While I was talking, my phone rang.

(Zwróć uwagę: tło = was talking, zdarzenie punktowe = rang)`,
          },
          {
            id: "when-not",
            title: "Kiedy NIE używać Past Continuous",
            content: `Do pojedynczych, zakończonych zdarzeń → Past Simple.

Gdy nie ma "trwania w tle" ani "w trakcie" → zwykle Past Simple.

Zobacz też: Past Simple.`,
          },
          {
            id: "comparison",
            title: "Porównaj: Past Simple vs Past Continuous",
            content: `Past Simple: zdarzenie punktowe / sekwencja

Past Continuous: tło / akcja w trakcie

Przykład:

I was watching TV when the door opened.`,
          },
          {
            id: "common-mistakes",
            title: "Najczęstsze błędy",
            content: `❌ I was watch TV. → ✅ I was watching TV.

❌ They was playing. → ✅ They were playing.

❌ When I was arrived… → ✅ When I arrived…`,
          },
        ],
        chips: [
          { text: "while", description: "podczas gdy" },
          { text: "when", description: "gdy" },
          { text: "at that moment", description: "w tamtym momencie" },
          { text: "all day", description: "cały dzień" },
          { text: "all evening", description: "cały wieczór" },
        ],
        relatedLinks: [
          { slug: "past-simple", title: "Past Simple", description: "Zdarzenie punktowe" },
        ],
        comparisons: [
          {
            tense1: "past-simple",
            tense2: "past-continuous",
            title: "Past Simple vs Past Continuous",
            description: "Zdarzenie vs tło",
          },
        ],
      },
      practiceLink: "/app/vocab",
      courseLink: "#",
    },

    // E) PRESENT PERFECT
    {
      slug: "present-perfect",
      title: "Present Perfect",
      description: "Czas teraźniejszy dokonany",
      content: {
        sections: [
          {
            id: "usage",
            title: "Po co używamy Present Perfect",
            content: `Present Perfect łączy przeszłość z teraźniejszością. Używasz go, gdy:

mówisz o doświadczeniu („kiedykolwiek" w życiu),

mówisz o wyniku teraz (coś się stało i ma efekt),

mówisz o okresie od przeszłości do teraz (since/for),

mówisz o wydarzeniach w "niezamkniętym czasie" (today, this week).

Pytanie kontrolne: Czy ważne jest „do teraz", a nie konkretny moment w przeszłości?
Jeśli tak → Present Perfect.`,
          },
          {
            id: "characteristic-words",
            title: "Charakterystyczne słowa i zwroty",
            content: `ever, never

already, yet, just

since, for

this week, today (jeśli okres trwa)`,
          },
          {
            id: "structure",
            title: "Struktura i odmiana",
            content: `Twierdzenie

have/has + past participle (3. forma)

I/you/we/they have worked

he/she/it has worked

Przeczenie

haven't/hasn't + past participle

I haven't seen it.

She hasn't finished.

Pytanie

Have/Has + subject + past participle?

Have you ever been to Italy?

Has he done it?`,
          },
          {
            id: "examples",
            title: "Przykłady zdań",
            content: `I have just finished my homework.

She has lived here since 2020.

We haven't seen that movie yet.`,
          },
          {
            id: "dialog",
            title: "Dialog w praktyce",
            content: `A: Do you want coffee?
B: Not now. I have already had two cups.
A: Oh. Have you finished the report yet?
B: Yes, I have sent it to you.
A: Great. I haven't checked my inbox yet.`,
          },
          {
            id: "when-not",
            title: "Kiedy NIE używać Present Perfect",
            content: `Gdy podajesz konkretny czas w przeszłości (yesterday, in 2019) → Past Simple.

Gdy chcesz opisać "akcję w trakcie" → Present Perfect Continuous (jeśli istotny proces).

Zobacz też: Past Simple, Present Perfect Continuous.`,
          },
          {
            id: "comparison",
            title: "Porównaj: Past Simple vs Present Perfect",
            content: `Past Simple: kiedy? (konkretnie)

Present Perfect: czy/do teraz? (bez "kiedy")

Przykłady:

I saw him yesterday.

I have seen him. (kiedyś / do teraz)`,
          },
          {
            id: "common-mistakes",
            title: "Najczęstsze błędy",
            content: `❌ I have seen him yesterday. → ✅ I saw him yesterday.

❌ She have finished. → ✅ She has finished.

❌ Did you ever…? (gdy "do teraz") → ✅ Have you ever…?`,
          },
        ],
        chips: [
          { text: "ever", description: "kiedykolwiek" },
          { text: "never", description: "nigdy" },
          { text: "already", description: "już" },
          { text: "yet", description: "jeszcze" },
          { text: "just", description: "właśnie" },
          { text: "since", description: "od" },
          { text: "for", description: "przez" },
        ],
        relatedLinks: [
          { slug: "past-simple", title: "Past Simple", description: "Konkretna przeszłość" },
          { slug: "present-perfect-continuous", title: "Present Perfect Continuous", description: "Proces do teraz" },
        ],
        comparisons: [
          {
            tense1: "present-simple",
            tense2: "present-perfect",
            title: "Present Simple vs Present Perfect",
            description: "Rutyna vs doświadczenie",
          },
          {
            tense1: "past-simple",
            tense2: "present-perfect",
            title: "Past Simple vs Present Perfect",
            description: "Konkretna przeszłość vs doświadczenie",
          },
        ],
      },
      practiceLink: "/app/vocab",
      courseLink: "#",
    },

    // F) PRESENT PERFECT CONTINUOUS
    {
      slug: "present-perfect-continuous",
      title: "Present Perfect Continuous",
      description: "Czas teraźniejszy dokonany ciągły",
      content: {
        sections: [
          {
            id: "usage",
            title: "Po co używamy Present Perfect Continuous",
            content: `Ten czas podkreśla proces trwający do teraz albo skutek widoczny teraz, gdy ważne jest „jak długo / jak intensywnie".

Używasz go, gdy:

coś zaczęło się w przeszłości i trwa do teraz (process),

widzisz efekt teraz i chcesz podkreślić czynność (np. zmęczenie),

chcesz powiedzieć "robię to od jakiegoś czasu".

Pytanie kontrolne: Czy ważniejsze jest "jak długo / w trakcie", a nie sam fakt ukończenia?
Jeśli tak → Present Perfect Continuous.`,
          },
          {
            id: "characteristic-words",
            title: "Charakterystyczne słowa i zwroty",
            content: `for, since

all day, recently, lately

How long…?`,
          },
          {
            id: "structure",
            title: "Struktura i odmiana",
            content: `Twierdzenie

have/has been + verb-ing

I/you/we/they have been studying

he/she/it has been studying

Przeczenie

haven't/hasn't been + verb-ing

I haven't been sleeping well.

She hasn't been working lately.

Pytanie

Have/Has + subject + been + verb-ing?

Have you been waiting long?

Has he been practicing?`,
          },
          {
            id: "examples",
            title: "Przykłady zdań",
            content: `I have been learning English for two months.

She has been working here since April.

They have been arguing all day.`,
          },
          {
            id: "dialog",
            title: "Dialog w praktyce",
            content: `A: You look tired.
B: I am. I have been working all day.
A: Have you been studying too?
B: Yes, I have been preparing for an exam.
A: No wonder you're exhausted.`,
          },
          {
            id: "when-not",
            title: "Kiedy NIE używać Present Perfect Continuous",
            content: `Gdy mówisz o rezultacie/ukończeniu jako fakcie → Present Perfect.

Z niektórymi czasownikami stanu częściej używa się Present Perfect lub Present Simple (np. know, belong).

Zobacz też: Present Perfect.`,
          },
          {
            id: "comparison",
            title: "Porównaj: Present Perfect vs Present Perfect Continuous",
            content: `Present Perfect: rezultat / fakt ukończenia / ile razy

Present Perfect Continuous: proces / jak długo / widoczny wysiłek

Przykłady:

I have written three emails. (rezultat)

I have been writing emails all morning. (proces)

She has cleaned the kitchen. (zrobione)

She has been cleaning the kitchen. (trwało / wysiłek)`,
          },
          {
            id: "common-mistakes",
            title: "Najczęstsze błędy",
            content: `❌ I have been work. → ✅ I have been working.

❌ She have been studying. → ✅ She has been studying.

❌ I have been knowing… → ✅ I have known… / I know…`,
          },
        ],
        chips: [
          { text: "for", description: "przez" },
          { text: "since", description: "od" },
          { text: "all day", description: "cały dzień" },
          { text: "recently", description: "ostatnio" },
          { text: "lately", description: "ostatnio" },
          { text: "How long", description: "jak długo" },
        ],
        relatedLinks: [
          { slug: "present-perfect", title: "Present Perfect", description: "Rezultat / fakt" },
        ],
        comparisons: [
          {
            tense1: "present-perfect",
            tense2: "present-perfect-continuous",
            title: "Present Perfect vs Present Perfect Continuous",
            description: "Rezultat vs proces",
          },
        ],
      },
      practiceLink: "/app/vocab",
      courseLink: "#",
    },

    // G) FUTURE SIMPLE
    {
      slug: "future-simple",
      title: "Future Simple",
      description: "Czas przyszły prosty",
      content: {
        sections: [
          {
            id: "usage",
            title: "Po co używamy Future Simple",
            content: `Future Simple (z will) używamy, gdy mówimy o przyszłości w sposób "neutralny", często spontaniczny:

Spontaniczne decyzje podejmowane w chwili mówienia.

Obietnice / oferowanie pomocy.

Przewidywania (opinie, przypuszczenia) bez konkretnego planu.

Fakty o przyszłości, gdy nie podkreślamy planowania.

Pytanie kontrolne: Czy to jest decyzja/obietnica/przewidywanie, a nie zaplanowane wydarzenie?
Jeśli tak → Future Simple.`,
          },
          {
            id: "characteristic-words",
            title: "Charakterystyczne słowa i zwroty",
            content: `tomorrow, next week/month/year

soon, later

I think…, probably, maybe

in the future`,
          },
          {
            id: "structure",
            title: "Struktura i odmiana",
            content: `Twierdzenie

will + base form

I will go

he/she/it will go

we/they will go

Przeczenie

will not (won't) + base form

I won't forget

She won't come

Pytanie

Will + subject + base form?

Will you help me?

Will she call?

Słówko pomocnicze (auxiliary): will

"will" jest stałe dla wszystkich osób (nie ma odmiany jak do/does).
Główny czasownik zawsze zostaje w base form.`,
          },
          {
            id: "examples",
            title: "Przykłady zdań",
            content: `I will call you tonight.

She won't be late.

I think they will win.`,
          },
          {
            id: "dialog",
            title: "Dialog w praktyce",
            content: `A: I'm hungry.
B: I will make you a sandwich.
A: Thanks!
B: No problem. I will do it now.
A: Will you add some cheese?
B: Sure, I will.`,
          },
          {
            id: "when-not",
            title: "Kiedy NIE używać Future Simple",
            content: `Gdy masz konkretny plan/umówkę → często Present Continuous / "going to".

Gdy mówisz o czymś zaplanowanym "w kalendarzu" (np. spotkanie) → Present Continuous bywa naturalniejsze.

Zobacz też: Present Continuous (plany), "going to" (jeśli dodasz w przyszłości jako osobny temat).`,
          },
          {
            id: "comparison",
            title: "Porównaj: Future Simple vs Present Continuous (plany)",
            content: `Future Simple: decyzja/przewidywanie/obietnica

Present Continuous: umówiony plan

Przykłady:

I will visit my friend. (decyzja teraz)

I am visiting my friend tomorrow. (umówione)`,
          },
          {
            id: "common-mistakes",
            title: "Najczęstsze błędy",
            content: `❌ He wills go. → ✅ He will go.

❌ Will you to help? → ✅ Will you help?

❌ I will can… → ✅ I will be able to… (lub "I can…" jeśli nie przyszłość)`,
          },
        ],
        chips: [
          { text: "tomorrow", description: "jutro" },
          { text: "next week", description: "w przyszłym tygodniu" },
          { text: "soon", description: "wkrótce" },
          { text: "later", description: "później" },
          { text: "probably", description: "prawdopodobnie" },
          { text: "maybe", description: "może" },
        ],
        relatedLinks: [
          { slug: "present-continuous", title: "Present Continuous", description: "Umówione plany" },
        ],
        comparisons: [
          {
            tense1: "future-simple",
            tense2: "present-continuous",
            title: "Future Simple vs Present Continuous",
            description: "Decyzja vs plan",
          },
        ],
      },
      practiceLink: "/app/vocab",
      courseLink: "#",
    },

    // H) FUTURE CONTINUOUS
    {
      slug: "future-continuous",
      title: "Future Continuous",
      description: "Czas przyszły ciągły",
      content: {
        sections: [
          {
            id: "usage",
            title: "Po co używamy Future Continuous",
            content: `Future Continuous opisuje akcję w trakcie w przyszłości:

Coś będzie się działo o konkretnej godzinie w przyszłości.

Używane do uprzejmych pytań o plany (mniej "naciskające").

Czasem do "naturalnego tła" w przyszłości (jak Past Continuous, tylko future).

Pytanie kontrolne: Czy chodzi o to, że "będę w trakcie robienia" w danym momencie?
Jeśli tak → Future Continuous.`,
          },
          {
            id: "characteristic-words",
            title: "Charakterystyczne słowa i zwroty",
            content: `this time tomorrow / next week

at 7 p.m. tomorrow

in an hour, later today (w znaczeniu "wtedy będę w trakcie")`,
          },
          {
            id: "structure",
            title: "Struktura i odmiana",
            content: `Twierdzenie

will be + verb-ing

I will be working

she will be studying

they will be traveling

Przeczenie

won't be + verb-ing

I won't be sleeping

He won't be using the car.

Pytanie

Will + subject + be + verb-ing?

Will you be waiting for me?

Will she be working tomorrow?`,
          },
          {
            id: "examples",
            title: "Przykłady zdań",
            content: `This time tomorrow, I will be flying to London.

At 8 p.m., we will be having dinner.

She won't be staying long.`,
          },
          {
            id: "dialog",
            title: "Dialog w praktyce",
            content: `A: Can I call you at 6?
B: At 6 I will be driving.
A: Okay, what about 7?
B: At 7 I will be cooking dinner, but I can talk.
A: Great. Will you be using your laptop?
B: Yes, I will be working on it.`,
          },
          {
            id: "when-not",
            title: "Kiedy NIE używać Future Continuous",
            content: `Gdy mówisz o jednorazowym fakcie/obietnicy → Future Simple.

Gdy mówisz o ukończeniu do momentu → Future Perfect.

Zobacz też: Future Simple, Future Perfect Simple.`,
          },
          {
            id: "comparison",
            title: "Porównaj: Future Simple vs Future Continuous",
            content: `Future Simple: decyzja/obietnica/przewidywanie

Future Continuous: "w trakcie" w określonym momencie

Przykłady:

I will help you tonight. (obietnica)

I will be helping you at 8 p.m. (o 20:00 będę w trakcie)`,
          },
          {
            id: "common-mistakes",
            title: "Najczęstsze błędy",
            content: `❌ I will working. → ✅ I will be working.

❌ Will you be to wait? → ✅ Will you be waiting?

❌ He will be work. → ✅ He will be working.`,
          },
        ],
        chips: [
          { text: "this time tomorrow", description: "o tej porze jutro" },
          { text: "at 7 p.m. tomorrow", description: "jutro o 19:00" },
          { text: "in an hour", description: "za godzinę" },
        ],
        relatedLinks: [
          { slug: "future-simple", title: "Future Simple", description: "Decyzja / obietnica" },
          { slug: "future-perfect-simple", title: "Future Perfect Simple", description: "Ukończenie do momentu" },
        ],
        comparisons: [
          {
            tense1: "future-simple",
            tense2: "future-continuous",
            title: "Future Simple vs Future Continuous",
            description: "Decyzja vs w trakcie",
          },
        ],
      },
      practiceLink: "/app/vocab",
      courseLink: "#",
    },

    // I) FUTURE PERFECT SIMPLE
    {
      slug: "future-perfect-simple",
      title: "Future Perfect Simple",
      description: "Czas przyszły dokonany",
      content: {
        sections: [
          {
            id: "usage",
            title: "Po co używamy Future Perfect Simple",
            content: `Future Perfect opisuje czynność, która zostanie ukończona przed konkretnym momentem w przyszłości:

"Do jutra/Do 5-tej/Do końca tygodnia" coś będzie już zrobione.

Podkreślamy rezultat i "deadline".

Często przy planowaniu pracy, projektów, nauki.

Pytanie kontrolne: Czy mówisz "będzie już zrobione do…"?
Jeśli tak → Future Perfect.`,
          },
          {
            id: "characteristic-words",
            title: "Charakterystyczne słowa i zwroty",
            content: `by tomorrow / by next week

by the time…

before (w kontekście przyszłości)

in two hours (czasem w znaczeniu "za 2h będzie zrobione")`,
          },
          {
            id: "structure",
            title: "Struktura i odmiana",
            content: `Twierdzenie

will have + past participle (3. forma)

I will have finished

she will have done

they will have arrived

Przeczenie

won't have + past participle

I won't have finished by then.

Pytanie

Will + subject + have + past participle?

Will you have completed it by Friday?`,
          },
          {
            id: "examples",
            title: "Przykłady zdań",
            content: `By 6 p.m., I will have finished work.

She will have left before you arrive.

They won't have completed the project by Monday.`,
          },
          {
            id: "dialog",
            title: "Dialog w praktyce",
            content: `A: Can we meet at 5?
B: At 5 I'm not sure. By 6 I will have finished my meeting.
A: Okay. Will you have written the report by then?
B: Yes, I will have sent it before 6.
A: Perfect.`,
          },
          {
            id: "when-not",
            title: "Kiedy NIE używać Future Perfect",
            content: `Gdy chcesz opisać "w trakcie" do momentu → Future Perfect Continuous.

Gdy nie ma "deadline / by …" i nie liczy się ukończenie → Future Simple/Continuous.

Zobacz też: Future Perfect Continuous.`,
          },
          {
            id: "comparison",
            title: "Porównaj: Future Simple vs Future Perfect",
            content: `Future Simple: coś się stanie w przyszłości

Future Perfect: coś będzie ukończone przed momentem

Przykłady:

I will finish the report tomorrow.

I will have finished the report by 3 p.m.`,
          },
          {
            id: "common-mistakes",
            title: "Najczęstsze błędy",
            content: `❌ I will have finish. → ✅ I will have finished.

❌ By tomorrow I will finished. → ✅ By tomorrow I will have finished.

❌ Will you have to done… → ✅ Will you have done…?`,
          },
        ],
        chips: [
          { text: "by tomorrow", description: "do jutra" },
          { text: "by next week", description: "do przyszłego tygodnia" },
          { text: "by the time", description: "do czasu gdy" },
          { text: "before", description: "przed" },
        ],
        relatedLinks: [
          { slug: "future-perfect-continuous", title: "Future Perfect Continuous", description: "Proces do momentu" },
        ],
        comparisons: [
          {
            tense1: "future-simple",
            tense2: "future-perfect-simple",
            title: "Future Simple vs Future Perfect",
            description: "Wydarzenie vs ukończenie",
          },
        ],
      },
      practiceLink: "/app/vocab",
      courseLink: "#",
    },

    // J) FUTURE PERFECT CONTINUOUS
    {
      slug: "future-perfect-continuous",
      title: "Future Perfect Continuous",
      description: "Czas przyszły dokonany ciągły",
      content: {
        sections: [
          {
            id: "usage",
            title: "Po co używamy Future Perfect Continuous",
            content: `Future Perfect Continuous podkreśla jak długo coś będzie trwało do konkretnego momentu w przyszłości:

"Do piątku będę się uczył już od 3 tygodni."

Ważny jest proces i czas trwania, a nie tylko wynik.

Dobre do mówienia o wysiłku, długich działaniach, projektach.

Pytanie kontrolne: Czy kluczowe jest "jak długo" do przyszłego momentu?
Jeśli tak → Future Perfect Continuous.`,
          },
          {
            id: "characteristic-words",
            title: "Charakterystyczne słowa i zwroty",
            content: `for + okres (for two hours, for three years)

by + moment (by next month)

by the time…

all day (do przyszłego momentu)`,
          },
          {
            id: "structure",
            title: "Struktura i odmiana",
            content: `Twierdzenie

will have been + verb-ing

I will have been studying

she will have been working

they will have been living

Przeczenie

won't have been + verb-ing

I won't have been waiting long.

Pytanie

Will + subject + have been + verb-ing?

Will you have been working here for a year by June?`,
          },
          {
            id: "examples",
            title: "Przykłady zdań",
            content: `By next month, I will have been learning English for six months.

By 5 p.m., she will have been working for eight hours.

They won't have been traveling long by then.`,
          },
          {
            id: "dialog",
            title: "Dialog w praktyce",
            content: `A: You'll be ready by Friday, right?
B: Yes. By Friday I will have been working on this project for two weeks.
A: Wow. Will you have been sleeping at all?
B: Not much. I will have been preparing presentations every evening.
A: That sounds intense.`,
          },
          {
            id: "when-not",
            title: "Kiedy NIE używać Future Perfect Continuous",
            content: `Gdy ważny jest rezultat "ukończone do…" → Future Perfect Simple.

Gdy mówisz po prostu o tym, co będziesz robić w przyszłości → Future Simple/Continuous.

Zobacz też: Future Perfect Simple.`,
          },
          {
            id: "comparison",
            title: "Porównaj: Future Perfect vs Future Perfect Continuous",
            content: `Future Perfect: ukończenie / rezultat do momentu

Future Perfect Continuous: proces / czas trwania do momentu

Przykłady:

By 6, I will have written the report. (rezultat)

By 6, I will have been writing the report for three hours. (czas trwania)`,
          },
          {
            id: "common-mistakes",
            title: "Najczęstsze błędy",
            content: `❌ I will have been study. → ✅ I will have been studying.

❌ She will has been working. → ✅ She will have been working.

❌ By Friday I will be working for two weeks. → ✅ By Friday I will have been working for two weeks.`,
          },
        ],
        chips: [
          { text: "for", description: "przez" },
          { text: "by", description: "do" },
          { text: "by the time", description: "do czasu gdy" },
          { text: "all day", description: "cały dzień" },
        ],
        relatedLinks: [
          { slug: "future-perfect-simple", title: "Future Perfect Simple", description: "Ukończenie do momentu" },
        ],
        comparisons: [
          {
            tense1: "future-perfect-simple",
            tense2: "future-perfect-continuous",
            title: "Future Perfect vs Future Perfect Continuous",
            description: "Rezultat vs proces",
          },
        ],
      },
      practiceLink: "/app/vocab",
      courseLink: "#",
    },
  ],
};

/**
 * Get grammar tense by slug
 */
export function getGrammarTenseBySlug(slug: GrammarTenseSlug) {
  return grammarContent.tenses.find((t) => t.slug === slug);
}

/**
 * Get all grammar tenses
 */
export function getAllGrammarTenses() {
  return grammarContent.tenses;
}

/**
 * Get available comparisons for a tense
 */
export function getComparisonsForTense(slug: GrammarTenseSlug) {
  const tense = getGrammarTenseBySlug(slug);
  return tense?.content.comparisons || [];
}
