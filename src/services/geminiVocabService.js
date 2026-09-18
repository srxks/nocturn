/**
 * Gemini Vocabulary Service
 * Responsible for requesting daily GRE-level vocabulary words.
 *
 * Multi-Tier Resilience Architecture:
 * 1. Primary: Supabase Edge Function 'generate-vocab' (includes clientApiKey in body as backup)
 * 2. Secondary: Local Vite dev proxy '/api/generate-vocab' (when running in dev mode)
 * 3. Tertiary: Direct Gemini API call via generativelanguage.googleapis.com with retry
 * 4. Quaternary: Curated offline GRE fallback pool (guarantees zero fatal errors for users)
 *
 * Uniqueness Guarantee:
 * - Passes all previously learned words to the negative prompt blacklist
 * - Temperature 0.9 + dynamic seed for varied vocabulary selection
 * - Client-side deduplication against all existing words
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

export const GEMINI_MODEL = 'gemini-3.6-flash'

/**
 * Curated high-yield GRE words pool for offline fallback and guarantee of non-empty words.
 */
export const CURATED_GRE_FALLBACK_WORDS = [
  {
    word: 'Equanimity',
    definition: 'Mental calmness, composure, and evenness of temper, especially in a difficult situation.',
    example_sentence: 'She accepted both praise and severe criticism with steadfast equanimity.',
    part_of_speech: 'noun',
    synonyms: ['composure', 'calmness', 'serenity', 'tranquility'],
    difficulty: 'Hard',
  },
  {
    word: 'Ephemeral',
    definition: 'Lasting for a very short time; transient or fleeting.',
    example_sentence: 'The autumn glory of the leaves proved to be gorgeous but ephemeral.',
    part_of_speech: 'adjective',
    synonyms: ['transitory', 'fleeting', 'evanescent', 'momentary'],
    difficulty: 'Hard',
  },
  {
    word: 'Laconic',
    definition: 'Using very few words; concise or terse to the point of seeming blunt.',
    example_sentence: 'His laconic reply of "No" conveyed his complete disinterest in participating.',
    part_of_speech: 'adjective',
    synonyms: ['terse', 'concise', 'succinct', 'pithy'],
    difficulty: 'Hard',
  },
  {
    word: 'Fastidious',
    definition: 'Very attentive to and concerned about accuracy and detail; exceedingly particular.',
    example_sentence: 'The editor was fastidious about grammatical precision and formatting.',
    part_of_speech: 'adjective',
    synonyms: ['meticulous', 'scrupulous', 'punctilious', 'exacting'],
    difficulty: 'Hard',
  },
  {
    word: 'Alacrity',
    definition: 'Brisk and cheerful readiness; promptness in response.',
    example_sentence: 'Having studied all semester, she accepted the challenging test with alacrity.',
    part_of_speech: 'noun',
    synonyms: ['eagerness', 'readiness', 'willingness', 'briskness'],
    difficulty: 'Hard',
  },
  {
    word: 'Pernicious',
    definition: 'Having a harmful effect, especially in a gradual or subtle, insidious manner.',
    example_sentence: 'The pernicious influence of disinformation undermined trust across the community.',
    part_of_speech: 'adjective',
    synonyms: ['harmful', 'destructive', 'damaging', 'insidious'],
    difficulty: 'Hard',
  },
  {
    word: 'Obsequious',
    definition: 'Obedient or attentive to an excessive or servile degree.',
    example_sentence: 'The courtiers maintained an obsequious deference toward the emperor.',
    part_of_speech: 'adjective',
    synonyms: ['servile', 'fawning', 'subservient', 'sycophantic'],
    difficulty: 'Hard',
  },
  {
    word: 'Mitigate',
    definition: 'To make something less severe, serious, painful, or damaging.',
    example_sentence: 'Early defensive measures helped mitigate the economic damage from the storm.',
    part_of_speech: 'verb',
    synonyms: ['alleviate', 'reduce', 'diminish', 'assuage'],
    difficulty: 'Hard',
  },
  {
    word: 'Inchoate',
    definition: 'Just begun and so not fully formed or developed; rudimentary.',
    example_sentence: 'At this early phase, our startup plan was merely an inchoate collection of notes.',
    part_of_speech: 'adjective',
    synonyms: ['rudimentary', 'incipient', 'embryonic', 'unformed'],
    difficulty: 'Hard',
  },
  {
    word: 'Recalcitrant',
    definition: 'Having an obstinately uncooperative attitude toward authority or discipline.',
    example_sentence: 'The recalcitrant committee member repeatedly refused to endorse the proposal.',
    part_of_speech: 'adjective',
    synonyms: ['uncooperative', 'intractable', 'obstinate', 'defiant'],
    difficulty: 'Hard',
  },
  {
    word: 'Perspicacious',
    definition: 'Having a ready insight into and keen understanding of complex things.',
    example_sentence: 'The perspicacious analyst noticed the subtle trend long before the market reacted.',
    part_of_speech: 'adjective',
    synonyms: ['perceptive', 'discerning', 'astute', 'shrewd'],
    difficulty: 'Hard',
  },
  {
    word: 'Capricious',
    definition: 'Given to sudden and unaccountable changes of mood or behavior; unpredictable.',
    example_sentence: 'The mountain weather was capricious, shifting from bright sunshine to blizzard in minutes.',
    part_of_speech: 'adjective',
    synonyms: ['fickle', 'inconstant', 'unpredictable', 'whimsical'],
    difficulty: 'Hard',
  },
  {
    word: 'Loquacious',
    definition: 'Tending to talk a great deal; extremely talkative.',
    example_sentence: 'The loquacious host kept everyone entertained with endless humorous anecdotes.',
    part_of_speech: 'adjective',
    synonyms: ['talkative', 'garrulous', 'voluble', 'chatty'],
    difficulty: 'Hard',
  },
  {
    word: 'Pragmatic',
    definition: 'Dealing with things sensibly and realistically based on practical considerations.',
    example_sentence: 'We chose a pragmatic approach that prioritized rapid implementation over theoretical purity.',
    part_of_speech: 'adjective',
    synonyms: ['practical', 'realistic', 'sensible', 'rational'],
    difficulty: 'Hard',
  },
  {
    word: 'Assiduous',
    definition: 'Showing great care, attention, and perseverance; diligent.',
    example_sentence: 'Her assiduous preparation allowed her to master the complex legal briefs.',
    part_of_speech: 'adjective',
    synonyms: ['diligent', 'thorough', 'meticulous', 'persevering'],
    difficulty: 'Hard',
  },
  {
    word: 'Anachronism',
    definition: 'A thing belonging or appropriate to a period other than that in which it exists.',
    example_sentence: 'The vintage typewriter seemed like an intriguing anachronism in the high-tech lab.',
    part_of_speech: 'noun',
    synonyms: ['misplacement', 'chronological error', 'throwback'],
    difficulty: 'Hard',
  },
  {
    word: 'Bombastic',
    definition: 'High-sounding but with little real meaning; inflated or pompous.',
    example_sentence: "The mayor dismissed his opponent's speech as bombastic rhetoric devoid of facts.",
    part_of_speech: 'adjective',
    synonyms: ['pompous', 'grandiloquent', 'ostentatious', 'turgid'],
    difficulty: 'Hard',
  },
  {
    word: 'Castigate',
    definition: 'To reprimand or criticize someone severely.',
    example_sentence: 'The judge castigated the defense counsel for repeatedly misleading the jury.',
    part_of_speech: 'verb',
    synonyms: ['reprimand', 'rebuke', 'admonish', 'censure'],
    difficulty: 'Hard',
  },
  {
    word: 'Chicanery',
    definition: 'The use of trickery or deception to achieve a political, legal, or financial goal.',
    example_sentence: 'The corporate executive was indicted after an audit uncovered financial chicanery.',
    part_of_speech: 'noun',
    synonyms: ['trickery', 'deception', 'subterfuge', 'duplicity'],
    difficulty: 'Hard',
  },
  {
    word: 'Cogent',
    definition: 'Clear, logical, and powerfully convincing.',
    example_sentence: 'She presented a cogent argument that persuaded even the most skeptical board members.',
    part_of_speech: 'adjective',
    synonyms: ['compelling', 'convincing', 'persuasive', 'lucid'],
    difficulty: 'Hard',
  },
  {
    word: 'Diatribe',
    definition: 'A forceful, bitter, and abusive verbal attack against someone or something.',
    example_sentence: 'The newspaper published a blistering diatribe against corrupt municipal spending.',
    part_of_speech: 'noun',
    synonyms: ['tirade', 'harangue', 'onslaught', 'polemic'],
    difficulty: 'Hard',
  },
  {
    word: 'Diffident',
    definition: 'Modest or shy because of a lack of self-confidence; hesitant.',
    example_sentence: 'Although diffident in large social gatherings, she was remarkably commanding on stage.',
    part_of_speech: 'adjective',
    synonyms: ['shy', 'hesitant', 'reticent', 'timid'],
    difficulty: 'Hard',
  },
  {
    word: 'Dissemble',
    definition: "To conceal one's true motives, feelings, or beliefs.",
    example_sentence: 'Unable to dissemble her disappointment, she let out a visible sigh.',
    part_of_speech: 'verb',
    synonyms: ['feign', 'conceal', 'disguise', 'camouflage'],
    difficulty: 'Hard',
  },
  {
    word: 'Dogmatic',
    definition: 'Inclined to lay down principles as incontrovertibly true without adequate evidence.',
    example_sentence: 'His dogmatic stance on economic policy prevented any constructive compromise.',
    part_of_speech: 'adjective',
    synonyms: ['inflexible', 'assertive', 'doctrinaire', 'uncompromising'],
    difficulty: 'Hard',
  },
  {
    word: 'Egregious',
    definition: 'Outstandingly and shockingly bad; glaringly terrible.',
    example_sentence: 'The software update contained an egregious error that locked users out of their data.',
    part_of_speech: 'adjective',
    synonyms: ['shocking', 'appalling', 'flagrant', 'abominable'],
    difficulty: 'Hard',
  },
  {
    word: 'Esoteric',
    definition: 'Intended for or likely to be understood by only a small number of people with specialized knowledge.',
    example_sentence: 'The seminar tackled esoteric nuances of quantum electrodynamics.',
    part_of_speech: 'adjective',
    synonyms: ['abstruse', 'obscure', 'arcane', 'recondite'],
    difficulty: 'Hard',
  },
  {
    word: 'Exacerbate',
    definition: 'To make a problem, bad situation, or negative feeling worse.',
    example_sentence: 'The rash public statement served only to exacerbate tensions between the rival factions.',
    part_of_speech: 'verb',
    synonyms: ['aggravate', 'worsen', 'inflame', 'intensify'],
    difficulty: 'Hard',
  },
  {
    word: 'Fervent',
    definition: 'Having or displaying a passionate, earnest intensity.',
    example_sentence: 'She possessed a fervent belief in the transformative power of public education.',
    part_of_speech: 'adjective',
    synonyms: ['passionate', 'ardent', 'zealous', 'vehement'],
    difficulty: 'Hard',
  },
  {
    word: 'Garrulous',
    definition: 'Excessively talkative, especially on trivial or unimportant matters.',
    example_sentence: 'The garrulous passenger next to me shared his entire life story during the train ride.',
    part_of_speech: 'adjective',
    synonyms: ['talkative', 'chatty', 'loquacious', 'verbose'],
    difficulty: 'Hard',
  },
  {
    word: 'Harangue',
    definition: 'A lengthy and aggressive lecture or speech.',
    example_sentence: 'The coach launched into a heated harangue at halftime over missed defensive rotations.',
    part_of_speech: 'noun',
    synonyms: ['tirade', 'diatribe', 'lecture', 'berating'],
    difficulty: 'Hard',
  },
  {
    word: 'Iconoclast',
    definition: 'A person who attacks cherished beliefs, orthodox traditions, or established institutions.',
    example_sentence: 'As an iconoclast in modern architecture, she rejected conventional geometric grids.',
    part_of_speech: 'noun',
    synonyms: ['rebel', 'dissenter', 'maverick', 'nonconformist'],
    difficulty: 'Hard',
  },
  {
    word: 'Idiosyncratic',
    definition: 'Relating to idiosyncrasy; peculiar, quirky, or distinctive to an individual.',
    example_sentence: "The director's idiosyncratic visual style made his films instantly recognizable.",
    part_of_speech: 'adjective',
    synonyms: ['peculiar', 'quirky', 'distinctive', 'eccentric'],
    difficulty: 'Hard',
  },
  {
    word: 'Impassive',
    definition: 'Not feeling or showing emotion; calm, unreadable, and composed.',
    example_sentence: 'The poker champion maintained an impassive expression throughout the high-stakes hand.',
    part_of_speech: 'adjective',
    synonyms: ['inexpressive', 'unemotional', 'stoic', 'blank'],
    difficulty: 'Hard',
  },
  {
    word: 'Imperious',
    definition: 'Assuming power or authority without justification; arrogant and domineering.',
    example_sentence: 'Her imperious tone antagonized the staff and eroded team morale.',
    part_of_speech: 'adjective',
    synonyms: ['domineering', 'commanding', 'authoritative', 'arrogant'],
    difficulty: 'Hard',
  },
  {
    word: 'Inimical',
    definition: 'Tending to obstruct or harm; unfriendly or hostile.',
    example_sentence: 'Such excessive regulation proved inimical to rapid innovation and economic growth.',
    part_of_speech: 'adjective',
    synonyms: ['harmful', 'detrimental', 'hostile', 'unfavorable'],
    difficulty: 'Hard',
  },
  {
    word: 'Insipid',
    definition: 'Lacking flavor, vigor, interest, or character; dull.',
    example_sentence: 'Critics panned the screenplay as an insipid rehash of familiar romance tropes.',
    part_of_speech: 'adjective',
    synonyms: ['bland', 'flavorless', 'uninspired', 'vapid'],
    difficulty: 'Hard',
  },
  {
    word: 'Intractable',
    definition: 'Hard to control, manage, or deal with; stubborn or obstinate.',
    example_sentence: 'The persistent budget deficit remained an intractable challenge for the administration.',
    part_of_speech: 'adjective',
    synonyms: ['unmanageable', 'stubborn', 'obstinate', 'unyielding'],
    difficulty: 'Hard',
  },
  {
    word: 'Irascible',
    definition: 'Having or showing a tendency to be easily and quickly angered.',
    example_sentence: 'The irascible professor had little tolerance for unprepared students.',
    part_of_speech: 'adjective',
    synonyms: ['temperamental', 'irritable', 'peevish', 'choleric'],
    difficulty: 'Hard',
  },
  {
    word: 'Malleable',
    definition: 'Easily influenced, pliable, or able to be shaped and adapted.',
    example_sentence: 'Young minds are remarkably malleable and open to absorbing new perspectives.',
    part_of_speech: 'adjective',
    synonyms: ['pliable', 'adaptable', 'impressionable', 'flexible'],
    difficulty: 'Hard',
  },
  {
    word: 'Mendacious',
    definition: 'Not telling the truth; habitually deceitful or dishonest.',
    example_sentence: "The politician's mendacious statements were quickly dismantled by fact-checkers.",
    part_of_speech: 'adjective',
    synonyms: ['dishonest', 'deceitful', 'untruthful', 'disingenuous'],
    difficulty: 'Hard',
  },
  {
    word: 'Mercurial',
    definition: 'Subject to sudden or unpredictable changes of mood, mind, or temper.',
    example_sentence: 'His mercurial temperament made working with him both exhilarating and exhausting.',
    part_of_speech: 'adjective',
    synonyms: ['volatile', 'capricious', 'erratic', 'temperamental'],
    difficulty: 'Hard',
  },
  {
    word: 'Meticulous',
    definition: 'Showing great attention to detail; very careful and precise.',
    example_sentence: "The museum curator's meticulous restoration returned the 17th-century painting to its original brilliance.",
    part_of_speech: 'adjective',
    synonyms: ['painstaking', 'scrupulous', 'exacting', 'precise'],
    difficulty: 'Hard',
  },
  {
    word: 'Munificent',
    definition: 'Exceedingly generous, lavish, or charitable.',
    example_sentence: 'The university library was named in honor of the alumnus who gave a munificent endowment.',
    part_of_speech: 'adjective',
    synonyms: ['generous', 'magnanimous', 'bountiful', 'philanthropic'],
    difficulty: 'Hard',
  },
  {
    word: 'Nefarious',
    definition: 'Wicked, villainous, or criminal in character.',
    example_sentence: 'The investigative reporters uncovered a nefarious scheme to manipulate electoral boundaries.',
    part_of_speech: 'adjective',
    synonyms: ['wicked', 'evil', 'villainous', 'iniquitous'],
    difficulty: 'Hard',
  },
  {
    word: 'Obdurate',
    definition: "Stubbornly refusing to change one's opinion, course of action, or mindset.",
    example_sentence: 'Despite hours of negotiations, the opposing delegation remained obdurate.',
    part_of_speech: 'adjective',
    synonyms: ['stubborn', 'unyielding', 'inflexible', 'intransigent'],
    difficulty: 'Hard',
  },
  {
    word: 'Onerous',
    definition: 'Involving an amount of effort and difficulty that is oppressively burdensome.',
    example_sentence: 'Filing compliance reports across twelve jurisdictions became an onerous burden for the small company.',
    part_of_speech: 'adjective',
    synonyms: ['burdensome', 'taxing', 'arduous', 'grueling'],
    difficulty: 'Hard',
  },
  {
    word: 'Pedantic',
    definition: 'Excessively concerned with minor rules, trivial details, or showing off academic learning.',
    example_sentence: 'His pedantic habit of correcting minor typos in chat messages annoyed his peers.',
    part_of_speech: 'adjective',
    synonyms: ['over-exacting', 'finicky', 'didactic', 'punctilious'],
    difficulty: 'Hard',
  },
  {
    word: 'Perfunctory',
    definition: 'Carried out with a minimum of effort, care, or enthusiasm; superficial.',
    example_sentence: 'He gave a perfunctory nod before quickly rushing past into his private office.',
    part_of_speech: 'adjective',
    synonyms: ['cursory', 'superficial', 'indifferent', 'mechanical'],
    difficulty: 'Hard',
  },
  {
    word: 'Polemical',
    definition: 'Relating to or involving strongly critical, passionate, and controversial disputation.',
    example_sentence: 'Her polemical essay ignited an intense debate across the academic department.',
    part_of_speech: 'adjective',
    synonyms: ['argumentative', 'disputatious', 'critical', 'controversial'],
    difficulty: 'Hard',
  },
  {
    word: 'Propensity',
    definition: 'An inclination or natural tendency to behave in a particular way.',
    example_sentence: 'He had a well-documented propensity to procrastinate until the final deadline.',
    part_of_speech: 'noun',
    synonyms: ['tendency', 'inclination', 'predisposition', 'penchant'],
    difficulty: 'Hard',
  },
  {
    word: 'Quixotic',
    definition: 'Exceedingly idealistic; unrealistic, visionary, and impractical.',
    example_sentence: 'Eliminating all bureaucratic paperwork within one week proved to be a quixotic quest.',
    part_of_speech: 'adjective',
    synonyms: ['idealistic', 'impractical', 'visionary', 'utopian'],
    difficulty: 'Hard',
  },
  {
    word: 'Redoubtable',
    definition: 'Formidable, especially as an opponent; inspiring fear or deep respect.',
    example_sentence: 'The defending chess grandmaster was a redoubtable competitor on any stage.',
    part_of_speech: 'adjective',
    synonyms: ['formidable', 'fearsome', 'intimidating', 'commanding'],
    difficulty: 'Hard',
  },
  {
    word: 'Reticent',
    definition: "Not revealing one's thoughts or feelings readily; reserved and taciturn.",
    example_sentence: 'She remained reticent about her past successes, preferring to let her present work speak.',
    part_of_speech: 'adjective',
    synonyms: ['reserved', 'withdrawn', 'introverted', 'taciturn'],
    difficulty: 'Hard',
  },
  {
    word: 'Salubrious',
    definition: 'Health-giving; favorable to or promoting health or well-being.',
    example_sentence: 'The fresh ocean breeze and moderate altitude created a remarkably salubrious climate.',
    part_of_speech: 'adjective',
    synonyms: ['healthy', 'beneficial', 'healthful', 'invigorating'],
    difficulty: 'Hard',
  },
  {
    word: 'Sedulous',
    definition: 'Showing dedication and diligence; persevering meticulously.',
    example_sentence: 'Through sedulous laboratory research, the team discovered a novel enzyme pathway.',
    part_of_speech: 'adjective',
    synonyms: ['diligent', 'assiduous', 'meticulous', 'persistent'],
    difficulty: 'Hard',
  },
  {
    word: 'Soporific',
    definition: 'Tending to induce drowsiness, calm, or sleep.',
    example_sentence: 'The monotonous tone of the lecture hall air conditioner had an unmistakably soporific effect.',
    part_of_speech: 'adjective',
    synonyms: ['sleep-inducing', 'somnolent', 'tranquilizing', 'sedative'],
    difficulty: 'Hard',
  },
  {
    word: 'Specious',
    definition: 'Superficially plausible, but actually wrong, deceptive, or misleading.',
    example_sentence: "The consultant's specious reasoning fell apart under rigorous quantitative scrutiny.",
    part_of_speech: 'adjective',
    synonyms: ['misleading', 'deceptive', 'fallacious', 'spurious'],
    difficulty: 'Hard',
  },
  {
    word: 'Supercilious',
    definition: 'Behaving or looking as though one thinks one is superior to others; disdainfully haughty.',
    example_sentence: 'The supercilious smile on his face signaled his utter contempt for our suggestions.',
    part_of_speech: 'adjective',
    synonyms: ['haughty', 'arrogant', 'disdainful', 'condescending'],
    difficulty: 'Hard',
  },
  {
    word: 'Taciturn',
    definition: 'Habitually silent or uncommunicative in speech; saying very little.',
    example_sentence: 'A taciturn man by disposition, he rarely spoke unless directly spoken to.',
    part_of_speech: 'adjective',
    synonyms: ['untalkative', 'reticent', 'reserved', 'quiet'],
    difficulty: 'Hard',
  },
  {
    word: 'Trenchant',
    definition: 'Vigorous, sharp, and incisive in expression or analytical style.',
    example_sentence: 'Her trenchant critique of the fiscal policy was cited by economists across the country.',
    part_of_speech: 'adjective',
    synonyms: ['incisive', 'penetrating', 'acute', 'sharp'],
    difficulty: 'Hard',
  },
  {
    word: 'Ubiquitous',
    definition: 'Present, appearing, or found everywhere simultaneously.',
    example_sentence: 'Smartphones have become ubiquitous fixtures of modern daily life.',
    part_of_speech: 'adjective',
    synonyms: ['omnipresent', 'everywhere', 'pervasive', 'universal'],
    difficulty: 'Hard',
  },
  {
    word: 'Vacillate',
    definition: 'To waver or alternate indecisively between different opinions or actions.',
    example_sentence: 'He continued to vacillate between accepting the job offer in Boston or remaining in New York.',
    part_of_speech: 'verb',
    synonyms: ['waver', 'dither', 'hesitate', 'oscillate'],
    difficulty: 'Hard',
  },
  {
    word: 'Venerate',
    definition: 'To regard someone or something with profound respect and reverence.',
    example_sentence: 'Generations of scholars venerate the philosopher for her pioneering work on ethics.',
    part_of_speech: 'verb',
    synonyms: ['revere', 'respect', 'honor', 'worship'],
    difficulty: 'Hard',
  },
  {
    word: 'Veracious',
    definition: 'Speaking or representing the truth; consistently honest and accurate.',
    example_sentence: 'The courtroom relies upon veracious witnesses to ensure justice is administered fairly.',
    part_of_speech: 'adjective',
    synonyms: ['truthful', 'honest', 'accurate', 'reliable'],
    difficulty: 'Hard',
  },
  {
    word: 'Voracious',
    definition: 'Having a very eager, devouring, or insatiable appetite for food or activity.',
    example_sentence: 'An intellectually voracious student, she read three full novels every single week.',
    part_of_speech: 'adjective',
    synonyms: ['insatiable', 'eager', 'avid', 'hungry'],
    difficulty: 'Hard',
  },
  {
    word: 'Zealous',
    definition: 'Having or showing fervent zeal, passionate devotion, and active enthusiasm.',
    example_sentence: 'The zealous environmental advocate organized community cleanups every weekend.',
    part_of_speech: 'adjective',
    synonyms: ['passionate', 'ardent', 'fervent', 'enthusiastic'],
    difficulty: 'Hard',
  },
]

