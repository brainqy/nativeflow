import { ConversationScenario, LanguageOption } from '../types';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    id: 'Indian English',
    name: 'Indian English',
    nativeName: 'Indian English (भारतीय अंग्रेज़ी)',
    flag: '🇮🇳',
    defaultDialects: ['Standard Indian English', 'Pan-Indian Professional', 'Urban Corporate Tech Accent', 'Bangalore/Hyderabad Tech Hub'],
  },
  {
    id: 'Hindi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    defaultDialects: ['Standard Modern Hindi (मानक हिन्दी)', 'Conversational Tech Hindi', 'Hinglish Corporate Blend'],
  },
  {
    id: 'English',
    name: 'English (UK / US)',
    nativeName: 'English',
    flag: '🇬🇧',
    defaultDialects: ['Received Pronunciation (British)', 'General American', 'Indian English Accent', 'Australian Native', 'Mid-Atlantic Academic'],
  },
  {
    id: 'Spanish',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    defaultDialects: ['Castilian (Madrid / Spain)', 'Mexican Culto', 'Argentine Rioplatense', 'Colombian Bogotano'],
  },
  {
    id: 'French',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    defaultDialects: ['Metropolitan French (Paris)', 'Swiss Romand', 'Québécois Soutenu'],
  },
  {
    id: 'German',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    defaultDialects: ['Hochdeutsch (Standard German)', 'Austrian Standard', 'Swiss Hochdeutsch'],
  },
  {
    id: 'Japanese',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    defaultDialects: ['Standard Tokyo Keigo/Informal Blend', 'Kansai-ben', 'Business Keigo'],
  },
  {
    id: 'Mandarin',
    name: 'Mandarin Chinese',
    nativeName: '普通话',
    flag: '🇨🇳',
    defaultDialects: ['Standard Beijing/Northern', 'Taiwanese Mandarin', 'Shanghai Urban Mandarin'],
  },
  {
    id: 'Italian',
    name: 'Italian',
    nativeName: 'Italiano',
    flag: '🇮🇹',
    defaultDialects: ['Standard Fiorentino/Romano', 'Milanese Business', 'Neapolitan Nuance'],
  },
  {
    id: 'Portuguese',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇵🇹',
    defaultDialects: ['European Portuguese (Lisbon)', 'Brazilian Portuguese (Paulistano)'],
  },
];

