// ─── Types ────────────────────────────────────────────────────────────────────

export type ModalStructure = {
  label: string;
  pattern: string;
  example: string;
};

export type ModalUseCase = {
  title: string;
  body: string;
  examples: string[];
  warning?: string;
};

export type ModalMistake =
  | { bad: string; good: string; note?: string }
  | { note: string };

export type ModalCompare = {
  title: string;
  description: string;
};

export type ModalWordData = {
  id: string;
  title: string;
  description: string;
  definition: string;
  definitionExamples: string[];
  structures: ModalStructure[];
  uses: ModalUseCase[];
  mistakes: ModalMistake[];
  compare: ModalCompare[];
};

// ─── Modal word data ─────────────────────────────────────────────────────────

export const modalWords: ModalWordData[] = [
  // ── can ──────────────────────────────────────────────────────────────────
  {
    id: "can",
    title: "can",
    description: "Umiejętności, pozwolenie i możliwość w teraźniejszości.",
    definition:
      "Can to jeden z najczęstszych modal verbs. Nie zmienia formy dla żadnej osoby — zawsze brzmi tak samo. Używamy go w trzech głównych znaczeniach: umiejętność, pozwolenie oraz możliwość. Znaczenie zależy od kontekstu.",
    definitionExamples: ["I can swim.", "Can I sit here?", "That can't be true!"],
    structures: [
      {
        label: "Twierdzenie (Affirmative)",
        pattern: "Subject + can + base verb",
        example: "She can speak French.",
      },
      {
        label: "Przeczenie (Negative)",
        pattern: "Subject + can't / cannot + base verb",
        example: "He can't drive a car.",
      },
      {
        label: "Pytanie (Question)",
        pattern: "Can + subject + base verb?",
        example: "Can you help me with this?",
      },
    ],
    uses: [
      {
        title: "Ability — umiejętność",
        body:
          "Najczęstsze znaczenie can to umiejętność — coś, co ktoś potrafi robić teraz, w teraźniejszości.",
        examples: [
          "I can swim.",
          "She can play the piano.",
          "He can speak three languages.",
          "Can you drive?",
        ],
      },
      {
        title: "Permission — pozwolenie",
        body:
          "Can może oznaczać prośbę o pozwolenie lub jego udzielenie. Brzmi mniej formalnie niż may. W codziennej rozmowie używamy can znacznie częściej niż may.",
        examples: [
          "Can I sit here?",
          "You can borrow my pen.",
          "Can I leave early today?",
          "You can go now.",
        ],
      },
      {
        title: "Possibility — możliwość (przeczenia i pytania)",
        body:
          "W przeczeniach can't wyraża niemożliwość — jesteśmy pewni, że coś nie jest możliwe. W pytaniach i zdaniach twierdzących can opisuje możliwość w sposób ogólny (np. co może się zdarzyć w danym miejscu).",
        examples: [
          "That can't be true!",
          "It can get very cold here in winter.",
          "Can this really be happening?",
          "She can't be at home — her car isn't there.",
        ],
        warning:
          "Can't w znaczeniu możliwości wyraża pewność co do niemożliwości. To różni się od might not, które oznacza jedynie niepewność.",
      },
    ],
    mistakes: [
      { bad: "I can to swim.", good: "I can swim.", note: "Po can nie używamy 'to'." },
      {
        bad: "She cans speak Spanish.",
        good: "She can speak Spanish.",
        note: "Can nie zmienia formy — nigdy nie dodajemy -s.",
      },
      {
        bad: "I can able to drive.",
        good: "I can drive. / I am able to drive.",
        note: "Nie łączymy can z able to — to dwie osobne konstrukcje.",
      },
    ],
    compare: [
      {
        title: "can vs could",
        description:
          "Can — teraźniejszość. Could — przeszłość lub grzeczniejsza/mniej pewna forma w teraźniejszości.",
      },
      {
        title: "can vs be able to",
        description:
          "Can — standardowa forma w teraźniejszości. Be able to — gdy potrzebujemy innego czasu (np. przyszłość: will be able to) lub gdy can nie pasuje gramatycznie.",
      },
      {
        title: "can vs may (pozwolenie)",
        description:
          "Can — nieformalna prośba o pozwolenie w codziennej rozmowie. May — bardziej formalne lub oficjalne pozwolenie.",
      },
    ],
  },

  // ── could ─────────────────────────────────────────────────────────────────
  {
    id: "could",
    title: "could",
    description: "Umiejętność w przeszłości, grzeczne prośby i możliwość.",
    definition:
      "Could to przeszła forma can, ale ma kilka różnych zastosowań. Opisuje ogólne umiejętności z przeszłości, wyraża możliwość oraz służy do grzecznych próśb. Brzmi subtelniej i mniej stanowczo niż can.",
    definitionExamples: [
      "I could swim when I was five.",
      "Could you help me, please?",
      "It could rain later.",
    ],
    structures: [
      {
        label: "Twierdzenie (Affirmative)",
        pattern: "Subject + could + base verb",
        example: "She could dance very well.",
      },
      {
        label: "Przeczenie (Negative)",
        pattern: "Subject + couldn't (could not) + base verb",
        example: "I couldn't open the door.",
      },
      {
        label: "Pytanie (Question)",
        pattern: "Could + subject + base verb?",
        example: "Could you repeat that, please?",
      },
    ],
    uses: [
      {
        title: "Past ability — ogólna umiejętność w przeszłości",
        body:
          "Could opisuje coś, co ktoś potrafił robić w przeszłości — ogólną zdolność, którą posiadał przez pewien czas, nie jednorazowy sukces.",
        examples: [
          "I could swim when I was five.",
          "She could play the violin as a teenager.",
          "When I was young, I could run very fast.",
        ],
        warning:
          "Gdy mówimy o konkretnym jednorazowym sukcesie w przeszłości (nie ogólnej umiejętności), używamy was/were able to, nie could. Np.: Yesterday I was able to finish the report. — NIE: Yesterday I could finish the report.",
      },
      {
        title: "Polite requests — grzeczne prośby",
        body:
          "Could jest grzeczniejszą, bardziej dyplomatyczną wersją can w prośbach. Brzmi mniej bezpośrednio i formalniej.",
        examples: [
          "Could you help me, please?",
          "Could you pass the salt?",
          "Could I have a glass of water?",
        ],
      },
      {
        title: "Possibility — możliwość",
        body:
          "Could wyraża możliwość — coś, co mogłoby się zdarzyć. Często oznacza jedną z kilku możliwych opcji.",
        examples: [
          "It could rain later.",
          "She could be at home.",
          "That could be the answer.",
          "This could be a good idea.",
        ],
      },
    ],
    mistakes: [
      {
        bad: "Yesterday I could finish the report.",
        good: "Yesterday I was able to finish the report.",
        note:
          "Could opisuje ogólną zdolność, nie jednorazowy sukces. Dla konkretnego sukcesu w przeszłości używamy was/were able to.",
      },
      {
        bad: "I couldn't to open the door.",
        good: "I couldn't open the door.",
        note: "Po could nie używamy 'to'.",
      },
      {
        bad: "She could spoke French.",
        good: "She could speak French.",
        note: "Po could zawsze używamy bezokolicznika (base verb), nie formy -ed.",
      },
    ],
    compare: [
      {
        title: "could vs can",
        description:
          "Can — teraźniejszość lub prośba nieformalna. Could — przeszłość, bardziej grzeczna prośba lub niepewna możliwość.",
      },
      {
        title: "could vs was able to (przeszłość)",
        description:
          "Could — ogólna umiejętność, którą ktoś posiadał. Was/were able to — konkretny sukces w pojedynczej sytuacji.",
      },
      {
        title: "could vs might (możliwość)",
        description:
          "Oba wyrażają możliwość w teraźniejszości lub przyszłości i w tym znaczeniu są często wymienne. Might może brzmieć trochę mniej pewnie.",
      },
    ],
  },

  // ── may ──────────────────────────────────────────────────────────────────
  {
    id: "may",
    title: "may",
    description: "Możliwość i formalne pozwolenie.",
    definition:
      "May używamy, gdy coś jest możliwe, ale nie jesteśmy pewni. Może też wyrażać formalne pozwolenie. W obu znaczeniach brzmi nieco bardziej oficjalnie niż can czy might.",
    definitionExamples: ["It may rain later.", "You may leave the room.", "She may not come."],
    structures: [
      {
        label: "Twierdzenie (Affirmative)",
        pattern: "Subject + may + base verb",
        example: "It may rain tomorrow.",
      },
      {
        label: "Przeczenie (Negative)",
        pattern: "Subject + may not + base verb",
        example: "She may not be at home.",
      },
      {
        label: "Pytanie (Question — rzadkie, formalne)",
        pattern: "May + subject + base verb?",
        example: "May I ask a question?",
      },
    ],
    uses: [
      {
        title: "Possibility — możliwość",
        body:
          "May wyraża możliwość — coś, co może się zdarzyć, ale nie wiemy na pewno. W tym znaczeniu może być używane zamiennie z might, choć might bywa trochę mniej pewne.",
        examples: [
          "It may rain later.",
          "She may come to the party.",
          "He may not know about the meeting.",
          "We may be late.",
        ],
      },
      {
        title: "Permission — formalne pozwolenie",
        body:
          "May w znaczeniu pozwolenia brzmi bardziej oficjalnie i formalnie niż can. Pojawia się w oficjalnych komunikatach, pismach i sytuacjach formalnych.",
        examples: [
          "You may leave the room.",
          "May I come in?",
          "You may proceed.",
          "Passengers may board at gate 12.",
        ],
        warning:
          "W tym znaczeniu (pozwolenie) might nie działa. Mówi się May I...? nie Might I...? gdy prosimy o pozwolenie.",
      },
    ],
    mistakes: [
      {
        bad: "Maybe rain later.",
        good: "It may rain later.",
        note: "Maybe to przysłówek (maybe = perhaps). May to modal verb — zawsze po nim następuje czasownik.",
      },
      {
        bad: "He may can come later.",
        good: "He may come later.",
        note: "Dwa modal verbs nie mogą stać obok siebie.",
      },
      {
        bad: "It may rains tomorrow.",
        good: "It may rain tomorrow.",
        note: "Po may zawsze bezokolicznik bez -s.",
      },
    ],
    compare: [
      {
        title: "may vs might",
        description:
          "Oba wyrażają możliwość. Might często brzmi trochę mniej pewnie. W codziennym języku używa się ich zamiennie.",
      },
      {
        title: "may vs can (pozwolenie)",
        description:
          "Can — nieformalne, codzienne pozwolenie. May — formalne lub oficjalne pozwolenie.",
      },
      {
        title: "maybe vs may",
        description:
          "Maybe to przysłówek (słowo). May to modal verb. Maybe I'll go. / I may go. — oba zdania są poprawne, ale działają inaczej gramatycznie.",
      },
    ],
  },

  // ── might ─────────────────────────────────────────────────────────────────
  {
    id: "might",
    title: "might",
    description: "Możliwość i bardziej niepewne przypuszczenia.",
    definition:
      "Might to przeszła forma may, ale w praktyce używamy go przede wszystkim do wyrażania możliwości w teraźniejszości i przyszłości. Wyraża mniejszą pewność niż may, ale w codziennym języku różnica jest zwykle minimalna.",
    definitionExamples: [
      "I might go to the party.",
      "She might not be at home.",
      "You might want to check this.",
    ],
    structures: [
      {
        label: "Twierdzenie (Affirmative)",
        pattern: "Subject + might + base verb",
        example: "I might be late today.",
      },
      {
        label: "Przeczenie (Negative)",
        pattern: "Subject + might not + base verb",
        example: "She might not come to the meeting.",
      },
      {
        label: "Pytanie (Question — rzadkie)",
        pattern: "Might + subject + base verb?",
        example: "Might this be the answer?",
      },
    ],
    uses: [
      {
        title: "Possibility — możliwość",
        body:
          "Might wyraża możliwość — coś, co może, ale nie musi się wydarzyć. Jest trochę mniej pewne niż may, ale w praktyce oba słowa działają niemal identycznie.",
        examples: [
          "I might go to the party.",
          "It might rain tomorrow.",
          "She might be at home.",
          "We might be late — there's a lot of traffic.",
        ],
      },
      {
        title: "Polite suggestions — grzeczne sugestie",
        body:
          "Might pojawia się w miękkich sugestiach i rekomendacjach, gdy chcemy powiedzieć coś taktownie, bez narzucania.",
        examples: [
          "You might want to check this again.",
          "You might try talking to her.",
          "It might be a good idea to leave early.",
        ],
      },
      {
        title: "Might have — przeszłość",
        body:
          "Might have + past participle używamy do mówienia o tym, co mogło się wydarzyć w przeszłości, ale nie wiemy na pewno.",
        examples: [
          "She might have forgotten about the meeting.",
          "He might have missed the train.",
          "They might have already left.",
        ],
      },
    ],
    mistakes: [
      {
        bad: "He might can come later.",
        good: "He might come later.",
        note: "Modal verbs nie łączą się ze sobą bezpośrednio.",
      },
      {
        bad: "It might rains tomorrow.",
        good: "It might rain tomorrow.",
        note: "Po might zawsze bezokolicznik bez -s.",
      },
      {
        bad: "She mights be at home.",
        good: "She might be at home.",
        note: "Might nie zmienia formy — nigdy nie dodajemy -s.",
      },
    ],
    compare: [
      {
        title: "might vs may",
        description:
          "W znaczeniu możliwości oba słowa są bardzo podobne. Might bywa trochę mniej pewne. W codziennym języku można ich używać zamiennie.",
      },
      {
        title: "might vs could (możliwość)",
        description:
          "Oba wyrażają możliwość. Might często dotyczy przyszłości lub teraźniejszości, could bywa używane szerzej.",
      },
      {
        title: "might have vs must have (przeszłość)",
        description:
          "Might have — to możliwe, że coś się wydarzyło. Must have — jestem prawie pewien, że coś się wydarzyło.",
      },
    ],
  },

  // ── must ──────────────────────────────────────────────────────────────────
  {
    id: "must",
    title: "must",
    description: "Obowiązek oraz silne przypuszczenie w jednym modalu.",
    definition:
      "Must to modal verb, który ma dwa główne znaczenia: obligation (obowiązek lub nakaz) oraz logical deduction (silne przypuszczenie, niemal pewność). Znaczenie zależy od kontekstu zdania.",
    definitionExamples: ["You must wear a helmet.", "She must be tired.", "He mustn't park here."],
    structures: [
      {
        label: "Twierdzenie (Affirmative)",
        pattern: "Subject + must + base verb",
        example: "You must finish this today.",
      },
      {
        label: "Przeczenie (Negative)",
        pattern: "Subject + must not (mustn't) + base verb",
        example: "You mustn't park here.",
      },
      {
        label: "Pytanie (Question — rzadkie)",
        pattern: "Must + subject + base verb?",
        example: "Must you leave so early?",
      },
    ],
    uses: [
      {
        title: "Obligation — obowiązek i nakaz",
        body:
          "Must wyraża silny obowiązek — coś, co jest konieczne, wymagane lub nakazane. Często pojawia się w przepisach, regulaminach i instrukcjach.",
        examples: [
          "You must wear a helmet.",
          "Passengers must fasten their seatbelts.",
          "Employees must wear a uniform.",
          "I must finish this report today.",
        ],
      },
      {
        title: "Logical deduction — silne przypuszczenie",
        body:
          "Must może oznaczać, że jesteśmy niemal pewni czegoś na podstawie dostępnych dowodów. To logiczny wniosek, nie obowiązek.",
        examples: [
          "She must be tired — she worked all day.",
          "He must be at home.",
          "They must be joking.",
          "You've been studying for hours. You must be hungry.",
        ],
      },
      {
        title: "Must have — dedukcja w przeszłości",
        body:
          "Must have + past participle używamy, gdy jesteśmy niemal pewni, że coś się wydarzyło w przeszłości.",
        examples: [
          "He must have forgotten.",
          "She must have left already.",
          "They must have arrived by now.",
        ],
      },
    ],
    mistakes: [
      { bad: "He musts go now.", good: "He must go now.", note: "Must nie zmienia formy — bez -s." },
      { bad: "She must to leave.", good: "She must leave.", note: "Po must nie używamy 'to'." },
      {
        bad: "You don't must do it.",
        good: "You don't have to do it.",
        note: "Przeczenie od have to (brak obowiązku) to don't have to — nie must not.",
      },
      {
        note: "mustn't ≠ don't have to: mustn't = zakaz (nie wolno), don't have to = brak konieczności (nie musisz, ale możesz).",
      },
    ],
    compare: [
      {
        title: "must vs have to",
        description:
          "Oba wyrażają obowiązek. Must brzmi bardziej stanowczo lub osobisto. Have to jest neutralniejsze i bardziej potoczne. Must nie ma formy w przeszłości — zamiast tego używamy had to.",
      },
      {
        title: "must vs should",
        description:
          "Must — silny obowiązek lub niemal pewność. Should — rada lub sugestia, słabszy obowiązek.",
      },
      {
        title: "must vs might (dedukcja)",
        description:
          "Must — jestem niemal pewien. Might — to możliwe, ale nie jestem pewien.",
      },
    ],
  },

  // ── should ────────────────────────────────────────────────────────────────
  {
    id: "should",
    title: "should",
    description: "Rady, sugestie i oczekiwania.",
    definition:
      "Should to najczęstszy sposób dawania rad i sugestii po angielsku. Używamy go, gdy coś jest dobrym pomysłem, rozsądne lub zalecane. Should może też wyrażać oczekiwania — coś, co powinno się wydarzyć.",
    definitionExamples: [
      "You should see a doctor.",
      "She should be here by now.",
      "You shouldn't ignore this.",
    ],
    structures: [
      {
        label: "Twierdzenie (Affirmative)",
        pattern: "Subject + should + base verb",
        example: "You should get some rest.",
      },
      {
        label: "Przeczenie (Negative)",
        pattern: "Subject + shouldn't (should not) + base verb",
        example: "You shouldn't stay up so late.",
      },
      {
        label: "Pytanie (Question)",
        pattern: "Should + subject + base verb?",
        example: "Should I call her now?",
      },
    ],
    uses: [
      {
        title: "Advice — rada i sugestia",
        body:
          "Najczęstsze użycie should to dawanie rady lub sugestii. Mówimy, że coś jest dobrym pomysłem lub rozsądnym działaniem.",
        examples: [
          "You should talk to your manager.",
          "He should apologise.",
          "You should try the restaurant on the corner.",
          "She should get more sleep.",
        ],
      },
      {
        title: "Expectation — oczekiwanie",
        body:
          "Should może też wyrażać, że czegoś oczekujemy — coś, co powinno być lub się wydarzyć zgodnie z naszymi założeniami.",
        examples: [
          "She should be here by now.",
          "The package should arrive tomorrow.",
          "This shouldn't take long.",
          "Everything should be ready.",
        ],
      },
      {
        title: "Should have — krytyka przeszłości",
        body:
          "Should have + past participle używamy, gdy coś powinno było się wydarzyć, ale się nie wydarzyło. Często wyraża żal lub krytykę.",
        examples: [
          "I should have called her earlier.",
          "You shouldn't have said that.",
          "We should have left earlier.",
        ],
      },
    ],
    mistakes: [
      {
        bad: "He should to go.",
        good: "He should go.",
        note: "Po should nie używamy 'to'.",
      },
      {
        bad: "She should goes there.",
        good: "She should go there.",
        note: "Po should zawsze bezokolicznik bez -s.",
      },
      {
        bad: "You should to have called.",
        good: "You should have called.",
        note: "Should have — bez 'to'.",
      },
    ],
    compare: [
      {
        title: "should vs must",
        description:
          "Should — rada lub sugestia, słabszy obowiązek. Must — silny nakaz lub niemal pewna dedukcja.",
      },
      {
        title: "should vs ought to",
        description:
          "Should i ought to mają bardzo podobne znaczenie. Should jest częstsze i bardziej naturalne w codziennym języku. Ought to brzmi trochę bardziej formalnie lub moralnie.",
      },
      {
        title: "should vs had better",
        description:
          "Should — neutralna rada. Had better — rada z ostrzeżeniem o konsekwencjach, brzmi mocniej.",
      },
    ],
  },

  // ── have to ──────────────────────────────────────────────────────────────
  {
    id: "have-to",
    title: "have to",
    description: "Zewnętrzny obowiązek wynikający z sytuacji lub reguł.",
    definition:
      "Have to wyraża obowiązek, który wynika z zewnętrznych okoliczności — reguł, sytuacji lub wymagań. W odróżnieniu od must brzmi bardziej neutralnie i naturalnie w codziennej rozmowie. Ma formy dla wszystkich czasów.",
    definitionExamples: [
      "I have to work on Saturday.",
      "You don't have to come.",
      "She had to leave early.",
    ],
    structures: [
      {
        label: "Twierdzenie (Affirmative)",
        pattern: "Subject + have/has to + base verb",
        example: "She has to wake up early.",
      },
      {
        label: "Przeczenie (Negative)",
        pattern: "Subject + don't/doesn't have to + base verb",
        example: "You don't have to come if you're tired.",
      },
      {
        label: "Pytanie (Question)",
        pattern: "Do/Does + subject + have to + base verb?",
        example: "Do you have to work tomorrow?",
      },
    ],
    uses: [
      {
        title: "Obligation — obowiązek",
        body:
          "Have to opisuje obowiązek wynikający z zewnętrznych okoliczności — przepisów, zasad, wymagań sytuacji. Brzmi bardziej neutralnie niż must.",
        examples: [
          "I have to wake up at 6 every day.",
          "She has to wear glasses.",
          "You have to be 18 to vote.",
          "We have to finish this by Friday.",
        ],
      },
      {
        title: "Lack of necessity — brak konieczności",
        body:
          "Don't have to (≠ mustn't!) wyraża brak konieczności — coś nie jest wymagane, ale można to zrobić.",
        examples: [
          "You don't have to come.",
          "She doesn't have to finish today.",
          "We don't have to wear a tie here.",
        ],
        warning:
          "Don't have to ≠ mustn't! Don't have to = nie musisz (brak konieczności). Mustn't = nie wolno ci (zakaz). Mylenie tych dwóch to częsty błąd.",
      },
      {
        title: "Past & future forms",
        body:
          "Have to ma formy w różnych czasach — to przewaga nad must, które nie odmienia się przez czasy.",
        examples: [
          "I had to leave early yesterday.",
          "She will have to work next weekend.",
          "They've had to change plans twice.",
          "I didn't have to wait long.",
        ],
      },
    ],
    mistakes: [
      {
        bad: "He don't have to work.",
        good: "He doesn't have to work.",
        note: "Z he/she/it używamy doesn't, nie don't.",
      },
      {
        bad: "You don't have to do it. (gdy znaczenie = zakaz)",
        good: "You mustn't do it.",
        note:
          "Don't have to = brak konieczności. Zakaz to mustn't. Upewnij się, że używasz właściwego znaczenia.",
      },
      {
        bad: "I must to go → I musted go (przeszłość).",
        good: "I had to go.",
        note: "Must nie ma formy przeszłej. Przeszłość obowiązku to had to.",
      },
    ],
    compare: [
      {
        title: "have to vs must",
        description:
          "Oba wyrażają obowiązek. Must brzmi mocniej i bardziej osobiście. Have to — zewnętrzny obowiązek, naturalniejsze w rozmowie. Must nie ma formy przeszłej; have to ma: had to.",
      },
      {
        title: "don't have to vs mustn't",
        description:
          "Don't have to — brak konieczności, opcjonalne. Mustn't — zakaz, nie wolno.",
      },
      {
        title: "have to vs need to",
        description:
          "Oba wyrażają konieczność. Need to jest bardziej potoczne i często wymienne z have to.",
      },
    ],
  },

  // ── be able to ───────────────────────────────────────────────────────────
  {
    id: "be-able-to",
    title: "be able to",
    description: "Umiejętności w innych czasach i konstrukcjach.",
    definition:
      "Be able to oznacza umiejętność lub możliwość wykonania czegoś. Używamy tej konstrukcji przede wszystkim gdy can gramatycznie nie pasuje — np. w przyszłości z will, po innych modalach, po have to lub w czasie przeszłym gdy mówimy o konkretnym sukcesie.",
    definitionExamples: [
      "I will be able to help you tomorrow.",
      "She was able to finish in time.",
      "I want to be able to drive.",
    ],
    structures: [
      {
        label: "Twierdzenie (Affirmative)",
        pattern: "Subject + am/is/are/was/were/will be able to + base verb",
        example: "She will be able to join us next week.",
      },
      {
        label: "Przeczenie (Negative)",
        pattern: "Subject + am not/isn't/aren't/wasn't/weren't/won't be able to + base verb",
        example: "I won't be able to come tomorrow.",
      },
      {
        label: "Pytanie (Question)",
        pattern: "Am/Is/Are/Was/Were/Will + subject + be able to + base verb?",
        example: "Will you be able to finish on time?",
      },
    ],
    uses: [
      {
        title: "Future ability — zdolność w przyszłości",
        body:
          "Gdy chcemy mówić o zdolności w przyszłości, nie możemy użyć can bezpośrednio z will. Dlatego używamy will be able to.",
        examples: [
          "I will be able to help you tomorrow.",
          "She will be able to drive after the lessons.",
          "They won't be able to attend the meeting.",
        ],
      },
      {
        title: "After other verbs — po innych czasownikach",
        body:
          "Be able to pojawia się po czasownikach, które wymagają bezokolicznika, np. want to, need to, have to, would like to. Can nie może tu wystąpić.",
        examples: [
          "I want to be able to play the guitar.",
          "You need to be able to swim for this job.",
          "I'd like to be able to speak Japanese.",
        ],
      },
      {
        title: "Specific success in the past — konkretny sukces w przeszłości",
        body:
          "Gdy mówimy o konkretnej jednorazowej sytuacji, w której coś udało się zrobić w przeszłości, używamy was/were able to — nie could.",
        examples: [
          "She was able to finish the race despite the injury.",
          "They were able to open the door with a spare key.",
          "I was able to get a ticket at the last minute.",
        ],
        warning:
          "Could opisuje ogólną zdolność z przeszłości. Was/were able to opisuje konkretny sukces. W zdaniach przeczących (couldn't) różnica znika — oba znaczą 'nie udało się'.",
      },
    ],
    mistakes: [
      {
        bad: "I can able to drive.",
        good: "I can drive. / I am able to drive.",
        note: "Nie łączymy can z able to — używamy jednej z tych form.",
      },
      {
        bad: "Yesterday I could finish the report.",
        good: "Yesterday I was able to finish the report.",
        note:
          "Konkretny jednorazowy sukces w przeszłości to was able to, nie could.",
      },
      {
        bad: "I will can help you.",
        good: "I will be able to help you.",
        note: "Will nie łączy się z can — zamiast tego: will be able to.",
      },
    ],
    compare: [
      {
        title: "be able to vs can",
        description:
          "Can — standardowe wyrażanie zdolności w teraźniejszości. Be able to — gdy potrzebujemy innego czasu, po innych modalach lub gdy can gramatycznie nie pasuje.",
      },
      {
        title: "was able to vs could (przeszłość)",
        description:
          "Could — ogólna zdolność z przeszłości. Was/were able to — konkretny jednorazowy sukces. W przeczeniach (couldn't / wasn't able to) różnica jest minimalna.",
      },
      {
        title: "be able to vs manage to",
        description:
          "Manage to często pojawia się zamiast was able to w opisie sukcesu w trudnej sytuacji. Oba są poprawne i często wymienne.",
      },
    ],
  },
];

export function getModalWord(id: string): ModalWordData | undefined {
  return modalWords.find((w) => w.id === id);
}