/**
 * Returns the Gemini API Key available in the client runtime.
 */
function getClientGeminiApiKey() {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const key =
      import.meta.env.VITE_GEMINI_API_KEY ||
      import.meta.env.GEMINI_API_KEY ||
      ''
    if (key && !key.includes('your-gemini-api-key')) return key.trim()
  }
  if (typeof globalThis !== 'undefined' && globalThis.process?.env) {
    const key =
      globalThis.process.env.VITE_GEMINI_API_KEY ||
      globalThis.process.env.GEMINI_API_KEY ||
      ''
    if (key && !key.includes('your-gemini-api-key')) return key.trim()
  }
  return ''
}

/**
 * Robust JSON array extractor handling markdown fences, thought signatures, and text preamble.
 */
function extractJsonArray(text) {
  if (!text || typeof text !== 'string') return null
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  }
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0])
      if (Array.isArray(parsed)) return parsed
    } catch {
      // ignore
    }
  }
  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // ignore
  }
  return null
}

/**
 * Validates structured vocabulary words returned by Gemini or fallbacks.
 */
export function validateVocabResponse(rawList, count = 5) {
  if (!Array.isArray(rawList)) {
    return { valid: false, words: [], error: 'Response is not a valid JSON array' }
  }

  const validWords = []

  for (const item of rawList) {
    if (
      item &&
      typeof item === 'object' &&
      typeof item.word === 'string' &&
      item.word.trim().length > 0 &&
      typeof item.definition === 'string' &&
      item.definition.trim().length > 0
    ) {
      const word = item.word.trim()
      const definition = item.definition.trim()
      const example_sentence =
        typeof item.example_sentence === 'string' && item.example_sentence.trim().length > 0
          ? item.example_sentence.trim()
          : `The scholar noted the importance of understanding the word "${word}".`

      const part_of_speech =
        typeof item.part_of_speech === 'string' && item.part_of_speech.trim()
          ? item.part_of_speech.trim().toLowerCase()
          : 'noun'

      let synonyms = []
      if (Array.isArray(item.synonyms)) {
        synonyms = item.synonyms.map((s) => String(s).trim()).filter(Boolean)
      } else if (typeof item.synonyms === 'string') {
        synonyms = item.synonyms.split(',').map((s) => s.trim()).filter(Boolean)
      }
      if (synonyms.length === 0) {
        synonyms = ['scholarly', 'GRE']
      }

      const difficulty =
        typeof item.difficulty === 'string' && item.difficulty.trim()
          ? item.difficulty.trim()
          : 'Hard'

      validWords.push({
        word,
        definition,
        example_sentence,
        part_of_speech,
        synonyms,
        difficulty,
      })
    }
  }

  const targetCount = Math.max(1, count)
  return {
    valid: validWords.length >= targetCount,
    words: validWords.slice(0, targetCount),
    error:
      validWords.length < targetCount
        ? `Found only ${validWords.length} valid words (${targetCount} required)`
        : null,
  }
}