export const PRESET_SCENARIOS: ConversationScenario[] = [
  {
    id: 'indian-tech-architect-interview',
    title: 'UPI Rails & Distributed Architecture Staff Interview',
    targetLanguage: 'Indian English',
    cefrLevel: 'C1 Advanced',
    topicDomain: 'Fintech, Payment Rails & High-Scale Systems',
    context:
      'You are interviewing for a Staff / Principal Backend Architect role at a leading high-growth fintech firm. Your interviewer is a veteran Vice President of Engineering probing your ability to design sub-100ms UPI payment processing systems handling 50,000 transactions per second during national festive spikes.',
    learnerRole: 'Principal Distributed Systems Architect Candidate',
    aiPersona: {
      name: 'Rohan Deshmukh',
      role: 'VP of Engineering & Payment Platforms',
      tone: 'Sharp, technically rigorous, pragmatic, welcoming',
      preferredVoice: 'Fenrir',
      dialectAccent: 'Standard Indian English (Professional Tech Hub)',
    },
    starterMessage:
      'Good morning! Let’s get straight to the crux of the problem. When handling national festive flash sales on a UPI rail, downstream bank aggregators frequently introduce unpredictable 3-second latency spikes. How would you design an idempotent, resilient payment orchestrator that avoids double debits while maintaining a seamless user experience?',
    starterTranslation:
      'Good morning! Let’s get straight to the core of the problem. When handling high-traffic payment spikes on UPI rails, downstream banks can experience latency. How would you design an idempotent payment orchestrator that prevents double debits while maintaining great user experience?',
    targetLearningObjectives: [
      'Articulate distributed idempotency and distributed lock strategies',
      'Discuss two-phase commit vs Saga orchestration patterns for financial transactions',
      'Deploy clear Indian English professional discourse markers with crisp technical precision',
    ],
    keyNativeExpressions: [
      {
        phrase: 'crux of the problem',
        literalMeaning: 'The decisive or most important point at issue',
        contextualUsage: 'Executive phrase to focus directly on root architectural challenges.',
        cefrRating: 'C1',
      },
      {
        phrase: 'idempotent consumer pattern',
        literalMeaning: 'System where identical requests produce the same state without unintended side-effects',
        contextualUsage: 'Essential distributed transaction standard in payment processing.',
        cefrRating: 'C2',
      },
      {
        phrase: 'circuit breaker fallback',
        literalMeaning: 'Stopping cascading failures by failing fast during downstream degradation',
        contextualUsage: 'Microservice resilience pattern.',
        cefrRating: 'C1',
      },
    ],
    recommendedDiscourseMarkers: [
      'From an architectural standpoint...',
      'To circumvent cascading failures...',
      'Taking down-time resilience into account...',
    ],
  },
  {
    id: 'hindi-tech-product-strategy',
    title: 'भारतीय फिनटेक और डिजिटल उत्पाद रणनीति साक्षात्कार',
    targetLanguage: 'Hindi',
    cefrLevel: 'C1 Advanced',
    topicDomain: 'उत्पाद रणनीति, फिनटेक और तकनीकी नवाचार',
    context:
      'आप भारत के अग्रणी डिजिटल भुगतान और वित्तीय मंच के लिए सीनियर इंजीनियरिंग और उत्पाद प्रबंधक की भूमिका के लिए साक्षात्कार दे रहे हैं। साक्षात्कारकर्ता आपसे टियर-2 और टियर-3 शहरों में डिजिटल समावेशन और वित्तीय पहुंच को बढ़ाने की रणनीति पर तकनीकी सवाल पूछ रहा है।',
    learnerRole: 'वरिष्ठ तकनीकी उत्पाद प्रबंधक उम्मीदवार (Senior Technical PM)',
    aiPersona: {
      name: 'विक्रम शर्मा (Vikram Sharma)',
      role: 'निदेशक, उत्पाद और कोर प्लेटफॉर्म (Director of Product)',
      tone: 'सुलझा हुआ, विश्लेषणात्मक, विचारोत्तेजक और पेशेवर',
      preferredVoice: 'Fenrir',
      dialectAccent: 'मानक हिन्दी एवं कॉरपोरेट हिंग्लिश (Standard Hindi & Corporate Tech)',
    },
    starterMessage:
      'नमस्ते और स्वागत है! जब हम भारत के अगले 50 करोड़ उपयोगकर्ताओं (Next Billion Users) के लिए वित्तीय उत्पादों की बात करते हैं, तो भाषा और इंटरनेट कनेक्टिविटी सबसे बड़ी बाधाएं बन जाती हैं। आप कम बैंडविड्थ वाले क्षेत्रों में सुरक्षित और सरल यूपीआई भुगतान अनुभव कैसे तैयार करेंगे?',
    starterTranslation:
      'Hello and welcome! When we talk about financial products for the next 500 million users in India, language and connectivity become major bottlenecks. How would you design a secure, seamless payment experience in low-bandwidth areas?',
    targetLearningObjectives: [
      'Use sophisticated Hindi terminology for architectural and strategic trade-offs',
      'Articulate user-centric product principles in formal Hindi and Hinglish',
      'Demonstrate structured STAR reasoning in Hindi business dialogue',
    ],
    keyNativeExpressions: [
      {
        phrase: 'डिजिटल समावेशन (Digital Inclusion)',
        literalMeaning: 'Bringing all citizens into the digital economy',
        contextualUsage: 'Policy and product metric in Indian tech.',
        cefrRating: 'C1',
      },
      {
        phrase: 'सुलझा हुआ दृष्टिकोण (Balanced Perspective)',
        literalMeaning: 'Mature, well-thought-out approach',
        contextualUsage: 'Praising structured strategic thinking.',
        cefrRating: 'C1',
      },
      {
        phrase: 'दूरगामी प्रभाव (Far-reaching Impact)',
        literalMeaning: 'Long-term strategic consequence',
        contextualUsage: 'Assessing architectural sustainability.',
        cefrRating: 'C2',
      },
    ],
    recommendedDiscourseMarkers: [
      'मूल रूप से देखा जाए तो (Fundamentally speaking...)',
      'तकनीकी दृष्टिकोण से (From a technical standpoint...)',
      'दीर्घकालिक प्रभाव के संदर्भ में (In terms of long-term impact...)',
    ],
  },
  {
    id: 'ai-ethics-treaty',
    title: 'The Geneva AI Sovereignty & Cognitive Rights Summit',
    targetLanguage: 'English',
    cefrLevel: 'C1 Advanced',
    topicDomain: 'Geopolitics, Tech Policy & Ethics',
    context:
      'You represent a progressive democratic coalition advocating for strict multilateral treaties on autonomous algorithmic governance. Your interlocutor is a pragmatic chief negotiator representing a major tech-industrial sovereign state who favors market self-regulation.',
    learnerRole: 'Senior Delegate for Global Digital Rights',
    aiPersona: {
      name: 'Ambassador Julian Vance',
      role: 'Chief Negotiator for Tech-Industrial Alliance',
      tone: 'Eloquent, intellectually rigorous, strategically skeptical',
      preferredVoice: 'Fenrir',
      dialectAccent: 'British Received Pronunciation (Oxbridge Academic)',
    },
    starterMessage:
      'Look, I respect your delegation’s principled stance, but let’s not beat about the bush: enforceable moratoriums on frontier neural models will merely push cutting-edge research into opaque jurisdictions. Wouldn’t an agile, risk-tiered compliance framework serve both our ethical imperatives and competitive vitality far better?',
    starterTranslation:
      'Look, I respect your delegation’s principled stance, but let’s not beat around the bush: enforceable moratoriums on frontier neural models will merely push research to opaque jurisdictions. Wouldn’t an agile framework work better?',
    targetLearningObjectives: [
      'Employ high-register rhetorical rebuttals using conditional nuance (e.g., "Were we to acquiesce to...")',
      'Deploy concessive connectors (e.g., "Notwithstanding your apprehension...", "Be that as it may...")',
      'Articulate long-tail policy tradeoffs with precise vocabulary',
    ],
    keyNativeExpressions: [
      {
        phrase: 'beat about the bush',
        literalMeaning: 'Approach a subject indirectly',
        contextualUsage: 'Used in diplomatic parlance to pivot straight to core contentious issues.',
        cefrRating: 'C1',
      },
      {
        phrase: 'opaque jurisdictions',
        literalMeaning: 'Unregulated or shadowy legal territories',
        contextualUsage: 'Sophisticated geopolitical collocation regarding regulatory arbitrage.',
        cefrRating: 'C2',
      },
      {
        phrase: 'notwithstanding',
        literalMeaning: 'In spite of / despite',
        contextualUsage: 'High-register discourse connector used in formal argumentation.',
        cefrRating: 'C1',
      },
    ],
    recommendedDiscourseMarkers: [
      'To put it in perspective...',
      'That premise presupposes that...',
      'With all due deference to your viewpoint...',
    ],
  },
  {
    id: 'spanish-venture-valuation',
    title: 'Defensa de Valoración y Estrategia de Expansión en Madrid',
    targetLanguage: 'Spanish',
    cefrLevel: 'C1 Advanced',
    topicDomain: 'Finanzas, Capital de Riesgo y Estrategia',
    context:
      'Estás defendiendo la ronda Serie B de tu empresa de biotecnología ante un socio director escéptico de un fondo de capital de riesgo líder en Madrid. El socio cuestiona tus márgenes unitarios y los costes de adquisición de clientes en el mercado latinoamericano.',
    learnerRole: 'Consejero Delegado (CEO) y Fundador',
    aiPersona: {
      name: 'Don Rodrigo de la Serna',
      role: 'Socio Director de Fondo de Capital Riesgo',
      tone: 'Perspicaz, incisivo, analítico y directo',
      preferredVoice: 'Fenrir',
      dialectAccent: 'Español Peninsular Castizo / Financiero',
    },
    starterMessage:
      'A ver, vuestro crecimiento interanual es francamente llamativo, no te lo voy a negar. Sin embargo, si desgranamos el coste de adquisición por cohorte, me temo que estáis quemando pólvora en salvas con esa campaña de captación agresiva. ¿Cómo pretendéis blindar el margen bruto frente al embate de los gigantes consolidados?',
    starterTranslation:
      'Look, your year-over-year growth is frankly striking, I won’t deny it. However, if we break down customer acquisition cost by cohort, I fear you are wasting ammunition on minor targets. How do you plan to protect your gross margin against the onslaught of established giants?',
    targetLearningObjectives: [
      'Utilizar giros idiomáticos castizos en el registro corporativo de élite ("quemar pólvora en salvas", "desgranar", "blindar")',
      'Manejar el subjuntivo con valor concesivo ("por más que aleguéis...", "sea cual fuere...")',
      'Sostener una postura ejecutiva firme sin perder la cordialidad diplomática',
    ],
    keyNativeExpressions: [
      {
        phrase: 'quemar pólvora en salvas',
        literalMeaning: 'Disparar salvas sin bala; desperdiciar esfuerzos y recursos.',
        contextualUsage: 'Metáfora muy castiza y culta para indicar gasto inútil en negocios.',
        cefrRating: 'C1',
      },
      {
        phrase: 'desgranar las cifras',
        literalMeaning: 'Separar grano por grano; desglosar minuciosamente.',
        contextualUsage: 'Colocación habitual en análisis financiero y auditoría.',
        cefrRating: 'C2',
      },
      {
        phrase: 'hacer frente al embate',
        literalMeaning: 'Resistir el golpe o acometida feroz.',
        contextualUsage: 'Expresión de alto nivel para hablar de competencia feroz en el mercado.',
        cefrRating: 'C1',
      },
    ],
    recommendedDiscourseMarkers: [
      'Si me permites el matiz...',
      'Cabe subrayar que...',
      'Dista mucho de ser una casualidad...',
    ],
  },
  {
    id: 'french-art-critique',
    title: 'Débat Esthétique : La Restauration Patrimoniale et le Postmodernisme',
    targetLanguage: 'French',
    cefrLevel: 'C2 Mastery / Native Nuance',
    topicDomain: 'Critique d’Art, Architecture et Philosophie',
    context:
      'Dans un salon feutré du Quartier Latin à Paris, vous débattez de la reconstruction d’un monument historique ravagé. Vous défendez une greffe architecturale contemporaine et audacieuse, tandis que votre interlocutrice, conservatrice renommée, plaide pour une fidélité anastylotique intransigeante.',
    learnerRole: 'Architecte et Théoricien de l’Art Contemporain',
    aiPersona: {
      name: 'Éléonore de Saint-Germain',
      role: 'Conservatrice Générale du Patrimoine',
      tone: 'Érudite, incisive, passionnée, d’une élégance feutrée',
      preferredVoice: 'Kore',
      dialectAccent: 'Français métropolitain soigné (Parisien intellectuel)',
    },
    starterMessage:
      'Mon cher confrère, vouloir à tout prix imposer une verrière déconstructiviste sur un chef-d’œuvre du XIVe siècle relève, à mon sens, d’un nombrilisme architectural pour le moins déconcertant. Ne croyez-vous pas que le génie du lieu exige l’effacement de notre ego au profit d’une authenticité sans fard ?',
    starterTranslation:
      'My dear colleague, insisting at all costs on imposing a deconstructivist glass canopy onto a 14th-century masterpiece is, in my view, an architectural solipsism to say the least. Don’t you believe the genius of the place demands that we efface our ego in favor of unvarnished authenticity?',
    targetLearningObjectives: [
      'Maniement des nuances polémiques polies ("relève de...", "pour le moins...")',
      'Emploi de vocabulaire esthétique et philosophique de haute voltige ("sans fard", "génie du lieu", "nombrilisme")',
      'Formulation d’hypothèses oratoires au conditionnel et subjonctif imparfait',
    ],
    keyNativeExpressions: [
      {
        phrase: 'sans fard',
        literalMeaning: 'Without makeup / unvarnished, authentic',
        contextualUsage: 'Littéraire et recherché pour décrire une vérité ou une beauté brute.',
        cefrRating: 'C2',
      },
      {
        phrase: 'relever de',
        literalMeaning: 'To fall under the domain of / to pertain to',
        contextualUsage: 'Tournure élégante pour classifier une attitude ou un phénomène.',
        cefrRating: 'C1',
      },
      {
        phrase: 'pour le moins',
        literalMeaning: 'To say the least / at the very least',
        contextualUsage: 'Adverbe d’atténuation rhétorique typiquement français.',
        cefrRating: 'C1',
      },
    ],
    recommendedDiscourseMarkers: [
      'Il n’en demeure pas moins que...',
      'C’est précisément là que le bât blesse...',
      'Qu’on le veuille ou non...',
    ],
  },
  {
    id: 'german-philosophical-dilemma',
    title: 'Technologischer Determinismus und menschliche Autonomie',
    targetLanguage: 'German',
    cefrLevel: 'C1 Advanced',
    topicDomain: 'Philosophie, Kognitionswissenschaft & Gesellschaft',
    context:
      'Sie nehmen an einem hochkarätigen philosophischen Symposium an der Humboldt-Universität zu Berlin teil. Das Thema ist die Frage, ob prädiktive KI-Algorithmen das Konzept des freien Willens und der moralischen Zurechenbarkeit grundlegend aushöhlen.',
    learnerRole: 'Gastdozent für Erkenntnistheorie',
    aiPersona: {
      name: 'Prof. Dr. Maximilian von Weber',
      role: 'Ordinarius für Praktische Philosophie',
      tone: 'Sokratisch, präzise abwägend, profund gebildet',
      preferredVoice: 'Charon',
      dialectAccent: 'Bundesdeutsches Standarddeutsch (Akademischer Duktus)',
    },
    starterMessage:
      'Guten Abend, Herr Kollege. Wenn wir Kants kategorischen Imperativ im Lichte neuronaler Vorhersagemodelle neu beleuchten, drängt sich doch unweigerlich der Verdacht auf, dass unsere vermeintlich autonome Urteilskraft bloß ein retrospektives Konstrukt ist. Wie wollen Sie angesichts dieser empirischen Befunde an einer genuinen Schuldfähigkeit festhalten?',
    starterTranslation:
      'Good evening, colleague. If we re-examine Kant’s categorical imperative in light of neural predictive models, the suspicion inevitably arises that our supposedly autonomous judgment is merely a retrospective construct. In light of these empirical findings, how do you intend to maintain genuine moral accountability?',
    targetLearningObjectives: [
      'Verwendung komplexer Schachtelsätze mit passender Verbstellung',
      'Einsatz von Partizipialkonstruktionen und gehobenen Kollokationen ("sich aufdrängen", "festhalten an")',
      'Konstruktives Hinterfragen philosophischer Prämissen',
    ],
    keyNativeExpressions: [
      {
        phrase: 'sich der Verdacht aufdrängen',
        literalMeaning: 'The suspicion forces itself upon one',
        contextualUsage: 'Gehobene akademische Wendung zur Einführung einer provokanten These.',
        cefrRating: 'C1',
      },
      {
        phrase: 'im Lichte betrachten',
        literalMeaning: 'To examine in light of',
        contextualUsage: 'Klassische Kollokation für intellektuelle Neubewertungen.',
        cefrRating: 'C1',
      },
      {
        phrase: 'aushöhlen',
        literalMeaning: 'To hollow out / undermine gradually',
        contextualUsage: 'Prägnantes Verb für den schleichenden Verlust von Werten oder Prinzipien.',
        cefrRating: 'C2',
      },
    ],
    recommendedDiscourseMarkers: [
      'Man muss freilich einräumen, dass...',
      'Daraus folgt keineswegs zwangsläufig, dass...',
      'Unter dem Vorbehalt, dass...',
    ],
  },
  {
    id: 'japanese-business-negotiation',
    title: '伝統工芸とグローバルブランドの資本提携交渉 (Kyoto & Tokyo)',
    targetLanguage: 'Japanese',
    cefrLevel: 'C1 Advanced',
    topicDomain: 'ビジネス戦略、伝統文化、国際ブランド展開',
    context:
      'あなたは京都の老舗織物企業の若手専務として、欧州ラグジュアリーコングロマリットとの独占提携条件を巡り、東京の顧問弁護士兼エグゼクティブアドバイザーと最終協議を行っています。伝統的な職人技の尊厳と品質基準を守りつつ、世界展開のライセンス条項をまとめなければなりません。',
    learnerRole: '老舗織物企業 専務取締役',
    aiPersona: {
      name: '橘 慎之介 (Tachibana Shinnosuke)',
      role: 'グローバルM&A・ブランド戦略担当シニアディレクター',
      tone: '洗練された敬語、物腰柔らかだが本質を鋭く突く交渉術',
      preferredVoice: 'Puck',
      dialectAccent: '標準語・上級ビジネス敬語（京都のニュアンスも理解する洗練されたトーン）',
    },
    starterMessage:
      '御社のこれまでのご決断と、伝統に対する誇りには心より敬意を表しております。ただ率直に申し上げて、海外展開における品質検査の全権を現場の職人方に留保される形ですと、本国取締役会への説明責任を果たす上で些か懸念が残る次第です。双方にとって真に持続可能な落としどころを、どのように描いておられますでしょうか。',
    starterTranslation:
      'I have the deepest respect for your firm’s legacy and unwavering pride. However, frankly speaking, if full quality control is reserved exclusively to craftsmen, there remains slight apprehension regarding accountability to the European board. How do you envision a truly sustainable compromise?',
    targetLearningObjectives: [
      '高度なクッション言葉と婉曲表現（「些か懸念が残る次第」「落としどころ」）の習熟',
      'ビジネス場面での敬語（尊敬語・謙譲語・丁寧語）の自然な切り替え',
      '相手の立場を立てつつ自社の譲れない一線を論理的に主張する対話力',
    ],
    keyNativeExpressions: [
      {
        phrase: '落としどころ (Otoshidokoro)',
        phoneticOrPinyin: 'おとしどころ',
        literalMeaning: 'Landing spot',
        contextualUsage: '上級ビジネス日本語で「互いが納得できる妥協点・着地点」を指す最重要表現。',
        cefrRating: 'C1',
      },
      {
        phrase: '些か (Isasaka)',
        phoneticOrPinyin: 'いささか',
        literalMeaning: 'A little / slightly (formal)',
        contextualUsage: '否定的なニュアンスを角を立てずに伝えるための上品な副詞。',
        cefrRating: 'C1',
      },
      {
        phrase: '敬意を表する (Keii o hyousuru)',
        phoneticOrPinyin: 'けいいをひょうする',
        literalMeaning: 'To express respect',
        contextualUsage: '交渉の冒頭や対立点に入る前に相手を尊重する格式高い表現。',
        cefrRating: 'C1',
      },
    ],
    recommendedDiscourseMarkers: [
      'おっしゃる趣旨は重々承知しておりますが...',
      '弊社の立場といたしましては...',
      '俯瞰的に見れば...',
    ],
  },
];
