import type { GrammarTenseSlug } from "./types";

/**
 * Grammar exercise_slug (canonical knowledge unit_id when unit_type = "grammar"):
 * - Defined here as each exercise's `slug` and as keys in grammarPracticeExercises / conditionalExercises.
 * - Stable contract: MUST NOT change with UI copy, question rewording, or question reordering.
 * - Questions under a slug are interchangeable probes of the same topic skill; knowledge aggregates at slug level.
 */
export type GrammarPracticeQuestion = {
  /** Per-question task id for events/diagnostics (e.g. "present-simple-q1"). NOT a learning unit_id. */
  id: string;
  prompt: string;
  base?: string;
  options: string[];
  correct_option: string;
};

export type GrammarPracticeExercise = {
  /** Topic-level id = session.context_slug = user_learning_unit_knowledge.unit_id for grammar. */
  slug: GrammarTenseSlug;
  title: string;
  questions: GrammarPracticeQuestion[];
};

export const grammarPracticeExercises: Record<GrammarTenseSlug, GrammarPracticeExercise> = {
  "present-simple": {
    slug: "present-simple",
    title: "Present Simple",
    questions: [
      {
        id: "present-simple-q1",
        prompt: "He ____ to work here.",
        base: "like",
        options: ["likes", "like", "liked", "liking"],
        correct_option: "likes",
      },
      {
        id: "present-simple-q2",
        prompt: "She ____ English every evening.",
        base: "study",
        options: ["studies", "study", "studied", "is studying"],
        correct_option: "studies",
      },
      {
        id: "present-simple-q3",
        prompt: "The train ____ at 8 a.m. every day.",
        base: "leave",
        options: ["leaves", "leave", "left", "is leaving"],
        correct_option: "leaves",
      },
      {
        id: "present-simple-q4",
        prompt: "Do you ____ coffee in the morning?",
        base: "drink",
        options: ["drink", "drinks", "drank", "drinking"],
        correct_option: "drink",
      },
      {
        id: "present-simple-q5",
        prompt: "Water ____ at 100°C.",
        base: "boil",
        options: ["boils", "boil", "is boiling", "boiled"],
        correct_option: "boils",
      },
      {
        id: "present-simple-q6",
        prompt: "He ____ here anymore.",
        base: "not / live",
        options: ["doesn't live", "don't live", "isn't living", "didn't live"],
        correct_option: "doesn't live",
      },
      {
        id: "present-simple-q7",
        prompt: "____ your sister work on weekends?",
        options: ["Does", "Do", "Is", "Has"],
        correct_option: "Does",
      },
      {
        id: "present-simple-q8",
        prompt: "My parents ____ in Warsaw.",
        base: "live",
        options: ["live", "lives", "lived", "are living"],
        correct_option: "live",
      },
      {
        id: "present-simple-q9",
        prompt: "She always ____ her coffee without sugar.",
        base: "have",
        options: ["has", "have", "is having", "had"],
        correct_option: "has",
      },
      {
        id: "present-simple-q10",
        prompt: "The museum ____ at 10 a.m.",
        base: "open",
        options: ["opens", "open", "is opening", "opened"],
        correct_option: "opens",
      },
    ],
  },

  "present-continuous": {
    slug: "present-continuous",
    title: "Present Continuous",
    questions: [
      {
        id: "present-continuous-q1",
        prompt: "She ____ now.",
        base: "work",
        options: ["works", "is working", "work", "worked"],
        correct_option: "is working",
      },
      {
        id: "present-continuous-q2",
        prompt: "They ____ a new app at the moment.",
        base: "develop",
        options: ["are developing", "develop", "developed", "have developed"],
        correct_option: "are developing",
      },
      {
        id: "present-continuous-q3",
        prompt: "I ____ a really good book this week.",
        base: "read",
        options: ["am reading", "read", "reads", "have read"],
        correct_option: "am reading",
      },
      {
        id: "present-continuous-q4",
        prompt: "Listen! Someone ____.",
        base: "sing",
        options: ["is singing", "sings", "sang", "has sung"],
        correct_option: "is singing",
      },
      {
        id: "present-continuous-q5",
        prompt: "She ____ to Berlin tomorrow — it's already booked.",
        base: "fly",
        options: ["is flying", "flies", "will fly", "flew"],
        correct_option: "is flying",
      },
      {
        id: "present-continuous-q6",
        prompt: "The company ____ quickly these days.",
        base: "grow",
        options: ["is growing", "grows", "grew", "has grown"],
        correct_option: "is growing",
      },
      {
        id: "present-continuous-q7",
        prompt: "____ you waiting for someone?",
        options: ["Are", "Do", "Were", "Have"],
        correct_option: "Are",
      },
      {
        id: "present-continuous-q8",
        prompt: "He ____ to his manager right now.",
        base: "talk",
        options: ["is talking", "talks", "talked", "has talked"],
        correct_option: "is talking",
      },
      {
        id: "present-continuous-q9",
        prompt: "We ____ the office this month.",
        base: "redecorate",
        options: ["are redecorating", "redecorate", "redecorated", "have redecorated"],
        correct_option: "are redecorating",
      },
      {
        id: "present-continuous-q10",
        prompt: "She ____ a conference next Monday — it's in her calendar.",
        base: "attend",
        options: ["is attending", "attends", "will attend", "attended"],
        correct_option: "is attending",
      },
    ],
  },

  "past-simple": {
    slug: "past-simple",
    title: "Past Simple",
    questions: [
      {
        id: "past-simple-q1",
        prompt: "He ____ to London last year.",
        base: "go",
        options: ["goes", "went", "gone", "going"],
        correct_option: "went",
      },
      {
        id: "past-simple-q2",
        prompt: "We ____ a great movie last night.",
        base: "watch",
        options: ["watched", "watch", "have watched", "were watching"],
        correct_option: "watched",
      },
      {
        id: "past-simple-q3",
        prompt: "She ____ her keys yesterday.",
        base: "lose",
        options: ["lost", "lose", "has lost", "was losing"],
        correct_option: "lost",
      },
      {
        id: "past-simple-q4",
        prompt: "They ____ the match 3-0.",
        base: "win",
        options: ["won", "win", "have won", "were winning"],
        correct_option: "won",
      },
      {
        id: "past-simple-q5",
        prompt: "Did you ____ the meeting?",
        base: "attend",
        options: ["attend", "attended", "attending", "attends"],
        correct_option: "attend",
      },
      {
        id: "past-simple-q6",
        prompt: "He ____ early because he was tired.",
        base: "leave",
        options: ["left", "leave", "has left", "was leaving"],
        correct_option: "left",
      },
      {
        id: "past-simple-q7",
        prompt: "____ she call you last night?",
        options: ["Did", "Does", "Was", "Has"],
        correct_option: "Did",
      },
      {
        id: "past-simple-q8",
        prompt: "I ____ three coffees before noon.",
        base: "drink",
        options: ["drank", "drink", "have drunk", "was drinking"],
        correct_option: "drank",
      },
      {
        id: "past-simple-q9",
        prompt: "The party ____ at 10 p.m.",
        base: "end",
        options: ["ended", "ends", "was ending", "has ended"],
        correct_option: "ended",
      },
      {
        id: "past-simple-q10",
        prompt: "He ____ to answer my messages.",
        base: "not / reply",
        options: ["didn't reply", "doesn't reply", "hasn't replied", "wasn't replying"],
        correct_option: "didn't reply",
      },
    ],
  },

  "past-continuous": {
    slug: "past-continuous",
    title: "Past Continuous",
    questions: [
      {
        id: "past-continuous-q1",
        prompt: "She ____ when I called.",
        base: "work",
        options: ["worked", "was working", "has worked", "works"],
        correct_option: "was working",
      },
      {
        id: "past-continuous-q2",
        prompt: "They ____ football at 5 p.m. yesterday.",
        base: "play",
        options: ["were playing", "played", "have played", "play"],
        correct_option: "were playing",
      },
      {
        id: "past-continuous-q3",
        prompt: "While I ____, the phone rang.",
        base: "cook",
        options: ["was cooking", "cooked", "have cooked", "am cooking"],
        correct_option: "was cooking",
      },
      {
        id: "past-continuous-q4",
        prompt: "At 9 p.m., she ____ dinner.",
        base: "make",
        options: ["was making", "made", "has made", "makes"],
        correct_option: "was making",
      },
      {
        id: "past-continuous-q5",
        prompt: "I ____ when you sent me that email.",
        base: "sleep",
        options: ["was sleeping", "slept", "have slept", "sleep"],
        correct_option: "was sleeping",
      },
      {
        id: "past-continuous-q6",
        prompt: "She ____ her homework when he arrived.",
        base: "not / do",
        options: ["wasn't doing", "didn't do", "hasn't done", "doesn't do"],
        correct_option: "wasn't doing",
      },
      {
        id: "past-continuous-q7",
        prompt: "The children ____ when the teacher came in.",
        base: "laugh",
        options: ["were laughing", "laughed", "have laughed", "laugh"],
        correct_option: "were laughing",
      },
      {
        id: "past-continuous-q8",
        prompt: "He ____ to music all evening.",
        base: "listen",
        options: ["was listening", "listened", "has listened", "listens"],
        correct_option: "was listening",
      },
      {
        id: "past-continuous-q9",
        prompt: "____ it raining when you left?",
        options: ["Was", "Were", "Did", "Has"],
        correct_option: "Was",
      },
      {
        id: "past-continuous-q10",
        prompt: "She ____ while he was setting the table.",
        base: "cook",
        options: ["was cooking", "cooked", "has cooked", "cooks"],
        correct_option: "was cooking",
      },
    ],
  },

  "past-perfect": {
    slug: "past-perfect",
    title: "Past Perfect",
    questions: [
      {
        id: "past-perfect-q1",
        prompt: "She ____ before I arrived.",
        base: "finish",
        options: ["finished", "had finished", "has finished", "was finishing"],
        correct_option: "had finished",
      },
      {
        id: "past-perfect-q2",
        prompt: "By the time we arrived, the film ____.",
        base: "start",
        options: ["had started", "started", "has started", "was starting"],
        correct_option: "had started",
      },
      {
        id: "past-perfect-q3",
        prompt: "She was upset because she ____ her phone.",
        base: "lose",
        options: ["had lost", "lost", "has lost", "was losing"],
        correct_option: "had lost",
      },
      {
        id: "past-perfect-q4",
        prompt: "They couldn't enter because they ____ the key.",
        base: "forget",
        options: ["had forgotten", "forgot", "have forgotten", "were forgetting"],
        correct_option: "had forgotten",
      },
      {
        id: "past-perfect-q5",
        prompt: "____ you ever been to Japan before 2020?",
        options: ["Had", "Have", "Did", "Were"],
        correct_option: "Had",
      },
      {
        id: "past-perfect-q6",
        prompt: "When I got home, everyone ____ already ____.",
        base: "go",
        options: ["had already gone", "already went", "has already gone", "was already going"],
        correct_option: "had already gone",
      },
      {
        id: "past-perfect-q7",
        prompt: "She ____ the report before the meeting.",
        base: "write",
        options: ["had written", "wrote", "has written", "was writing"],
        correct_option: "had written",
      },
      {
        id: "past-perfect-q8",
        prompt: "We arrived late because we ____ the train.",
        base: "miss",
        options: ["had missed", "missed", "have missed", "were missing"],
        correct_option: "had missed",
      },
      {
        id: "past-perfect-q9",
        prompt: "He ____ before he moved abroad.",
        base: "not / study French",
        options: ["had never studied French", "never studied French", "has never studied French", "was never studying French"],
        correct_option: "had never studied French",
      },
      {
        id: "past-perfect-q10",
        prompt: "She felt relieved — she ____ for the exam thoroughly.",
        base: "prepare",
        options: ["had prepared", "prepared", "has prepared", "was preparing"],
        correct_option: "had prepared",
      },
    ],
  },

  "past-perfect-continuous": {
    slug: "past-perfect-continuous",
    title: "Past Perfect Continuous",
    questions: [
      {
        id: "past-perfect-continuous-q1",
        prompt: "She ____ for hours before she took a break.",
        base: "work",
        options: ["worked", "had worked", "had been working", "was working"],
        correct_option: "had been working",
      },
      {
        id: "past-perfect-continuous-q2",
        prompt: "They were tired because they ____ all night.",
        base: "travel",
        options: ["had been travelling", "had travelled", "travelled", "were travelling"],
        correct_option: "had been travelling",
      },
      {
        id: "past-perfect-continuous-q3",
        prompt: "He ____ English for two years before he moved to London.",
        base: "learn",
        options: ["had been learning", "had learned", "was learning", "learned"],
        correct_option: "had been learning",
      },
      {
        id: "past-perfect-continuous-q4",
        prompt: "She was soaking wet because she ____ in the rain.",
        base: "walk",
        options: ["had been walking", "had walked", "walked", "was walking"],
        correct_option: "had been walking",
      },
      {
        id: "past-perfect-continuous-q5",
        prompt: "____ they been waiting long when you arrived?",
        options: ["Had", "Have", "Were", "Did"],
        correct_option: "Had",
      },
      {
        id: "past-perfect-continuous-q6",
        prompt: "I was exhausted because I ____ all day.",
        base: "study",
        options: ["had been studying", "had studied", "studied", "was studying"],
        correct_option: "had been studying",
      },
      {
        id: "past-perfect-continuous-q7",
        prompt: "She ____ all morning, so the house was spotless.",
        base: "clean",
        options: ["had been cleaning", "had cleaned", "cleaned", "was cleaning"],
        correct_option: "had been cleaning",
      },
      {
        id: "past-perfect-continuous-q8",
        prompt: "He was out of breath because he ____.",
        base: "run",
        options: ["had been running", "had run", "ran", "was running"],
        correct_option: "had been running",
      },
      {
        id: "past-perfect-continuous-q9",
        prompt: "They ____ for 20 minutes before the bus came.",
        base: "wait",
        options: ["had been waiting", "had waited", "waited", "were waiting"],
        correct_option: "had been waiting",
      },
      {
        id: "past-perfect-continuous-q10",
        prompt: "She felt sick because she ____ in the sun all afternoon.",
        base: "sit",
        options: ["had been sitting", "had sat", "sat", "was sitting"],
        correct_option: "had been sitting",
      },
    ],
  },

  "present-perfect": {
    slug: "present-perfect",
    title: "Present Perfect",
    questions: [
      {
        id: "present-perfect-q1",
        prompt: "She ____ here for 5 years.",
        base: "live",
        options: ["lives", "lived", "has lived", "has been living"],
        correct_option: "has lived",
      },
      {
        id: "present-perfect-q2",
        prompt: "I ____ that film yet.",
        base: "not / see",
        options: ["haven't seen", "don't see", "didn't see", "wasn't seeing"],
        correct_option: "haven't seen",
      },
      {
        id: "present-perfect-q3",
        prompt: "He ____ his keys again.",
        base: "just / lose",
        options: ["has just lost", "just lost", "is just losing", "had just lost"],
        correct_option: "has just lost",
      },
      {
        id: "present-perfect-q4",
        prompt: "____ you ever been to Japan?",
        options: ["Have", "Did", "Were", "Had"],
        correct_option: "Have",
      },
      {
        id: "present-perfect-q5",
        prompt: "She ____ the project already.",
        base: "finish",
        options: ["has finished", "finished", "is finishing", "had finished"],
        correct_option: "has finished",
      },
      {
        id: "present-perfect-q6",
        prompt: "I ____ three cups of coffee today.",
        base: "drink",
        options: ["have drunk", "drank", "am drinking", "had drunk"],
        correct_option: "have drunk",
      },
      {
        id: "present-perfect-q7",
        prompt: "He has never ____ sushi.",
        base: "eat",
        options: ["eaten", "eating", "ate", "eats"],
        correct_option: "eaten",
      },
      {
        id: "present-perfect-q8",
        prompt: "We ____ the report yet.",
        base: "not / submit",
        options: ["haven't submitted", "don't submit", "didn't submit", "hadn't submitted"],
        correct_option: "haven't submitted",
      },
      {
        id: "present-perfect-q9",
        prompt: "She ____ in Paris before.",
        base: "never / be",
        options: ["has never been", "never was", "never is", "had never been"],
        correct_option: "has never been",
      },
      {
        id: "present-perfect-q10",
        prompt: "They ____ here since 2018.",
        base: "live",
        options: ["have lived", "live", "lived", "had lived"],
        correct_option: "have lived",
      },
    ],
  },

  "present-perfect-continuous": {
    slug: "present-perfect-continuous",
    title: "Present Perfect Continuous",
    questions: [
      {
        id: "present-perfect-continuous-q1",
        prompt: "She ____ all morning.",
        base: "work",
        options: ["works", "worked", "has worked", "has been working"],
        correct_option: "has been working",
      },
      {
        id: "present-perfect-continuous-q2",
        prompt: "The kids are excited — they ____ about the trip all week.",
        base: "talk",
        options: ["have been talking", "have talked", "talked", "talk"],
        correct_option: "have been talking",
      },
      {
        id: "present-perfect-continuous-q3",
        prompt: "I ____ for two hours. I need a break.",
        base: "study",
        options: ["have been studying", "have studied", "studied", "am studying"],
        correct_option: "have been studying",
      },
      {
        id: "present-perfect-continuous-q4",
        prompt: "He looks tired. He ____ all day.",
        base: "run",
        options: ["has been running", "has run", "ran", "runs"],
        correct_option: "has been running",
      },
      {
        id: "present-perfect-continuous-q5",
        prompt: "They ____ the same issue since Tuesday.",
        base: "discuss",
        options: ["have been discussing", "have discussed", "discussed", "discuss"],
        correct_option: "have been discussing",
      },
      {
        id: "present-perfect-continuous-q6",
        prompt: "She ____ lately — she looks exhausted.",
        base: "not / sleep well",
        options: ["hasn't been sleeping well", "doesn't sleep well", "hasn't slept well", "isn't sleeping well"],
        correct_option: "hasn't been sleeping well",
      },
      {
        id: "present-perfect-continuous-q7",
        prompt: "____ it raining since this morning?",
        options: ["Has", "Is", "Was", "Have"],
        correct_option: "Has",
      },
      {
        id: "present-perfect-continuous-q8",
        prompt: "We ____ for a solution for weeks.",
        base: "look",
        options: ["have been looking", "have looked", "are looking", "looked"],
        correct_option: "have been looking",
      },
      {
        id: "present-perfect-continuous-q9",
        prompt: "I ____ the report since 9 a.m.",
        base: "write",
        options: ["have been writing", "have written", "am writing", "wrote"],
        correct_option: "have been writing",
      },
      {
        id: "present-perfect-continuous-q10",
        prompt: "She ____ English for six months.",
        base: "learn",
        options: ["has been learning", "has learned", "is learning", "learned"],
        correct_option: "has been learning",
      },
    ],
  },

  "future-simple": {
    slug: "future-simple",
    title: "Future Simple",
    questions: [
      {
        id: "future-simple-q1",
        prompt: "She ____ you tomorrow.",
        base: "call",
        options: ["calls", "will call", "is calling", "called"],
        correct_option: "will call",
      },
      {
        id: "future-simple-q2",
        prompt: "I think it ____ tomorrow.",
        base: "rain",
        options: ["will rain", "rains", "is raining", "rained"],
        correct_option: "will rain",
      },
      {
        id: "future-simple-q3",
        prompt: "Don't worry, I ____ you.",
        base: "help",
        options: ["will help", "help", "am helping", "helped"],
        correct_option: "will help",
      },
      {
        id: "future-simple-q4",
        prompt: "She ____ the meeting.",
        base: "not / attend",
        options: ["won't attend", "doesn't attend", "isn't attending", "didn't attend"],
        correct_option: "won't attend",
      },
      {
        id: "future-simple-q5",
        prompt: "____ you carry this for me?",
        options: ["Will", "Are", "Do", "Can"],
        correct_option: "Will",
      },
      {
        id: "future-simple-q6",
        prompt: "He ____ very happy when he hears the news.",
        base: "be",
        options: ["will be", "is", "was", "would be"],
        correct_option: "will be",
      },
      {
        id: "future-simple-q7",
        prompt: "I'm sure they ____ the match.",
        base: "win",
        options: ["will win", "win", "are winning", "won"],
        correct_option: "will win",
      },
      {
        id: "future-simple-q8",
        prompt: "We ____ back before midnight.",
        base: "come",
        options: ["will come", "come", "are coming", "came"],
        correct_option: "will come",
      },
      {
        id: "future-simple-q9",
        prompt: "She probably ____ early.",
        base: "not / arrive",
        options: ["won't arrive", "doesn't arrive", "isn't arriving", "didn't arrive"],
        correct_option: "won't arrive",
      },
      {
        id: "future-simple-q10",
        prompt: "The phone is ringing. I ____ it.",
        base: "get",
        options: ["will get", "get", "am getting", "got"],
        correct_option: "will get",
      },
    ],
  },

  "future-continuous": {
    slug: "future-continuous",
    title: "Future Continuous",
    questions: [
      {
        id: "future-continuous-q1",
        prompt: "This time tomorrow, she ____ in the office.",
        base: "work",
        options: ["works", "will work", "will be working", "is working"],
        correct_option: "will be working",
      },
      {
        id: "future-continuous-q2",
        prompt: "At 8 p.m., we ____ dinner.",
        base: "have",
        options: ["will be having", "have", "will have", "are having"],
        correct_option: "will be having",
      },
      {
        id: "future-continuous-q3",
        prompt: "This time next week, I ____ on a beach.",
        base: "lie",
        options: ["will be lying", "will lie", "lie", "am lying"],
        correct_option: "will be lying",
      },
      {
        id: "future-continuous-q4",
        prompt: "She ____ tomorrow, so she can't meet.",
        base: "travel",
        options: ["will be travelling", "travels", "will travel", "is travelling"],
        correct_option: "will be travelling",
      },
      {
        id: "future-continuous-q5",
        prompt: "____ you be using the printer tomorrow?",
        options: ["Will", "Are", "Do", "Would"],
        correct_option: "Will",
      },
      {
        id: "future-continuous-q6",
        prompt: "He ____ a report during the meeting.",
        base: "present",
        options: ["will be presenting", "presents", "will present", "is presenting"],
        correct_option: "will be presenting",
      },
      {
        id: "future-continuous-q7",
        prompt: "I can't call at 6 — I ____ then.",
        base: "drive",
        options: ["will be driving", "drive", "will drive", "am driving"],
        correct_option: "will be driving",
      },
      {
        id: "future-continuous-q8",
        prompt: "They ____ in London this time next month.",
        base: "live",
        options: ["will be living", "will live", "live", "are living"],
        correct_option: "will be living",
      },
      {
        id: "future-continuous-q9",
        prompt: "She ____ a presentation all morning.",
        base: "prepare",
        options: ["will be preparing", "prepares", "will prepare", "is preparing"],
        correct_option: "will be preparing",
      },
      {
        id: "future-continuous-q10",
        prompt: "We ____ dinner when you arrive.",
        base: "cook",
        options: ["will be cooking", "cook", "will cook", "are cooking"],
        correct_option: "will be cooking",
      },
    ],
  },

  "future-perfect-simple": {
    slug: "future-perfect-simple",
    title: "Future Perfect Simple",
    questions: [
      {
        id: "future-perfect-simple-q1",
        prompt: "By next week, she ____ the project.",
        base: "finish",
        options: ["finishes", "will finish", "will have finished", "will have been finishing"],
        correct_option: "will have finished",
      },
      {
        id: "future-perfect-simple-q2",
        prompt: "By 6 p.m., I ____ my work.",
        base: "complete",
        options: ["will have completed", "complete", "will complete", "have completed"],
        correct_option: "will have completed",
      },
      {
        id: "future-perfect-simple-q3",
        prompt: "She ____ before you arrive.",
        base: "leave",
        options: ["will have left", "will leave", "leaves", "has left"],
        correct_option: "will have left",
      },
      {
        id: "future-perfect-simple-q4",
        prompt: "They ____ the report by Friday.",
        base: "not / finish",
        options: ["won't have finished", "won't finish", "don't finish", "haven't finished"],
        correct_option: "won't have finished",
      },
      {
        id: "future-perfect-simple-q5",
        prompt: "____ you have eaten by 8?",
        options: ["Will", "Are", "Do", "Have"],
        correct_option: "Will",
      },
      {
        id: "future-perfect-simple-q6",
        prompt: "By the time he arrives, we ____ everything.",
        base: "prepare",
        options: ["will have prepared", "will prepare", "prepare", "are preparing"],
        correct_option: "will have prepared",
      },
      {
        id: "future-perfect-simple-q7",
        prompt: "She ____ the book twice by the end of the month.",
        base: "read",
        options: ["will have read", "will read", "reads", "has read"],
        correct_option: "will have read",
      },
      {
        id: "future-perfect-simple-q8",
        prompt: "By next year, they ____ here for a decade.",
        base: "live",
        options: ["will have lived", "will live", "have lived", "live"],
        correct_option: "will have lived",
      },
      {
        id: "future-perfect-simple-q9",
        prompt: "He ____ the problem before the boss notices.",
        base: "fix",
        options: ["will have fixed", "will fix", "fixes", "has fixed"],
        correct_option: "will have fixed",
      },
      {
        id: "future-perfect-simple-q10",
        prompt: "By 10 a.m. tomorrow, I ____ three meetings.",
        base: "attend",
        options: ["will have attended", "will attend", "attend", "have attended"],
        correct_option: "will have attended",
      },
    ],
  },

  "future-perfect-continuous": {
    slug: "future-perfect-continuous",
    title: "Future Perfect Continuous",
    questions: [
      {
        id: "future-perfect-continuous-q1",
        prompt: "By next month, she ____ here for two years.",
        base: "work",
        options: ["works", "will work", "will have worked", "will have been working"],
        correct_option: "will have been working",
      },
      {
        id: "future-perfect-continuous-q2",
        prompt: "By June, he ____ English for six months.",
        base: "study",
        options: ["will have been studying", "will study", "has studied", "will have studied"],
        correct_option: "will have been studying",
      },
      {
        id: "future-perfect-continuous-q3",
        prompt: "By 5 p.m., they ____ for three hours.",
        base: "wait",
        options: ["will have been waiting", "will wait", "have waited", "will have waited"],
        correct_option: "will have been waiting",
      },
      {
        id: "future-perfect-continuous-q4",
        prompt: "By next summer, I ____ Polish for two years.",
        base: "learn",
        options: ["will have been learning", "will learn", "have learned", "will have learned"],
        correct_option: "will have been learning",
      },
      {
        id: "future-perfect-continuous-q5",
        prompt: "____ you have been waiting long by the time I arrive?",
        options: ["Will", "Are", "Have", "Were"],
        correct_option: "Will",
      },
      {
        id: "future-perfect-continuous-q6",
        prompt: "By retirement, she ____ for 40 years.",
        base: "teach",
        options: ["will have been teaching", "will teach", "has taught", "will have taught"],
        correct_option: "will have been teaching",
      },
      {
        id: "future-perfect-continuous-q7",
        prompt: "By the time the film ends, we ____ for over two hours.",
        base: "watch",
        options: ["will have been watching", "will watch", "have watched", "will have watched"],
        correct_option: "will have been watching",
      },
      {
        id: "future-perfect-continuous-q8",
        prompt: "He ____ on the roof all day when we get home.",
        base: "work",
        options: ["will have been working", "will work", "has worked", "works"],
        correct_option: "will have been working",
      },
      {
        id: "future-perfect-continuous-q9",
        prompt: "By the deadline, they ____ on the app for eight months.",
        base: "develop",
        options: ["will have been developing", "will develop", "have developed", "will have developed"],
        correct_option: "will have been developing",
      },
      {
        id: "future-perfect-continuous-q10",
        prompt: "She ____ there for two hours by the time the doctor sees her.",
        base: "sit",
        options: ["will have been sitting", "will sit", "has sat", "will have sat"],
        correct_option: "will have been sitting",
      },
    ],
  },

  "zero-conditional": {
    slug: "zero-conditional",
    title: "Zero Conditional",
    questions: [
      {
        id: "zero-conditional-q1",
        prompt: "If you heat water, it ____.",
        base: "boil",
        options: ["boil", "boils", "will boil", "would boil"],
        correct_option: "boils",
      },
      {
        id: "zero-conditional-q2",
        prompt: "If you mix red and yellow, you ____ orange.",
        base: "get",
        options: ["get", "gets", "will get", "would get"],
        correct_option: "get",
      },
      {
        id: "zero-conditional-q3",
        prompt: "Plants ____ if they don't get water.",
        base: "die",
        options: ["die", "dies", "will die", "would die"],
        correct_option: "die",
      },
      {
        id: "zero-conditional-q4",
        prompt: "If it ____, the ground gets wet.",
        base: "rain",
        options: ["rains", "will rain", "rained", "is raining"],
        correct_option: "rains",
      },
      {
        id: "zero-conditional-q5",
        prompt: "What happens if you ____ this button?",
        base: "press",
        options: ["press", "pressed", "will press", "would press"],
        correct_option: "press",
      },
      {
        id: "zero-conditional-q6",
        prompt: "If you ____ enough sleep, you feel better.",
        base: "get",
        options: ["get", "gets", "will get", "got"],
        correct_option: "get",
      },
      {
        id: "zero-conditional-q7",
        prompt: "If the temperature drops below 0°C, water ____ to ice.",
        base: "turn",
        options: ["turns", "will turn", "turned", "would turn"],
        correct_option: "turns",
      },
      {
        id: "zero-conditional-q8",
        prompt: "Oil ____ on water if you mix them.",
        base: "float",
        options: ["floats", "float", "will float", "would float"],
        correct_option: "floats",
      },
      {
        id: "zero-conditional-q9",
        prompt: "If you eat too much sugar, your teeth ____.",
        base: "decay",
        options: ["decay", "decays", "will decay", "would decay"],
        correct_option: "decay",
      },
      {
        id: "zero-conditional-q10",
        prompt: "She always ____ when she's nervous.",
        base: "talk too much",
        options: ["talks too much", "talk too much", "will talk too much", "talked too much"],
        correct_option: "talks too much",
      },
    ],
  },

  "first-conditional": {
    slug: "first-conditional",
    title: "First Conditional",
    questions: [
      {
        id: "first-conditional-q1",
        prompt: "If it rains tomorrow, we ____ at home.",
        base: "stay",
        options: ["will stay", "stay", "stayed", "would stay"],
        correct_option: "will stay",
      },
      {
        id: "first-conditional-q2",
        prompt: "If you study hard, you ____ the exam.",
        base: "pass",
        options: ["will pass", "pass", "passed", "would pass"],
        correct_option: "will pass",
      },
      {
        id: "first-conditional-q3",
        prompt: "She ____ if you invite her.",
        base: "come",
        options: ["will come", "comes", "came", "would come"],
        correct_option: "will come",
      },
      {
        id: "first-conditional-q4",
        prompt: "If he ____ the job, he'll celebrate.",
        base: "get",
        options: ["gets", "will get", "got", "would get"],
        correct_option: "gets",
      },
      {
        id: "first-conditional-q5",
        prompt: "Unless you hurry, you ____ the train.",
        base: "miss",
        options: ["will miss", "miss", "missed", "would miss"],
        correct_option: "will miss",
      },
      {
        id: "first-conditional-q6",
        prompt: "If I have time, I ____ you.",
        base: "help",
        options: ["will help", "help", "helped", "would help"],
        correct_option: "will help",
      },
      {
        id: "first-conditional-q7",
        prompt: "She won't succeed if she ____ practising.",
        base: "stop",
        options: ["stops", "will stop", "stopped", "would stop"],
        correct_option: "stops",
      },
      {
        id: "first-conditional-q8",
        prompt: "If he ____ hard, he might get promoted.",
        base: "work",
        options: ["works", "will work", "worked", "would work"],
        correct_option: "works",
      },
      {
        id: "first-conditional-q9",
        prompt: "They ____ on time if they leave now.",
        base: "arrive",
        options: ["will arrive", "arrive", "arrived", "would arrive"],
        correct_option: "will arrive",
      },
      {
        id: "first-conditional-q10",
        prompt: "If she ____ me, I'll be very grateful.",
        base: "help",
        options: ["helps", "will help", "helped", "would help"],
        correct_option: "helps",
      },
    ],
  },

  "second-conditional": {
    slug: "second-conditional",
    title: "Second Conditional",
    questions: [
      {
        id: "second-conditional-q1",
        prompt: "If I were you, I ____ more.",
        base: "study",
        options: ["study", "studied", "would study", "will study"],
        correct_option: "would study",
      },
      {
        id: "second-conditional-q2",
        prompt: "If I had more money, I ____ a house.",
        base: "buy",
        options: ["would buy", "buy", "bought", "will buy"],
        correct_option: "would buy",
      },
      {
        id: "second-conditional-q3",
        prompt: "She ____ to Paris if she could.",
        base: "move",
        options: ["would move", "moves", "moved", "will move"],
        correct_option: "would move",
      },
      {
        id: "second-conditional-q4",
        prompt: "If he ____ the truth, he would tell you.",
        base: "know",
        options: ["knew", "knows", "had known", "would know"],
        correct_option: "knew",
      },
      {
        id: "second-conditional-q5",
        prompt: "What ____ you do if you won the lottery?",
        options: ["would", "will", "do", "did"],
        correct_option: "would",
      },
      {
        id: "second-conditional-q6",
        prompt: "If I ____ you, I'd apologize.",
        base: "be",
        options: ["were", "was", "am", "would be"],
        correct_option: "were",
      },
      {
        id: "second-conditional-q7",
        prompt: "He ____ more if he had the chance.",
        base: "travel",
        options: ["would travel", "travels", "travelled", "will travel"],
        correct_option: "would travel",
      },
      {
        id: "second-conditional-q8",
        prompt: "They ____ harder if the boss paid them more.",
        base: "work",
        options: ["would work", "work", "worked", "will work"],
        correct_option: "would work",
      },
      {
        id: "second-conditional-q9",
        prompt: "If she ____ French, she could get that job.",
        base: "speak",
        options: ["spoke", "speaks", "has spoken", "would speak"],
        correct_option: "spoke",
      },
      {
        id: "second-conditional-q10",
        prompt: "I ____ help you if I could, but I can't.",
        options: ["would", "will", "could", "should"],
        correct_option: "would",
      },
    ],
  },

  "third-conditional": {
    slug: "third-conditional",
    title: "Third Conditional",
    questions: [
      {
        id: "third-conditional-q1",
        prompt: "If I had studied, I ____ the exam.",
        base: "pass",
        options: ["passed", "would pass", "would have passed", "will pass"],
        correct_option: "would have passed",
      },
      {
        id: "third-conditional-q2",
        prompt: "If she had known, she ____ earlier.",
        base: "arrive",
        options: ["would have arrived", "arrived", "would arrive", "has arrived"],
        correct_option: "would have arrived",
      },
      {
        id: "third-conditional-q3",
        prompt: "He ____ the job if he had been on time.",
        base: "get",
        options: ["would have got", "got", "would get", "has got"],
        correct_option: "would have got",
      },
      {
        id: "third-conditional-q4",
        prompt: "If you had told me, I ____ helped you.",
        options: ["could have", "would", "can", "could"],
        correct_option: "could have",
      },
      {
        id: "third-conditional-q5",
        prompt: "She ____ the train if she had run faster.",
        base: "catch",
        options: ["would have caught", "caught", "would catch", "has caught"],
        correct_option: "would have caught",
      },
      {
        id: "third-conditional-q6",
        prompt: "What ____ you have done if you had been there?",
        options: ["would", "did", "will", "had"],
        correct_option: "would",
      },
      {
        id: "third-conditional-q7",
        prompt: "If they ____ the instructions, the machine wouldn't have broken.",
        base: "follow",
        options: ["had followed", "followed", "have followed", "would follow"],
        correct_option: "had followed",
      },
      {
        id: "third-conditional-q8",
        prompt: "He ____ happier if he had accepted the offer.",
        base: "be",
        options: ["would have been", "was", "would be", "has been"],
        correct_option: "would have been",
      },
      {
        id: "third-conditional-q9",
        prompt: "If I ____ the alarm, I wouldn't have been late.",
        base: "set",
        options: ["had set", "set", "have set", "would set"],
        correct_option: "had set",
      },
      {
        id: "third-conditional-q10",
        prompt: "She ____ ill if she hadn't eaten that.",
        base: "not / become",
        options: ["wouldn't have become", "didn't become", "wouldn't become", "hasn't become"],
        correct_option: "wouldn't have become",
      },
    ],
  },

  "mixed-conditional": {
    slug: "mixed-conditional",
    title: "Mixed Conditional",
    questions: [
      {
        id: "mixed-conditional-q1",
        prompt: "If I had taken that job, I ____ in London now.",
        base: "live",
        options: ["lived", "would live", "would be living", "will be living"],
        correct_option: "would be living",
      },
      {
        id: "mixed-conditional-q2",
        prompt: "If she hadn't studied medicine, she ____ a doctor now.",
        base: "not / be",
        options: ["wouldn't be", "wouldn't have been", "isn't", "wasn't"],
        correct_option: "wouldn't be",
      },
      {
        id: "mixed-conditional-q3",
        prompt: "If he had moved to London, he ____ his dream job there now.",
        base: "have",
        options: ["would have", "has", "would have had", "will have"],
        correct_option: "would have",
      },
      {
        id: "mixed-conditional-q4",
        prompt: "I ____ tired now if I had slept enough last night.",
        base: "not / be",
        options: ["wouldn't be", "wasn't", "wouldn't have been", "isn't"],
        correct_option: "wouldn't be",
      },
      {
        id: "mixed-conditional-q5",
        prompt: "If you had started saving earlier, you ____ rich now.",
        base: "be",
        options: ["would be", "would have been", "were", "are"],
        correct_option: "would be",
      },
      {
        id: "mixed-conditional-q6",
        prompt: "If he ____ harder at school, he might be a lawyer now.",
        base: "study",
        options: ["had studied", "studied", "would study", "has studied"],
        correct_option: "had studied",
      },
      {
        id: "mixed-conditional-q7",
        prompt: "She ____ here if she had caught the 6 p.m. train.",
        base: "be",
        options: ["would be", "would have been", "was", "will be"],
        correct_option: "would be",
      },
      {
        id: "mixed-conditional-q8",
        prompt: "If they ____ the contract, they would have more clients now.",
        base: "sign",
        options: ["had signed", "signed", "would sign", "have signed"],
        correct_option: "had signed",
      },
      {
        id: "mixed-conditional-q9",
        prompt: "If I spoke Japanese, I ____ that job in Tokyo last year.",
        base: "take",
        options: ["could have taken", "could take", "would take", "had taken"],
        correct_option: "could have taken",
      },
      {
        id: "mixed-conditional-q10",
        prompt: "She ____ so stressed today if she had finished the project on time.",
        base: "not / be",
        options: ["wouldn't be", "wouldn't have been", "wasn't", "isn't"],
        correct_option: "wouldn't be",
      },
    ],
  },

  "conditional-connectors": {
    slug: "conditional-connectors",
    title: "Conditional Connectors",
    questions: [],
  },
  "modal-ability": {
    slug: "modal-ability",
    title: "Ability",
    questions: [],
  },
};