/**
 * Filters candidates against already known words and guarantees targetCount unique words.
 * Supplements from the rich curated pool if needed to ensure no duplication.
 */
function deduplicateAndSupplementWords(candidates, existingWordsList, targetCount) {
  const existingSet = new Set(
    existingWordsList.map((w) => String(w).trim().toLowerCase())
  )
  const result = []
  const seenInBatch = new Set()

  for (const item of candidates) {
    if (!item || !item.word) continue
    const norm = String(item.word).trim().toLowerCase()
    if (!existingSet.has(norm) && !seenInBatch.has(norm)) {
      seenInBatch.add(norm)
      result.push(item)
    }
  }

  // If any duplicate was filtered out, supplement with fresh curated GRE words not yet known
  if (result.length < targetCount) {
    for (const fallback of CURATED_GRE_FALLBACK_WORDS) {
      if (result.length >= targetCount) break
      const norm = fallback.word.trim().toLowerCase()
      if (!existingSet.has(norm) && !seenInBatch.has(norm)) {
        seenInBatch.add(norm)
        result.push(fallback)
      }
    }
  }

  return result.slice(0, targetCount)
}

/**
 * Direct client-side call to Google Generative Language API with retry for resilience.
 */
async function callDirectGemini(promptText, apiKey, targetCount) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.9,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text
        const parsed = extractJsonArray(candidateText)
        if (parsed && Array.isArray(parsed)) {
          const validation = validateVocabResponse(parsed, targetCount)
          if (validation.valid) return validation.words
        }
      } else if (response.status === 503 || response.status === 429) {
        // Transient server load: wait 600ms and retry
        await new Promise((r) => setTimeout(r, 600))
      }
    } catch {
      // Continue to next attempt or fallback
    }
  }
  return null
}

