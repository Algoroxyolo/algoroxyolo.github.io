---
layout: about
title: about
permalink: /
subtitle: "Enterprise Agent Lead, <a href='https://abaka.ai'>Abaka AI</a>"

profile:
  align: right
  image: Yunze Xiao.jpg
  image_circular: true
  address: >
    <p>GHC 5418</p>
    <p>4902 Forbes Ave</p>
    <p>Pittsburgh, PA 15213</p>

news: true
selected_papers: true
social: true
open_to_work: False
otw_role: "Research Engineer / Applied Scientist — full-time, open to remote"
otw_pitch: >
  I recently graduated from CMU LTI (M.S., May 2026) and am looking for my next role. I work on
  the reliability of long-horizon multimodal agents — inducing failures under controlled
  conditions, mapping when and where they happen, and turning that map into training signal and
  human-steerable agent behavior. I'm most excited about teams working on agent evaluation,
  agent robustness, or human–agent interaction — but I'm open to the right problem. If that
  sounds like a fit, I'd love to talk.
---

I recently graduated from the [Language Technology Institute](https://lti.cmu.edu) at Carnegie Mellon University (M.S., May 2026), where I was advised by [Prof. Mona Diab](https://en.wikipedia.org/wiki/Mona_Diab). Concurrently, I work as Enterprise Agent Lead at [Abaka AI](https://abaka.ai) and as a Visiting Research Scientist at the [2077AI Foundation](https://2077.ai).

**Research.** My earlier work studied persona consistency and anthropomorphism in LLMs — how human-like traits like persona stability emerge and collapse over extended interaction. That work led me to a more fundamental question: when, where, and how do agents fail over long horizons? Today I study the real-world robustness of long-horizon multimodal agents. LLM-powered agents are entering consequential domains — commerce, personalized services, education — faster than we can characterize when they fail, and the existing literature is descriptive and post-hoc: failures get named only after traces are collected. I treat agent reliability as an experimental problem instead, across four connected directions:

**Measure — producing failure on demand.** Parameterized generators of long-horizon multimodal environments whose stressor axes are derived from documented real-world agent failures, paired with calibrated, controllable user simulators that maintain persistent state across sessions and communicate through text, images, and speech.

**Understand — mapping the failure surface.** Charting failure jointly over environment parameters and trajectory position: where failure incubates, how it compounds, and when recovery becomes impossible. Counterfactual rollouts recover temporal and modality-level attribution — grounding a multimodal failure taxonomy in causal evidence rather than annotation.

**Steer — turning the map into control.** Failure-surface-directed curriculum reinforcement learning with attribution-densified rewards, plus inference-time adaptation that makes caution, modality trust, and escalation behavior dialable without weight updates.

**Hand to humans — agent behavior as adjustable policy.** Direct-manipulation interfaces over agent policy parameters: counterfactual trajectory preview and failure-surface painting, so a human operator can adjust agent behavior rather than accept it as fixed.

---

**Industry.** At Abaka AI, I lead development of enterprise agent systems: agentic evaluation frameworks for open-ended multi-turn settings, end-to-end agent pipelines for heterogeneous business contexts (multi-model reasoning, privacy-preserving data synthesis, production infrastructure with FastAPI, gRPC, and Kafka), and human-in-the-loop and multi-agent coordination architectures — deployments that directly motivate the research above.

---

Previously I was advised by [Prof. Houda Bouamor](https://www.andrew.cmu.edu/user/hbouamor/) and [Prof. Kemal Oflazer](https://www.andrew.cmu.edu/user/ko/) at Carnegie Mellon University in Qatar.

Feel free to reach out — [yunzex@alumni.cmu.edu](mailto:yunzex@alumni.cmu.edu) or [@LrzNeedResearch](https://x.com/LrzNeedResearch).
