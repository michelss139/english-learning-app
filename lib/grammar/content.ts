/**
 * Grammar content - static data for grammar tenses
 * 
 * NEW STRUCTURE: Identical section structure for all tenses
 * All content is authored and transferred 1:1 from provided materials.
 */

import { GrammarContent, GrammarTenseSlug } from "./types";

// Helper to create structure text
function createStructure(affirmative: string, negative: string, question: string): {
  affirmative: string;
  negative: string;
  question: string;
} {
  return { affirmative, negative, question };
}

export const grammarContent: GrammarContent = {
  tenses: [
    // A) PRESENT SIMPLE
    {
      slug: "present-simple",
      title: "Present Simple",
      description: "Podstawowy czas teraźniejszy",
      content: {
        usage: `Present Simple to czas, którego używasz, gdy mówisz o rzeczach stałych albo powtarzalnych:

Rutyny i nawyki: co robisz zwykle, regularnie.

Ogólne prawdy i fakty: rzeczy prawdziwe „z zasady".

Stany i preferencje: like, know, believe, want (często).

Rozkłady i harmonogramy: pociągi, zajęcia, loty (nawet gdy dotyczą przyszłości).

Pytanie kontrolne: Czy to jest „zwykle / zawsze / ogólnie", a nie „teraz w tej chwili"?
Jeśli tak → Present Simple.`,
        characteristicWords: `often, usually, always, sometimes, never

every day / week / month

on Mondays, at weekends

Wskazówka: te słowa często stoją przed głównym czasownikiem, ale po "to be".`,
        structure: createStructure(
          `I/you/we/they + base form

he/she/it + base form + s/es

Przykłady:

I work in Warsaw.

She works in Warsaw.`,
          `I/you/we/they do not (don't) + base form

he/she/it does not (doesn't) + base form

Przykłady:

I don't eat meat.

He doesn't eat meat.`,
          `Do + I/you/we/they + base form?

Does + he/she/it + base form?

Przykłady:

Do you work here?

Does she work here?`
        ),
        auxiliary: `Słówko pomocnicze (auxiliary): do/does

"do/does" wchodzi w pytania i przeczenia. Główny czasownik wraca do base form.

Najczęstsza pułapka:

❌ Does she works?

✅ Does she work?

Końcówka -s / -es / -ies (3. osoba)

Zwykle: work → works

-es: watch → watches, go → goes, fix → fixes

spółgłoska + y: study → studies

samogłoska + y: play → plays`,
        confusionWarnings: `"now" → często NIE Present Simple, tylko Present Continuous

"every day" → prawie zawsze Present Simple

"I'm loving it" → wyjątek marketingowy, normalnie "love" = stative

"today" → rutyna w obrębie dnia = PS, akcja teraz = PC`,
        commonMistakes: `Does she works? → Does she work?

He go to school. → He goes to school.

I am go to work. → I go to work.`,
        examples: `I drink coffee every morning.

She studies English on Mondays.

The shop opens at 9 a.m.`,
        dialog: `Mia: What do you do after work?
Tom: I go to the gym twice a week.
Mia: And your sister?
Tom: She works from home and teaches online.
Mia: Do you cook at home?
Tom: Yes, I cook almost every day.`,
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
      practiceLink: "/app/exercises/present-simple",
      courseLink: "/app/courses/present-simple",
    },

    // B) PRESENT CONTINUOUS
    {
      slug: "present-continuous",
      title: "Present Continuous",
      description: "Czas teraźniejszy ciągły",
      content: {
        usage: `Present Continuous opisuje co dzieje się teraz lub wokół teraz:

Akcja w trakcie: "w tej chwili".

Tymczasowość: sytuacje „na ten okres", nie na stałe.

Zmiany i trendy: coś się zmienia, rozwija.

Ustalone plany w przyszłości: gdy mamy zaplanowane spotkanie/podróż.

Pytanie kontrolne: Czy to jest "w trakcie", "w tym okresie" albo "umówione"?
Jeśli tak → Present Continuous.`,
        characteristicWords: `now, right now, at the moment

today, this week, these days

currently

Look! / Listen!`,
        structure: createStructure(
          `am/is/are + verb-ing

I am working

he/she/it is working

you/we/they are working`,
          `am not / isn't / aren't + verb-ing

I am not working

She isn't working

They aren't working`,
          `Am/Is/Are + subject + verb-ing?

Are you working now?

Is he studying?

Jak tworzymy -ing

Najczęstsze reguły:

work → working

take → taking (usuń "e")

run → running (podwójna spółgłoska: run → running)

lie → lying (ie → y)`
        ),
        auxiliary: `Słówko pomocnicze (auxiliary): am/is/are

"am/is/are" wchodzi w pytania i przeczenia. Główny czasownik w formie -ing.`,
        confusionWarnings: `"now", "at the moment" → prawie zawsze PC

czasowniki statyczne → nie w continuous

"today" bywa PS albo PC`,
        commonMistakes: `I'm go to school. → I'm going to school.

She is knowing him. → She knows him.

Are you work? → Are you working?`,
        examples: `I am reading a new book right now.

She is learning English these days.

They are meeting the teacher tomorrow.`,
        dialog: `A: Hi! Can you talk?
B: Not now. I am cooking dinner.
A: What are you making?
B: I am making pasta.
A: Nice. We are coming to your place tomorrow, right?
B: Yes, we are meeting at 6.`,
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
      practiceLink: "/app/exercises/present-continuous",
      courseLink: "/app/courses/present-continuous",
    },

    // C) PAST SIMPLE
    {
      slug: "past-simple",
      title: "Past Simple",
      description: "Czas przeszły prosty",
      content: {
        usage: `Past Simple opisuje zakończone wydarzenia w przeszłości:

Jednorazowe zdarzenie w konkretnym momencie w przeszłości.

Sekwencję wydarzeń w opowiadaniu.

Dawne nawyki (często z "used to", albo same Past Simple w kontekście).

Pytanie kontrolne: Czy to jest „skończone" i ma wyraźny czas/przeszłość?
Jeśli tak → Past Simple.`,
        characteristicWords: `yesterday, last week/month/year

two days ago, in 2019, when I was a child

then, after that`,
        structure: createStructure(
          `regular: verb + -ed (work → worked)

irregular: 2. forma (go → went)

Przykłady:

I visited my friend yesterday.

She went to London last year.`,
          `did not (didn't) + base form

I didn't go there.

He didn't watch TV.`,
          `Did + subject + base form?

Did you see him?

Did she call you?

-ed: szybkie zasady wymowy (dla ucznia)

/t/: worked, watched

/d/: played, cleaned

/ɪd/: wanted, needed`
        ),
        auxiliary: `Słówko pomocnicze (auxiliary): did

"did" wchodzi w pytania i przeczenia. Główny czasownik wraca do base form (nie 2. forma!).`,
        confusionWarnings: `yesterday / last week / in 2020 → zawsze Past Simple

konkretny moment w przeszłości → PS

nie z "for/since"`,
        commonMistakes: `Did you went? → Did you go?

I have seen him yesterday. → I saw him yesterday.

He didn't went. → He didn't go.`,
        examples: `We watched a movie last night.

I bought a new laptop two weeks ago.

She didn't answer my message.`,
        dialog: `A: How was your weekend?
B: Great. I visited my grandparents.
A: Nice. What did you do there?
B: We cooked together and played cards.
A: Did you go anywhere else?
B: Yes, we went to the park on Sunday.`,
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
      practiceLink: "/app/exercises/past-simple",
      courseLink: "/app/courses/past-simple",
    },

    // D) PAST CONTINUOUS
    {
      slug: "past-continuous",
      title: "Past Continuous",
      description: "Czas przeszły ciągły",
      content: {
        usage: `Past Continuous opisuje akcję w trakcie w przeszłości:

Tło dla innego wydarzenia (które wchodzi Past Simple).

Akcja przerwana przez inne zdarzenie.

Dwie równoległe czynności w tym samym czasie w przeszłości.

Pytanie kontrolne: Czy coś „trwało", gdy coś innego się wydarzyło?
Jeśli tak → Past Continuous.`,
        characteristicWords: `while, when

at 7 p.m. yesterday, at that moment

all day, all evening (w opisie)`,
        structure: createStructure(
          `was/were + verb-ing

I/he/she/it was working

you/we/they were working`,
          `wasn't/weren't + verb-ing

She wasn't sleeping

They weren't listening`,
          `Was/Were + subject + verb-ing?

Were you studying at 9?

Was he driving?`
        ),
        auxiliary: `Słówko pomocnicze (auxiliary): was/were

"was/were" wchodzi w pytania i przeczenia. Główny czasownik w formie -ing.`,
        confusionWarnings: `tło historii → PC

długa akcja + krótka → PC + PS

nie do jednorazowych faktów`,
        commonMistakes: `I was work. → I was working.

When she came, I watched TV. → I was watching TV.

Were you worked? → Were you working?`,
        examples: `I was studying when you called.

They were playing football at 5 p.m.

While she was cooking, he was setting the table.`,
        dialog: `A: Why didn't you answer the phone?
B: Sorry, I was driving.
A: What were you doing at 8?
B: I was meeting a client.
A: And what happened then?
B: While I was talking, my phone rang.

(Zwróć uwagę: tło = was talking, zdarzenie punktowe = rang)`,
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
      practiceLink: "/app/exercises/past-continuous",
      courseLink: "/app/courses/past-continuous",
    },

    // E) PAST PERFECT
    {
      slug: "past-perfect",
      title: "Past Perfect",
      description: "Czas przeszły zaprzeszły",
      content: {
        usage: `Past Perfect opisuje czynność wcześniejszą niż inne wydarzenie w przeszłości. Używamy go, aby uporządkować chronologię historii i pokazać "co stało się najpierw".`,
        characteristicWords: `before, after, by the time, already (w przeszłości)`,
        structure: createStructure(
          `had + past participle

I had finished.
She had left.
They had gone.`,
          `had not (hadn't) + past participle`,
          `Had + subject + past participle?`
        ),
        auxiliary: `Słówko pomocnicze (auxiliary): had`,
        confusionWarnings: `Past Perfect pokazuje wcześniejszy moment względem innego wydarzenia, a nie po prostu "dawno".`,
        commonMistakes: `When I arrived, she left. -> When I arrived, she had left.
She had went home. -> She had gone home.`,
        examples: `She had finished before he arrived.
I had eaten before I went out.`,
        dialog: `A: Why was she so calm?
B: She had prepared everything before the meeting started.`,
        chips: [
          { text: "before", description: "przed" },
          { text: "after", description: "po" },
          { text: "by the time", description: "do czasu gdy" },
        ],
        relatedLinks: [
          { slug: "past-simple", title: "Past Simple", description: "Zdarzenie punktowe w przeszłości" },
        ],
        comparisons: [
          {
            tense1: "past-perfect",
            tense2: "past-simple",
            title: "Past Perfect vs Past Simple",
            description: "Wcześniej vs później w przeszłości",
          },
        ],
      },
      practiceLink: "/app/exercises/past-perfect",
      courseLink: "/app/courses/past-perfect",
    },

    // F) PAST PERFECT CONTINUOUS
    {
      slug: "past-perfect-continuous",
      title: "Past Perfect Continuous",
      description: "Czas przeszły zaprzeszły ciągły",
      content: {
        usage: `Past Perfect Continuous podkreśla proces i długość trwania czynności przed innym wydarzeniem w przeszłości.`,
        characteristicWords: `for, since, before, by the time`,
        structure: createStructure(
          `had been + verb-ing

I had been working.
She had been studying.
They had been waiting.`,
          `had not (hadn't) been + verb-ing`,
          `Had + subject + been + verb-ing?`
        ),
        auxiliary: `Słówko pomocnicze (auxiliary): had been`,
        confusionWarnings: `Perfect = efekt, Perfect Continuous = trwanie procesu przed innym wydarzeniem.`,
        commonMistakes: `She had been work all day. -> She had been working all day.
She had working before I arrived. -> She had been working before I arrived.`,
        examples: `She was tired because she had been working all day.
We had been talking for hours before the meeting ended.`,
        dialog: `A: Why were they exhausted?
B: They had been training for hours before the match.`,
        chips: [
          { text: "for", description: "przez" },
          { text: "since", description: "od" },
          { text: "before", description: "przed" },
          { text: "by the time", description: "do czasu gdy" },
        ],
        relatedLinks: [
          { slug: "past-perfect", title: "Past Perfect", description: "Wcześniejsze wydarzenie" },
        ],
        comparisons: [
          {
            tense1: "past-perfect-continuous",
            tense2: "past-perfect",
            title: "Past Perfect Continuous vs Past Perfect",
            description: "Proces vs efekt",
          },
        ],
      },
      practiceLink: "/app/exercises/past-perfect-continuous",
      courseLink: "/app/courses/past-perfect-continuous",
    },

    // G) PRESENT PERFECT
    {
      slug: "present-perfect",
      title: "Present Perfect",
      description: "Czas teraźniejszy dokonany",
      content: {
        usage: `Present Perfect łączy przeszłość z teraźniejszością. Używasz go, gdy:

mówisz o doświadczeniu („kiedykolwiek" w życiu),

mówisz o wyniku teraz (coś się stało i ma efekt),

mówisz o okresie od przeszłości do teraz (since/for),

mówisz o wydarzeniach w "niezamkniętym czasie" (today, this week).

Pytanie kontrolne: Czy ważne jest „do teraz", a nie konkretny moment w przeszłości?
Jeśli tak → Present Perfect.`,
        characteristicWords: `ever, never

already, yet, just

since, for

this week, today (jeśli okres trwa)`,
        structure: createStructure(
          `have/has + past participle (3. forma)

I/you/we/they have worked

he/she/it has worked`,
          `haven't/hasn't + past participle

I haven't seen it.

She hasn't finished.`,
          `Have/Has + subject + past participle?

Have you ever been to Italy?

Has he done it?`
        ),
        auxiliary: `Słówko pomocnicze (auxiliary): have/has

"have/has" wchodzi w pytania i przeczenia. Główny czasownik w 3. formie (past participle).`,
        confusionWarnings: `ever, never, already, just → często PP

yesterday, last year → NIGDY PP

this week → tylko jeśli jeszcze trwa`,
        commonMistakes: `I have been in London last year. → I was in London last year.

She has went. → She has gone.

Did you have seen? → Have you seen?`,
        examples: `I have just finished my homework.

She has lived here since 2020.

We haven't seen that movie yet.`,
        dialog: `A: Do you want coffee?
B: Not now. I have already had two cups.
A: Oh. Have you finished the report yet?
B: Yes, I have sent it to you.
A: Great. I haven't checked my inbox yet.`,
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
      practiceLink: "/app/exercises/present-perfect",
      courseLink: "/app/courses/present-perfect",
    },

    // H) PRESENT PERFECT CONTINUOUS
    {
      slug: "present-perfect-continuous",
      title: "Present Perfect Continuous",
      description: "Czas teraźniejszy dokonany ciągły",
      content: {
        usage: `Ten czas podkreśla proces trwający do teraz albo skutek widoczny teraz, gdy ważne jest „jak długo / jak intensywnie".

Używasz go, gdy:

coś zaczęło się w przeszłości i trwa do teraz (process),

widzisz efekt teraz i chcesz podkreślić czynność (np. zmęczenie),

chcesz powiedzieć "robię to od jakiegoś czasu".

Pytanie kontrolne: Czy ważniejsze jest "jak długo / w trakcie", a nie sam fakt ukończenia?
Jeśli tak → Present Perfect Continuous.`,
        characteristicWords: `for, since

all day, recently, lately

How long…?`,
        structure: createStructure(
          `have/has been + verb-ing

I/you/we/they have been studying

he/she/it has been studying`,
          `haven't/hasn't been + verb-ing

I haven't been sleeping well.

She hasn't been working lately.`,
          `Have/Has + subject + been + verb-ing?

Have you been waiting long?

Has he been practicing?`
        ),
        auxiliary: `Słówko pomocnicze (auxiliary): have/has been

"have/has been" wchodzi w pytania i przeczenia. Główny czasownik w formie -ing.`,
        confusionWarnings: `for/since + nacisk na czas → PPC

rezultat → PP, proces → PPC

nie z stative`,
        commonMistakes: `I have been study. → I have been studying.

She has been knowing him. → She knows him.

Have you been worked? → Have you been working?`,
        examples: `I have been learning English for two months.

She has been working here since April.

They have been arguing all day.`,
        dialog: `A: You look tired.
B: I am. I have been working all day.
A: Have you been studying too?
B: Yes, I have been preparing for an exam.
A: No wonder you're exhausted.`,
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
      practiceLink: "/app/exercises/present-perfect-continuous",
      courseLink: "/app/courses/present-perfect-continuous",
    },

    // I) FUTURE SIMPLE
    {
      slug: "future-simple",
      title: "Future Simple",
      description: "Czas przyszły prosty",
      content: {
        usage: `Future Simple (z will) używamy, gdy mówimy o przyszłości w sposób "neutralny", często spontaniczny:

Spontaniczne decyzje podejmowane w chwili mówienia.

Obietnice / oferowanie pomocy.

Przewidywania (opinie, przypuszczenia) bez konkretnego planu.

Fakty o przyszłości, gdy nie podkreślamy planowania.

Pytanie kontrolne: Czy to jest decyzja/obietnica/przewidywanie, a nie zaplanowane wydarzenie?
Jeśli tak → Future Simple.`,
        characteristicWords: `tomorrow, next week/month/year

soon, later

I think…, probably, maybe

in the future`,
        structure: createStructure(
          `will + base form

I will go

he/she/it will go

we/they will go`,
          `will not (won't) + base form

I won't forget

She won't come`,
          `Will + subject + base form?

Will you help me?

Will she call?

Słówko pomocnicze (auxiliary): will

"will" jest stałe dla wszystkich osób (nie ma odmiany jak do/does).
Główny czasownik zawsze zostaje w base form.`
        ),
        auxiliary: `Słówko pomocnicze (auxiliary): will

"will" jest stałe dla wszystkich osób. Główny czasownik zawsze w base form.`,
        confusionWarnings: `decyzja w chwili mówienia → FS

plan → raczej Present Continuous

przewidywania → FS`,
        commonMistakes: `He wills go. → He will go.

Will you to help? → Will you help?

I will can. → I will be able to.`,
        examples: `I will call you tonight.

She won't be late.

I think they will win.`,
        dialog: `A: I'm hungry.
B: I will make you a sandwich.
A: Thanks!
B: No problem. I will do it now.
A: Will you add some cheese?
B: Sure, I will.`,
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
      practiceLink: "/app/exercises/future-simple",
      courseLink: "/app/courses/future-simple",
    },

    // J) FUTURE CONTINUOUS
    {
      slug: "future-continuous",
      title: "Future Continuous",
      description: "Czas przyszły ciągły",
      content: {
        usage: `Future Continuous opisuje akcję w trakcie w przyszłości:

Coś będzie się działo o konkretnej godzinie w przyszłości.

Używane do uprzejmych pytań o plany (mniej "naciskające").

Czasem do "naturalnego tła" w przyszłości (jak Past Continuous, tylko future).

Pytanie kontrolne: Czy chodzi o to, że "będę w trakcie robienia" w danym momencie?
Jeśli tak → Future Continuous.`,
        characteristicWords: `this time tomorrow / next week

at 7 p.m. tomorrow

in an hour, later today (w znaczeniu "wtedy będę w trakcie")`,
        structure: createStructure(
          `will be + verb-ing

I will be working

she will be studying

they will be traveling`,
          `won't be + verb-ing

I won't be sleeping

He won't be using the car.`,
          `Will + subject + be + verb-ing?

Will you be waiting for me?

Will she be working tomorrow?`
        ),
        auxiliary: `Słówko pomocnicze (auxiliary): will be

"will be" wchodzi w pytania i przeczenia. Główny czasownik w formie -ing.`,
        confusionWarnings: `this time tomorrow → FC

nie do decyzji

nie do rezultatu`,
        commonMistakes: `I will working. → I will be working.

Will you be to wait? → Will you be waiting?

He will be work. → He will be working.`,
        examples: `This time tomorrow, I will be flying to London.

At 8 p.m., we will be having dinner.

She won't be staying long.`,
        dialog: `A: Can I call you at 6?
B: At 6 I will be driving.
A: Okay, what about 7?
B: At 7 I will be cooking dinner, but I can talk.
A: Great. Will you be using your laptop?
B: Yes, I will be working on it.`,
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
      practiceLink: "/app/exercises/future-continuous",
      courseLink: "/app/courses/future-continuous",
    },

    // K) FUTURE PERFECT SIMPLE
    {
      slug: "future-perfect-simple",
      title: "Future Perfect Simple",
      description: "Czas przyszły dokonany",
      content: {
        usage: `Future Perfect opisuje czynność, która zostanie ukończona przed konkretnym momentem w przyszłości:

"Do jutra/Do 5-tej/Do końca tygodnia" coś będzie już zrobione.

Podkreślamy rezultat i "deadline".

Często przy planowaniu pracy, projektów, nauki.

Pytanie kontrolne: Czy mówisz "będzie już zrobione do…"?
Jeśli tak → Future Perfect.`,
        characteristicWords: `by tomorrow / by next week

by the time…

before (w kontekście przyszłości)

in two hours (czasem w znaczeniu "za 2h będzie zrobione")`,
        structure: createStructure(
          `will have + past participle (3. forma)

I will have finished

she will have done

they will have arrived`,
          `won't have + past participle

I won't have finished by then.`,
          `Will + subject + have + past participle?

Will you have completed it by Friday?`
        ),
        auxiliary: `Słówko pomocnicze (auxiliary): will have

"will have" wchodzi w pytania i przeczenia. Główny czasownik w 3. formie (past participle).`,
        confusionWarnings: `by + deadline → FPS

jutro samo w sobie nie wymusza FPS

wynik → FPS, proces → FPC`,
        commonMistakes: `I will have finish. → I will have finished.

By tomorrow I will finished. → By tomorrow I will have finished.

Will you have to done? → Will you have done?`,
        examples: `By 6 p.m., I will have finished work.

She will have left before you arrive.

They won't have completed the project by Monday.`,
        dialog: `A: Can we meet at 5?
B: At 5 I'm not sure. By 6 I will have finished my meeting.
A: Okay. Will you have written the report by then?
B: Yes, I will have sent it before 6.
A: Perfect.`,
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
      practiceLink: "/app/exercises/future-perfect-simple",
      courseLink: "/app/courses/future-perfect-simple",
    },

    // L) FUTURE PERFECT CONTINUOUS
    {
      slug: "future-perfect-continuous",
      title: "Future Perfect Continuous",
      description: "Czas przyszły dokonany ciągły",
      content: {
        usage: `Future Perfect Continuous podkreśla jak długo coś będzie trwało do konkretnego momentu w przyszłości:

"Do piątku będę się uczył już od 3 tygodni."

Ważny jest proces i czas trwania, a nie tylko wynik.

Dobre do mówienia o wysiłku, długich działaniach, projektach.

Pytanie kontrolne: Czy kluczowe jest "jak długo" do przyszłego momentu?
Jeśli tak → Future Perfect Continuous.`,
        characteristicWords: `for + okres (for two hours, for three years)

by + moment (by next month)

by the time…

all day (do przyszłego momentu)`,
        structure: createStructure(
          `will have been + verb-ing

I will have been studying

she will have been working

they will have been living`,
          `won't have been + verb-ing

I won't have been waiting long.`,
          `Will + subject + have been + verb-ing?

Will you have been working here for a year by June?`
        ),
        auxiliary: `Słówko pomocnicze (auxiliary): will have been

"will have been" wchodzi w pytania i przeczenia. Główny czasownik w formie -ing.`,
        confusionWarnings: `for two hours by… → FPC

proces + czas → FPC

wynik → FPS`,
        commonMistakes: `I will have been study. → I will have been studying.

She will has been working. → She will have been working.

By Friday I will be working for two weeks. → By Friday I will have been working for two weeks.`,
        examples: `By next month, I will have been learning English for six months.

By 5 p.m., she will have been working for eight hours.

They won't have been traveling long by then.`,
        dialog: `A: You'll be ready by Friday, right?
B: Yes. By Friday I will have been working on this project for two weeks.
A: Wow. Will you have been sleeping at all?
B: Not much. I will have been preparing presentations every evening.
A: That sounds intense.`,
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
      practiceLink: "/app/exercises/future-perfect-continuous",
      courseLink: "/app/courses/future-perfect-continuous",
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