/**
 * Generates daily GRE vocabulary words via multi-tier architecture with gemini-3.6-flash.
 *
 * @param {Array<string>} existingWordsList List of words already in user's library
 * @param {number} count Number of words to generate
 * @returns {Promise<Array>} List of validated, 100% brand new word objects
 */
export async function generateDailyVocab(existingWordsList = [], count = 5) {
  const targetCount = Math.max(1, Number(count) || 5)
  const clientApiKey = getClientGeminiApiKey()

  // Clean and prepare blacklist of known words
  const cleanExisting = Array.from(
    new Set(
      existingWordsList
        .map((w) => String(w || '').trim())
        .filter((w) => w.length > 0)
    )
  )

  const excludedStr =
    cleanExisting.length > 0
      ? `CRITICAL EXCLUSION RULE: Absolutely DO NOT include, repeat, or recycle ANY of these already learned words: ${cleanExisting.join(', ')}.`
      : ''

  const randomSeed = Math.floor(Math.random() * 1000000)
  const promptText = `Generate exactly ${targetCount} advanced, high-yield GRE vocabulary words for a student preparing for the GRE exam.
Requirements:
- Words must be medium to high difficulty, non-trivial, and extremely relevant for the GRE.
- ${excludedStr}
- Provide concise, accurate definitions.
- Provide natural, contextual example sentences.
- Include part of speech (noun, adjective, verb, adverb) and 2-3 relevant synonyms.
- Every word must be brand new, distinct, and unique.
- Exploration Entropy Seed: ${Date.now()}-${randomSeed}.

Return ONLY a valid JSON array containing exactly ${targetCount} objects with keys:
"word", "definition", "example_sentence", "part_of_speech", "synonyms", "difficulty".`

  // 1. Primary backend: Supabase Edge Function 'generate-vocab'
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('generate-vocab', {
        body: {
          prompt: promptText,
          model: GEMINI_MODEL,
          existingWords: cleanExisting,
          count: targetCount,
          apiKey: clientApiKey,
        },
      })
      if (!error && data?.words) {
        const words = deduplicateAndSupplementWords(data.words, cleanExisting, targetCount)
        if (words.length >= targetCount) {
          return words
        }
      }
      if (error) {
        console.warn('[geminiVocabService] Supabase Edge Function notice:', error)
      }
    } catch (err) {
      console.warn('[geminiVocabService] Exception invoking generate-vocab Edge Function:', err)
    }
  }

  // 2. Dev environment local proxy fallback (when Vite dev server proxy is active)
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    try {
      const response = await fetch('/api/generate-vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          model: GEMINI_MODEL,
          existingWords: cleanExisting,
          count: targetCount,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const rawWords = data?.words || data
        if (Array.isArray(rawWords)) {
          const words = deduplicateAndSupplementWords(rawWords, cleanExisting, targetCount)
          if (words.length >= targetCount) {
            return words
          }
        }
      }
    } catch {
      // Dev proxy unavailable
    }
  }

  // 3. Direct Gemini API call (works in production & offline-recovery whenever internet & clientApiKey are present)
  if (clientApiKey) {
    try {
      const directWords = await callDirectGemini(promptText, clientApiKey, targetCount)
      if (directWords && directWords.length > 0) {
        const words = deduplicateAndSupplementWords(directWords, cleanExisting, targetCount)
        if (words.length >= targetCount) {
          return words
        }
      }
    } catch (err) {
      console.warn('[geminiVocabService] Direct Gemini API notice:', err)
    }
  }

  // 4. Fallback to Curated High-Yield GRE Pool (offline-capable, never blocks or fails user)
  const fallbackWords = deduplicateAndSupplementWords([], cleanExisting, targetCount)
  if (fallbackWords.length > 0) {
    return fallbackWords
  }

  throw new Error(
    'Unable to generate vocabulary words. Please check your internet connection or configure GEMINI_API_KEY.'
  )
}