const conditionalExercises: Record<string, Omit<GrammarPracticeExercise, "slug"> & { slug: string }> = {
  "first-conditional": {
    slug: "first-conditional",
    title: "First Conditional",
    questions: [
      {
        id: "first-conditional-q1",
        prompt: "If it rains tomorrow, we ____ at home.",
        base: "stay",
        options: ["will stay", "stay", "stayed", "would stay"],
        correct_option: "will stay",
      },
    ],
  },
};

export function getGrammarPracticeExercise(slug: string): GrammarPracticeExercise | null {
  const fromTenses = grammarPracticeExercises[slug as GrammarTenseSlug];
  if (fromTenses) return fromTenses;
  const fromConditionals = conditionalExercises[slug];
  if (fromConditionals) return fromConditionals as GrammarPracticeExercise;
  return null;
}

export function getGrammarPracticeQuestion(
  exerciseSlug: string,
  questionId: string
): GrammarPracticeQuestion | null {
  const exercise = getGrammarPracticeExercise(exerciseSlug);
  if (!exercise) return null;
  return exercise.questions.find((q) => q.id === questionId) ?? null;
}

/** Per-question ids in this catalog use a `-q<number>` suffix. That pattern is NOT a valid exercise_slug / knowledge unit_id. */
const GRAMMAR_QUESTION_ID_SUFFIX = /-q\d+$/;

/**
 * True if `value` looks like a question_id (e.g. "present-simple-q1"), not a topic slug.
 * Used to reject mistaking question_id for the grammar knowledge unit_id.
 */
export function looksLikeGrammarQuestionId(value: string): boolean {
  return GRAMMAR_QUESTION_ID_SUFFIX.test(value.trim());
}

const GRAMMAR_EXERCISE_SLUG_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * True if `candidate` is a non-empty, stable topic slug present in this grammar catalog.
 * Use before persisting training_sessions.context_slug or writing user_learning_unit_knowledge for grammar.
 */
export function isRegisteredGrammarExerciseSlug(candidate: string): boolean {
  const s = candidate.trim();
  if (!s || s.length > 128) return false;
  if (looksLikeGrammarQuestionId(s)) return false;
  if (!GRAMMAR_EXERCISE_SLUG_SHAPE.test(s)) return false;
  return getGrammarPracticeExercise(s) !== null;
}
