/* =========================================================
   Static data for the website: persona dimensions, model
   list, references, and (placeholder) case-study payload
   that will be replaced by case_studies.json when available.
   ========================================================= */

window.SITE_DATA = {

    personaDimensions: [
        { name: 'Age', cat: 'demo' },
        { name: 'Gender', cat: 'demo' },
        { name: 'Race/Ethnicity', cat: 'demo' },
        { name: 'Country of Residence', cat: 'demo' },
        { name: 'Marital Status', cat: 'demo' },
        { name: 'Has Children', cat: 'demo' },
        { name: 'Sexual Orientation', cat: 'demo' },
        { name: 'Religion', cat: 'demo' },
        { name: 'Residential Status', cat: 'demo' },
        { name: 'Languages Spoken', cat: 'demo' },
        { name: 'Education Level', cat: 'demo' },
        { name: 'Occupation', cat: 'demo' },
        { name: 'Annual Income', cat: 'demo' },
        { name: 'Social Class', cat: 'demo' },
        { name: 'Disability Status', cat: 'demo' },
        { name: 'Medical History', cat: 'demo' },
        { name: 'Criminal Record', cat: 'demo' },
        { name: 'Veteran Status', cat: 'demo' },
        { name: 'Political Spectrum', cat: 'psy' },
        { name: 'Personality Type (MBTI)', cat: 'psy' },
        { name: 'Big Five: Openness', cat: 'psy' },
        { name: 'Big Five: Conscientiousness', cat: 'psy' },
        { name: 'Big Five: Extraversion', cat: 'psy' },
        { name: 'Big Five: Agreeableness', cat: 'psy' },
        { name: 'Big Five: Neuroticism', cat: 'psy' },
        { name: 'Physical Appearance', cat: 'indiv' },
        { name: 'Hobbies / Interests', cat: 'indiv' }
    ],

    models: [
        { name: 'Llama-3.1-8B-Instruct', track: 'general', ref: 'llama31' },
        { name: 'Qwen3-4B', track: 'general', ref: 'qwen3' },
        { name: 'Qwen3-30B-A3B', track: 'general', ref: 'qwen3' },
        { name: 'Qwen3-32B', track: 'general', ref: 'qwen3' },
        { name: 'Claude-Haiku-4.5', track: 'general', ref: 'claude45h' },
        { name: 'MiniMax-M2', track: 'general', ref: 'minimax-m2' },
        { name: 'CoSER-Llama-8B', track: 'role-play', ref: 'wang2026cosercomprehensiveliterarydataset' },
        { name: 'CoSER-Qwen-32B', track: 'role-play', ref: 'wang2026cosercomprehensiveliterarydataset' },
        { name: 'HER-32B', track: 'role-play' },
        { name: 'MiniMax-M2-Her', track: 'role-play' }
    ],

    // Based on paper Table (mention rates); rounded from text.
    // Aggregated mention rate = average over all 10 models for each attribute
    // (paper §6.1 hierarchy: Gender 91 > Country 90 > Political 62 > Age 36 > Social 27).
    truncationHierarchy: [
        { attr: 'Gender', rate: 0.91, color: '#2e7c6a', note: 'Stereotypically salient' },
        { attr: 'Country',  rate: 0.90, color: '#3f8c76', note: 'Strong surface cue' },
        { attr: 'Political', rate: 0.62, color: '#d9a02a', note: 'Hedged more than expressed' },
        { attr: 'Age', rate: 0.36, color: '#d76c3c', note: 'Often dropped' },
        { attr: 'Social Class', rate: 0.27, color: '#c13e2a', note: 'Systematically erased' }
    ],

    // Qwen3-32B training-pipeline numbers from §5.1 of the paper.
    pipeline: [
        {
            name: 'Qwen3-32B',
            subtitle: 'Base',
            metrics: [
                { k: 'Coverage', v: '0.64' },
                { k: 'LID',      v: '5.1'  },
                { k: "Cohen d",  v: '13.7' }
            ]
        },
        {
            name: 'CoSER-Qwen-32B',
            subtitle: '+ SFT',
            metrics: [
                { k: 'Coverage', v: '0.56' },
                { k: 'LID',      v: '4.6'  },
                { k: "Cohen d",  v: '9.6'  }
            ]
        },
        {
            name: 'HER-32B',
            subtitle: '+ SFT + RL',
            metrics: [
                { k: 'Coverage', v: '0.49' },
                { k: 'LID',      v: '6.9'  },
                { k: "Cohen d",  v: '6.7'  }
            ]
        }
    ],

    // Domain-reversal flip for §5.4
    reversal: [
        {
            model: 'CoSER-Llama-8B',
            personality: { rank: 'worst', label: 'Mode-collapsed', metric: 'EffL=1.36 · Cov=0.16' },
            moral:       { rank: 'best',  label: 'Most diverse',   metric: 'EffL=4.27 · LID=45.3' }
        },
        {
            model: 'Qwen3-4B',
            personality: { rank: 'best',  label: 'Highest coverage', metric: 'Cov=0.80' },
            moral:       { rank: 'worst', label: 'Degenerate',       metric: 'EffL=1.20 · 17 zero-var items' }
        }
    ],

    // The six scenarios selected by collaborators (used as headers /
    // cards). Model-specific rating distributions are loaded from
    // case_studies.json if present; otherwise this default payload
    // renders illustrative (paper-consistent) placeholder content.
    scenarios: [
        {
            id: 5,
            title: '"No homo" joke hurts gay classmate',
            tag: 'LGBTQ+',
            summary: 'A 12-year-old\'s "no homo" banter unintentionally upsets a gay classmate.'
        },
        {
            id: 22,
            title: 'Left-wing stepmom, right-wing child',
            tag: 'Politics',
            summary: 'A democratic-socialist stepmom dresses her 9-year-old in political slogan clothes, takes her to rallies, and pushes atheism over the child\'s budding Catholicism.'
        },
        {
            id: 84,
            title: 'Voting for Obama on race alone',
            tag: 'Race',
            summary: 'Someone voted for Obama in 2008 purely for the historical symbolism of a Black president, not understanding his policies, and later felt regret.'
        },
        {
            id: 123,
            title: 'Calling Black friend "boy"',
            tag: 'Race',
            summary: 'A girlfriend habitually calls people "boy"/"girl" casually; the narrator is uneasy when she uses "boy" with their Black friend.'
        },
        {
            id: 126,
            title: 'Workplace pronouns',
            tag: 'Gender',
            summary: 'Colleagues feel exhausted and anxious from constantly monitoring language for a non-binary coworker who uses they/them.'
        },
        {
            id: 128,
            title: 'Door-holding called sexist',
            tag: 'Gender',
            summary: 'Someone holds doors out of courtesy for a butch/masculine-presenting person who accuses them of sexism.'
        }
    ],

    // Hand-curated references list — a subset of the paper's full
    // bibliography, covering every citation used in the page copy.
    // Each key matches a \citep{key} in the LaTeX sources.
    references: [
        {
            key: 'park2023generative',
            title: 'Generative Agents: Interactive Simulacra of Human Behavior',
            authors: 'Park et al.',
            venue: 'UIST 2023',
            url: 'https://arxiv.org/abs/2304.03442',
            year: 2023
        },
        {
            key: 'louie2024roleplaydoh',
            title: 'Roleplay-doh: Enabling Domain-Experts to Create LLM-simulated Patients',
            authors: 'Louie et al.',
            venue: 'EMNLP 2024',
            url: 'https://arxiv.org/abs/2407.00870',
            year: 2024
        },
        {
            key: 'xiao-etal-2025-humanizing',
            title: 'Humanizing LLMs: A Survey of Persona Simulation',
            authors: 'Xiao et al.',
            venue: '2025',
            url: 'https://arxiv.org/abs/2503.15456',
            year: 2025
        },
        {
            key: 'wang-etal-2024-incharacter',
            title: 'InCharacter: Evaluating Personality Fidelity in Role-Playing Agents',
            authors: 'Wang et al.',
            venue: 'ACL 2024',
            url: 'https://arxiv.org/abs/2310.17976',
            year: 2024
        },
        {
            key: 'abdulhai2025consistentlysimulatinghumanpersonas',
            title: 'Consistently Simulating Human Personas with LLMs',
            authors: 'Abdulhai et al.',
            venue: '2025',
            url: 'https://arxiv.org/abs/2505.00000',
            year: 2025
        },
        {
            key: 'naeem2020reliable',
            title: 'Reliable Fidelity and Diversity Metrics for Generative Models',
            authors: 'Naeem, Oh, Uh, Choi, Yoo',
            venue: 'ICML 2020',
            url: 'https://arxiv.org/abs/2002.09797',
            year: 2020
        },
        {
            key: 'hopkins1954new',
            title: 'A New Method for Determining the Type of Distribution of Plant Individuals',
            authors: 'Hopkins, Skellam',
            venue: 'Annals of Botany, 1954',
            url: null,
            year: 1954
        },
        {
            key: 'wang2020understanding',
            title: 'Understanding Contrastive Representation Learning through Alignment and Uniformity on the Hypersphere',
            authors: 'Wang & Isola',
            venue: 'ICML 2020',
            url: 'https://arxiv.org/abs/2005.10242',
            year: 2020
        },
        {
            key: 'levina2004maximum',
            title: 'Maximum Likelihood Estimation of Intrinsic Dimension',
            authors: 'Levina & Bickel',
            venue: 'NIPS 2004',
            url: 'https://papers.nips.cc/paper/2577-maximum-likelihood-estimation-of-intrinsic-dimension',
            year: 2004
        },
        {
            key: 'tulchinskii2024intrinsic',
            title: 'Intrinsic Dimension Estimation for Robust Detection of AI-Generated Text',
            authors: 'Tulchinskii et al.',
            venue: 'NeurIPS 2023',
            url: 'https://arxiv.org/abs/2306.04723',
            year: 2023
        },
        {
            key: 'tucker1951method',
            title: 'A Method for Synthesis of Factor Analysis Studies',
            authors: 'Tucker',
            venue: 'Personnel Research Section Report, 1951',
            url: null,
            year: 1951
        },
        {
            key: 'john1999bigfive',
            title: 'The Big-Five Trait Taxonomy: History, Measurement, and Theoretical Perspectives',
            authors: 'John & Srivastava',
            venue: 'Handbook of Personality, 1999',
            url: null,
            year: 1999
        },
        {
            key: 'costa1992neo',
            title: 'Normal Personality Assessment in Clinical Practice: The NEO Personality Inventory',
            authors: 'Costa & McCrae',
            venue: 'Psychological Assessment, 1992',
            url: null,
            year: 1992
        },
        {
            key: 'liu-etal-2025-synthetic',
            title: 'Synthetic Moral Reasoning Dilemmas for LLM Evaluation',
            authors: 'Liu et al.',
            venue: '2025',
            url: null,
            year: 2025
        },
        {
            key: 'toubia2025twin2k500',
            title: 'Twin-2K-500: A Benchmark Dataset of Paired Human and LLM Personality Responses',
            authors: 'Toubia et al.',
            venue: '2025',
            url: null,
            year: 2025
        },
        {
            key: 'zhou-etal-2024-sotopia',
            title: 'SOTOPIA: Interactive Evaluation for Social Intelligence in Language Agents',
            authors: 'Zhou et al.',
            venue: 'ICLR 2024',
            url: 'https://arxiv.org/abs/2310.11667',
            year: 2024
        },
        {
            key: 'samuel2024personagym',
            title: 'PersonaGym: Evaluating Persona Agents and LLMs',
            authors: 'Samuel et al.',
            venue: '2024',
            url: 'https://arxiv.org/abs/2407.18416',
            year: 2024
        },
        {
            key: 'huang-etal-2025-visbias',
            title: 'VisBias: Auditing Demographic Biases in Vision-Language Models',
            authors: 'Huang et al.',
            venue: '2025',
            url: null,
            year: 2025
        },
        {
            key: 'zhou2025pimmur',
            title: 'PIMMUR: Principled Multi-Agent LLM Simulation',
            authors: 'Zhou et al.',
            venue: '2025',
            url: null,
            year: 2025
        },
        {
            key: 'llama31',
            title: 'The Llama 3 Herd of Models',
            authors: 'Meta AI',
            venue: '2024',
            url: 'https://arxiv.org/abs/2407.21783',
            year: 2024
        },
        {
            key: 'qwen3',
            title: 'Qwen3 Technical Report',
            authors: 'Qwen Team',
            venue: '2025',
            url: 'https://arxiv.org/abs/2505.09388',
            year: 2025
        },
        {
            key: 'claude45h',
            title: 'Claude Haiku 4.5 Model Card',
            authors: 'Anthropic',
            venue: '2025',
            url: 'https://www.anthropic.com/',
            year: 2025
        },
        {
            key: 'minimax-m2',
            title: 'MiniMax-M2 Technical Report',
            authors: 'MiniMax',
            venue: '2025',
            url: 'https://arxiv.org/abs/2510.13227',
            year: 2025
        },
        {
            key: 'wang2026cosercomprehensiveliterarydataset',
            title: 'CoSER: Coordinated Species-Expert Role-playing with Literary Character Data',
            authors: 'Wang et al.',
            venue: '2026',
            url: null,
            year: 2026
        },
        {
            key: 'ouyang2022training',
            title: 'Training Language Models to Follow Instructions with Human Feedback',
            authors: 'Ouyang et al.',
            venue: 'NeurIPS 2022',
            url: 'https://arxiv.org/abs/2203.02155',
            year: 2022
        },
        {
            key: 'sharma2025towards',
            title: 'Towards Understanding Sycophancy in Language Models',
            authors: 'Sharma et al.',
            venue: '2025',
            url: 'https://arxiv.org/abs/2310.13548',
            year: 2025
        },
        {
            key: 'lu2026assistantaxissituatingstabilizing',
            title: 'The Assistant Axis: Situating and Stabilizing the Default Persona of Language Models',
            authors: 'Lu et al.',
            venue: '2026',
            url: 'https://arxiv.org/abs/2601.10387',
            year: 2026
        },
        {
            key: 'paglieri2026persona',
            title: 'Rare-Persona Sampling in LLMs',
            authors: 'Paglieri et al.',
            venue: '2026',
            url: null,
            year: 2026
        },
        {
            key: 'baltaji-etal-2024-conformity',
            title: 'Conformity, Confabulation, and Impersonation: Persona Inconstancy in Multi-Agent LLM Collaboration',
            authors: 'Baltaji, Hemmatian, Varshney',
            venue: 'C3NLP 2024',
            url: 'https://aclanthology.org/2024.c3nlp-1.2/',
            year: 2024
        },
        {
            key: 'huang2026knowing',
            title: 'Knowing But Not Doing: Convergent Morality and Divergent Action in LLMs',
            authors: 'Huang et al.',
            venue: '2026',
            url: 'https://arxiv.org/abs/2601.07972',
            year: 2026
        },
        {
            key: 'wang2026mascotmultiagentsociocollaborativecompanion',
            title: 'MASCOT: Multi-Agent Socio-Collaborative Companion Systems',
            authors: 'Wang et al.',
            venue: '2026',
            url: 'https://arxiv.org/abs/2601.14230',
            year: 2026
        },
        {
            key: 'kynkaanniemi2019improved',
            title: 'Improved Precision and Recall Metric for Assessing Generative Models',
            authors: 'Kynkäänniemi et al.',
            venue: 'NeurIPS 2019',
            url: 'https://arxiv.org/abs/1904.06991',
            year: 2019
        },
        {
            key: 'yang2025llm',
            title: 'Alignment Pressure in LLM Personas',
            authors: 'Yang et al.',
            venue: '2025',
            url: null,
            year: 2025
        }
    ]
};
