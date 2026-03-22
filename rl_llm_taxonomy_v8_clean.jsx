import { useState, useEffect } from "react";

const C = {
  purple: { bg: "#EEEDFE", t: "#3C3489", db: "#26215C", dt: "#CECBF6" },
  teal: { bg: "#E1F5EE", t: "#085041", db: "#085041", dt: "#9FE1CB" },
  amber: { bg: "#FAEEDA", t: "#633806", db: "#412402", dt: "#FAC775" },
  coral: { bg: "#FAECE7", t: "#993C1D", db: "#4A1B0C", dt: "#F0997B" },
  blue: { bg: "#E6F1FB", t: "#0C447C", db: "#042C53", dt: "#85B7EB" },
  pink: { bg: "#FBEAF0", t: "#72243E", db: "#4B1528", dt: "#ED93B1" },
  green: { bg: "#EAF3DE", t: "#27500A", db: "#173404", dt: "#C0DD97" },
  gray: { bg: "#F1EFE8", t: "#444441", db: "#2C2C2A", dt: "#B4B2A9" },
};
const GC = { A: "purple", "A-": "blue", "B+": "amber", B: "gray", C: "green" };

const DATA = [
  { id: "algo", title: "一、算法类", color: "purple", subs: [
    { id: "1.1", title: "1.1 主线 RL：PPO → GRPO → DAPO → GSPO → CISPO → MaxRL → DPPO", papers: [
      { y: 2017, n: "PPO", g: "C", l: "https://arxiv.org/abs/1707.06347", tip: "知道 ratio clipping + trust region 即可" },
      { y: 2022, n: "InstructGPT", g: "A-", l: "https://arxiv.org/abs/2203.02155", tip: "RM+PPO+KL; 与 3.1 共享" },
      { y: 2024, n: "RLOO / Revisiting REINFORCE", g: "A-", l: "https://arxiv.org/abs/2402.14740" },
      { y: 2024, n: "DeepSeekMath (GRPO 源头)", g: "A", l: "https://arxiv.org/abs/2402.03300", tip: "面试从这里往后讲" },
      { y: 2025, n: "DeepSeek-R1", g: "A", l: "https://arxiv.org/abs/2501.12948" },
      { y: 2025, n: "DAPO", g: "A", l: "https://arxiv.org/abs/2503.14476", tip: "recipe + system 规模化" },
      { y: 2025, n: "GSPO", g: "A-", l: "https://arxiv.org/abs/2507.18071" },
      { y: 2025, n: "SAPO", g: "B", l: "https://arxiv.org/abs/2511.20347" },
      { y: 2025, n: "MiniMax-M1 / CISPO", g: "A", l: "https://arxiv.org/abs/2506.13585", tip: "clip 对象改变是面试展开点" },
      { y: 2025, n: "PPO Collapse in Long-CoT", g: "B+", l: "https://arxiv.org/abs/2503.01491" },
      { y: 2025, n: "Dr. GRPO", g: "B+", l: "https://openreview.net/forum?id=5PAF7PAY2Y", isN: true, tip: "修复 length bias + std 归一化" },
      { y: 2026, n: "MaxRL", g: "A-", l: "https://arxiv.org/abs/2602.02710", isN: true, tip: "pass@k; RL 与 MLE 连续谱" },
      { y: 2026, n: "DPPO", g: "B+", l: "https://arxiv.org/abs/2602.04879", isN: true, tip: "TV/KL divergence trust region" },
    ] },
    { id: "1.2", title: "1.2 Scaling law / meta", papers: [
      { y: 2025, n: "ScaleRL / The Art of Scaling RL Compute", g: "A", l: "https://arxiv.org/abs/2510.13786" },
      { y: 2025, n: "Scaling Behaviors of LLM RL Post-Training", g: "B", l: "https://arxiv.org/abs/2509.25300", tip: "power-law: model scale x data x compute; 与 ScaleRL 互补" },
    ] },
    { id: "1.3", title: "1.3 Cascade / stage-wise RL + NVIDIA Nemotron", papers: [
      { y: 2025, n: "AceReason-Nemotron 1.1", g: "A", l: "https://arxiv.org/abs/2505.16400" },
      { y: 2025, n: "Nemotron-Cascade 1", g: "A-", l: "https://arxiv.org/abs/2512.13607", tip: "Cascade 2 的 foundational motivation" },
      { y: 2025, n: "GLM-4.5 (stage-wise ARC)", g: "B", l: "https://arxiv.org/abs/2508.06471" },
      { y: 2026, n: "Nemotron 3 Super Technical Report", g: "A-", l: "https://research.nvidia.com/labs/nemotron/files/NVIDIA-Nemotron-3-Super-Technical-Report.pdf", isN: true, tip: "LatentMoE + NVFP4 + multi-env simultaneous RL + reasoning budget control" },
      { y: 2026, n: "Nemotron-Cascade 2", g: "A", l: "https://arxiv.org/abs/2603.19220", isN: true, tip: "IMO/IOI/ICPC 金牌, 30B MoE, on-policy distillation" },
    ] },
    { id: "1.4", title: "1.4 Distillation (on-policy / self / context)", papers: [
      { y: 2025, n: "On-Policy Distillation (Thinking Machines blog)", g: "A-", l: "https://thinkingmachines.ai/blog/on-policy-distillation/", tip: "compute tradeoff 讲得最清楚的材料" },
      { y: 2026, n: "MiMo-V2-Flash", g: "A-", l: "https://arxiv.org/abs/2601.02780", tip: "多 teacher on-policy distill; Cascade 2 核心 trick" },
      { y: 2026, n: "Self-Distilled Reasoner", g: "B+", l: "https://arxiv.org/abs/2601.18734", tip: "teacher = 带 privileged info 的自己" },
      { y: 2026, n: "On-Policy Context Distillation", g: "B", l: "https://arxiv.org/abs/2602.12275" },
    ] },
  ] },

  { id: "rm", title: "二、奖励建模（RM / PRM / Rubrics / Judge）", color: "coral", subs: [
    { id: "2.1", title: "2.1 Generalist RM / 生成式 RM", papers: [
      { y: 2024, n: "Generative Verifiers: RM as Next-Token Prediction", g: "A", l: "https://arxiv.org/abs/2408.15240", isN: true, tip: "346 引用; GRM 源头; yes/no token + majority vote" },
      { y: 2025, n: "HelpSteer3-Preference", g: "A", l: "https://arxiv.org/abs/2505.11475", isN: true, tip: "40k samples; NVIDIA 最新; RM-Bench SOTA" },
      { y: 2025, n: "DeepSeek-GRM / SPCT", g: "A", l: "https://arxiv.org/abs/2504.02495", tip: "SPCT 在线 RL 训 GRM; 193 引用" },
      { y: 2025, n: "RM-R1: Reward Modeling as Reasoning", g: "A-", l: "https://arxiv.org/abs/2505.02387", isN: true, tip: "先推理再打分; 101 引用" },
      { y: 2026, n: "P-GenRM (ICLR 2026 Oral)", g: "A-", l: "https://arxiv.org/abs/2602.12116", tip: "personalized GRM; 和你 persona 研究直接对话" },
    ] },
    { id: "2.2", title: "2.2 Process Reward / Verifier (PRM)", papers: [
      { y: 2024, n: "PAV / Rewarding Progress", g: "A-", l: "https://openreview.net/forum?id=A6Y7AqlzLW", isN: true, tip: "ICLR; 225 引用; process reward = advantage" },
      { y: 2025, n: "ThinkPRM", g: "A-", l: "https://arxiv.org/abs/2504.00125", isN: true, tip: "长 CoT verifier; 58 引用" },
      { y: 2025, n: "GenPRM", g: "A-", l: "https://arxiv.org/abs/2504.15221", isN: true, tip: "PRM test-time 生成式推理; 21 引用" },
      { y: 2025, n: "ReasonFlux-PRM", g: "A-", l: "https://arxiv.org/abs/2501.07301", tip: "NeurIPS 2025 Spotlight" },
      { y: 2025, n: "R-PRM", g: "B+", l: "https://arxiv.org/abs/2503.06266" },
      { y: 2026, n: "PRISM", g: "B+", l: "https://arxiv.org/abs/2603.02479" },
    ] },
    { id: "2.3", title: "2.3 Rubrics-as-Rewards", papers: [
      { y: 2025, n: "Rubrics as Rewards (RaR)", g: "A-", l: "https://arxiv.org/abs/2503.11042", isN: true, tip: "111 引用; rubric 结构化主观偏好" },
      { y: 2025, n: "OpenRubrics", g: "B+", l: "https://arxiv.org/abs/2504.00831", isN: true },
      { y: 2026, n: "Rubric-ARM", g: "B+", l: "https://arxiv.org/abs/2602.01454", isN: true, tip: "交替优化 rubric generator + judge" },
    ] },
    { id: "2.4", title: "2.4 RM 评测", papers: [
      { y: 2024, n: "How to Evaluate RM for RLHF / PPE", g: "A-", l: "https://arxiv.org/abs/2410.14872", isN: true, tip: "61 引用; offline-online gap" },
      { y: 2024, n: "HelpSteer3 dataset", g: "B+", l: "https://arxiv.org/abs/2503.04378", isN: true, tip: "feedback + edit; inference-time scaling" },
      { y: 2025, n: "RewardBench 2", g: "B+", l: "https://arxiv.org/abs/2506.01937", isN: true, tip: "63 引用; reward hacking" },
      { y: 2025, n: "ToolRM + FC-RewardBench", g: "C", l: "https://arxiv.org/abs/2509.11347", isN: true },
      { y: 2026, n: "Long-form RewardBench", g: "C", l: "https://arxiv.org/abs/2603.12963", isN: true },
    ] },
  ] },

  { id: "rlhf", title: "三、RLHF / Preference Optimization", color: "pink", subs: [
    { id: "3.1", title: "3.1 Foundation", papers: [
      { y: 2022, n: "InstructGPT (与 1.1 共享)", g: "A-", l: "https://arxiv.org/abs/2203.02155" },
      { y: 2022, n: "Bai et al. / HH-RLHF", g: "B+", l: "https://arxiv.org/abs/2204.05862", isN: true, tip: "safety alignment; HH-RLHF 数据集" },
      { y: 2023, n: "DPO", g: "A-", l: "https://arxiv.org/abs/2305.18290", tip: "需要能解释为什么后来不够" },
    ] },
    { id: "3.2", title: "3.2 简化到极致 → 撞墙 → 回到 online → 完整闭环", papers: [
      { y: 2024, n: "SimPO", g: "B", l: "https://arxiv.org/abs/2405.14734", tip: "DPO 简化终点" },
      { y: 2024, n: "Online Iterative RLHF", g: "A-", l: "https://arxiv.org/abs/2405.07863", tip: "转折点: online >> offline DPO" },
      { y: 2025, n: "Asynchronous RLHF (ICLR 2025)", g: "B+", l: "https://openreview.net/forum?id=FhTAG591Ve" },
      { y: 2025, n: "OLMo 3 (SFT-DPO-RL-RL Zero)", g: "A", l: "https://arxiv.org/abs/2512.13961", isN: true, tip: "完全透明可复现; 所有数据/代码/checkpoint" },
    ] },
    { id: "3.3", title: "3.3 多轮 / Proactive / 社交 / 创意 RLHF", papers: [
      { y: 2025, n: "PPP: Proactive and Personalized Agents", g: "A-", l: "https://arxiv.org/abs/2511.02208", isN: true, tip: "三目标 RL; UserVille; 超 GPT-5" },
      { y: 2025, n: "RL from User Conversations", g: "A-", l: "https://arxiv.org/abs/2509.25137", isN: true, tip: "persona-conditioned rewards" },
      { y: 2025, n: "RLMR: Mixed Rewards for Creative Writing", g: "B", l: "https://arxiv.org/abs/2508.18642", isN: true, tip: "主观审美 RM + 客观约束 verifier" },
      { y: 2026, n: "HER: RL for Role-playing", g: "A-", l: "https://arxiv.org/abs/2601.21459", isN: true, tip: "dual-layer thinking; 和 InCharacter 直接对话" },
      { y: 2026, n: "OMAR (One Model All Roles)", g: "B", l: "https://arxiv.org/abs/2602.03109", isN: true },
      { y: 2026, n: "Social-R1", g: "C", l: "https://arxiv.org/abs/2603.09249", isN: true },
    ] },
  ] },

  { id: "sys", title: "四、系统类", color: "teal", subs: [
    { id: "4.1", title: "4.1 Sync vs Async", papers: [
      { y: 2025, n: "Magistral", g: "A", l: "https://arxiv.org/abs/2506.10910" },
      { y: 2025, n: "AReaL", g: "A-", l: "https://arxiv.org/abs/2505.24298" },
      { y: 2026, n: "StaleFlow", g: "B+", l: "https://arxiv.org/abs/2601.12784" },
      { y: 2026, n: "GAC", g: "B+", l: "https://arxiv.org/abs/2603.01501" },
      { y: 2025, n: "A-3PO", g: "B+", l: "https://arxiv.org/abs/2512.06547", tip: "decoupled PPO; 独立维度" },
      { y: 2025, n: "slime (SGLang RL blog)", g: "A-", l: "https://lmsys.org/blog/2025-07-09-slime/" },
    ] },
    { id: "4.2", title: "4.2 训推不一致 / RL 稳定性", papers: [
      { y: 2025, n: "Stabilizing RL with LLMs (理论统一)", g: "A-", l: "https://arxiv.org/abs/2512.01374", tip: "IS correction + Routing Replay 理论" },
      { y: 2025, n: "Give Me FP32 or Give Me Death", g: "A-", l: "https://arxiv.org/abs/2506.09501" },
      { y: 2025, n: "R3: MoE Routing Replay", g: "B+", l: "https://arxiv.org/abs/2510.11370", tip: "被 Stabilizing RL 从理论上解释" },
      { y: 2025, n: "Defeating Nondeterminism (TM blog)", g: "A-", l: "https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/" },
      { y: 2025, n: "SGLang Deterministic Inference", g: "A-", l: "https://lmsys.org/blog/2025-09-22-sglang-deterministic/" },
      { y: 2025, n: "FP16 Mismatch", g: "B+", l: "https://arxiv.org/abs/2510.26788", tip: "反直觉: train/infer 路径一致更重要" },
      { y: 2025, n: "TP Sizes Determinism", g: "C", l: "https://arxiv.org/abs/2511.17826" },
      { y: 2025, n: "Unified FP8 (SGLang blog)", g: "C", l: "https://lmsys.org/blog/2025-11-25-fp8-rl/" },
      { y: 2025, n: "DeepSeek-V3.2", g: "C", l: "https://arxiv.org/abs/2512.02556" },
    ] },
    { id: "4.3", title: "4.3 长文本 / 长上下文 RL", papers: [
      { y: 2025, n: "QwenLong-L1", g: "C", l: "https://arxiv.org/abs/2505.17667" },
      { y: 2025, n: "MiniMax-M1 (长链路视角)", g: "B", l: "https://arxiv.org/abs/2506.13585" },
      { y: 2025, n: "QwenLong-L1.5", g: "C", l: "https://arxiv.org/abs/2512.12967" },
    ] },
  ] },

  { id: "task", title: "五、数据 / Task 类", color: "amber", subs: [
    { id: "5.1", title: "5.1 Coding agent", papers: [
      { y: 2026, n: "Qwen3-Coder-Next", g: "A-", l: "https://arxiv.org/abs/2603.00729" },
      { y: 2026, n: "SWE-Master", g: "B+", l: "https://arxiv.org/abs/2602.03411" },
      { y: 2025, n: "Agent-RLVR", g: "C", l: "https://arxiv.org/abs/2506.11425" },
      { y: 2025, n: "Kimi-Dev", g: "C", l: "https://arxiv.org/abs/2509.23045" },
    ] },
    { id: "5.2", title: "5.2 Deep research / search agents", papers: [
      { y: 2025, n: "Search-R1", g: "A", l: "https://arxiv.org/abs/2503.09516", tip: "790 引用" },
      { y: 2025, n: "Tongyi DeepResearch", g: "A-", l: "https://arxiv.org/abs/2510.24701" },
      { y: 2026, n: "Yunque DeepResearch", g: "B+", l: "https://arxiv.org/abs/2601.19578" },
      { y: 2026, n: "How to Train DR Agent", g: "B+", l: "https://arxiv.org/abs/2602.19526" },
      { y: 2025, n: "Beyond Ten Turns", g: "B", l: "https://arxiv.org/abs/2508.07976" },
    ] },
    { id: "5.3", title: "5.3 Computer-use / GUI agent", papers: [
      { y: 2026, n: "OmegaUse", g: "B+", l: "https://arxiv.org/abs/2601.20380" },
      { y: 2026, n: "GUI-Libra", g: "B+", l: "https://arxiv.org/abs/2602.22190" },
      { y: 2025, n: "ComputerRL", g: "B+", l: "https://arxiv.org/abs/2508.14040" },
    ] },
    { id: "5.4", title: "5.4 Tool-use RL", papers: [
      { y: 2025, n: "ToolRL", g: "A", l: "https://arxiv.org/abs/2504.13958", isN: true, tip: "191 引用; reward design 教科书" },
      { y: 2025, n: "Nemotron-Tool-N1", g: "A", l: "https://arxiv.org/abs/2505.00949", isN: true, tip: "NVIDIA; 二值 reward; 面试必讲" },
      { y: 2025, n: "ReTool", g: "A-", l: "https://arxiv.org/abs/2504.09442", isN: true, tip: "231 引用; 冷启动合成 + outcome RL" },
    ] },
    { id: "5.5", title: "5.5 Generalist Agent RL 框架", papers: [
      { y: 2026, n: "RLAnything", g: "A-", l: "https://arxiv.org/abs/2602.02488", tip: "env+policy+RM 联合优化" },
      { y: 2025, n: "AGENTRL", g: "A-", l: "https://arxiv.org/abs/2510.04206", tip: "async + cross-policy sampling" },
      { y: 2025, n: "WebAgent-R1", g: "B+", l: "https://arxiv.org/abs/2505.16421", isN: true, tip: "73 引用; 端到端 web-agent RL" },
    ] },
    { id: "5.6", title: "5.6 Agent RL 的难点与自演化", papers: [
      { y: 2025, n: "RAGEN", g: "A", l: "https://arxiv.org/abs/2504.20073", isN: true, tip: "148 引用; Echo Trap; agent RL 为什么会坏" },
      { y: 2026, n: "iStar", g: "A-", l: "https://arxiv.org/abs/2601.15839", isN: true, tip: "ICLR 2026; 隐式 PRM for credit assignment" },
      { y: 2025, n: "AgentPRM", g: "B+", l: "https://arxiv.org/abs/2502.10325", isN: true, tip: "MC rollout actor-critic; 29 引用" },
      { y: 2025, n: "Absolute Zero", g: "A-", l: "https://arxiv.org/abs/2505.03335", isN: true, tip: "161 引用; 零数据自博弈" },
    ] },
  ] },
];

function useDark() {
  const [d, setD] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    setD(m.matches);
    const h = (e) => setD(e.matches);
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, []);
  return d;
}

function Badge({ g, dk }) {
  const c = C[GC[g]];
  if (!c) return null;
  return (
    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, fontWeight: 500, whiteSpace: "nowrap", background: dk ? c.db : c.bg, color: dk ? c.dt : c.t }}>
      {g}
    </span>
  );
}

function NewTag({ dk }) {
  const c = C.coral;
  return (
    <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 600, whiteSpace: "nowrap", letterSpacing: "0.03em", background: dk ? c.db : c.bg, color: dk ? c.dt : c.t }}>
      NEW
    </span>
  );
}

function Paper({ p, dk }) {
  const [h, setH] = useState(false);
  const nameEl = p.l ? (
    <a href={p.l} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none", borderBottom: h ? "1px solid " + (dk ? "#666" : "#ccc") : "none" }}>
      {p.n}
    </a>
  ) : p.n;

  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      display: "flex", alignItems: "baseline", gap: 6, padding: "4px 8px", borderRadius: 5,
      fontSize: 12.5, lineHeight: 1.55, cursor: "default",
      background: h ? (dk ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.025)") : "transparent",
      transition: "background 0.12s",
    }}>
      <span style={{ fontSize: 11, color: dk ? "#666" : "#aaa", minWidth: 30, fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono, monospace)" }}>
        {p.y}
      </span>
      <span style={{ flex: 1, color: dk ? "#ddd" : "#222" }}>
        {nameEl}
        {p.tip && h && (
          <span style={{ display: "block", fontSize: 11, marginTop: 1, color: dk ? "#999" : "#888", lineHeight: 1.4 }}>
            {p.tip}
          </span>
        )}
      </span>
      <span style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
        {p.isN && <NewTag dk={dk} />}
        <Badge g={p.g} dk={dk} />
      </span>
    </div>
  );
}

function Sub({ s, dk }) {
  const [o, setO] = useState(false);
  const nc = s.papers.filter((p) => p.isN).length;
  return (
    <div style={{ marginLeft: 12, borderLeft: "2px solid " + (dk ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"), paddingLeft: 12, marginBottom: 8 }}>
      <div onClick={() => setO(!o)} style={{
        display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500,
        cursor: "pointer", userSelect: "none", color: dk ? "#bbb" : "#555", padding: "3px 0",
      }}>
        <span style={{ fontSize: 9, transform: o ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.15s", color: dk ? "#666" : "#aaa" }}>
          {"▶"}
        </span>
        <span style={{ flex: 1 }}>{s.title}</span>
        <span style={{ fontSize: 11, color: dk ? "#555" : "#bbb", fontWeight: 400 }}>
          {s.papers.length}
          {nc > 0 && <span style={{ color: dk ? C.coral.dt : C.coral.t, marginLeft: 3 }}>+{nc}</span>}
        </span>
      </div>
      {o && (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 3 }}>
          {s.papers.map((p, i) => <Paper key={i} p={p} dk={dk} />)}
        </div>
      )}
    </div>
  );
}

function Cat({ c, dk }) {
  const [o, setO] = useState(true);
  const col = C[c.color];
  const tot = c.subs.reduce((s, sub) => s + sub.papers.length, 0);
  const nw = c.subs.reduce((s, sub) => s + sub.papers.filter((p) => p.isN).length, 0);
  return (
    <div style={{ marginBottom: 20 }}>
      <div onClick={() => setO(!o)} style={{
        display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
        borderRadius: 9, cursor: "pointer", userSelect: "none",
        background: dk ? col.db : col.bg,
      }}>
        <span style={{ fontSize: 16, fontWeight: 500, color: dk ? col.dt : col.t, flex: 1 }}>{c.title}</span>
        <span style={{ fontSize: 11.5, color: dk ? col.dt : col.t, opacity: 0.7 }}>
          {tot} 篇{nw > 0 && " (+" + nw + ")"}
        </span>
        <span style={{ fontSize: 10, transform: o ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", color: dk ? col.dt : col.t, opacity: 0.4 }}>
          {"▼"}
        </span>
      </div>
      {o && <div style={{ marginTop: 6 }}>{c.subs.map((s) => <Sub key={s.id} s={s} dk={dk} />)}</div>}
    </div>
  );
}

export default function App() {
  const dk = useDark();
  const all = DATA.flatMap((c) => c.subs.flatMap((s) => s.papers));
  const tot = all.length;
  const nw = all.filter((p) => p.isN).length;
  const ac = all.filter((p) => p.g === "A").length;
  const am = all.filter((p) => p.g === "A-").length;
  const yc = {};
  all.forEach((p) => { yc[p.y] = (yc[p.y] || 0) + 1; });

  return (
    <div style={{ fontFamily: "var(--font-sans, system-ui, sans-serif)", color: dk ? "#ddd" : "#222", maxWidth: 720, padding: "4px 0" }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14, fontSize: 11, color: dk ? "#aaa" : "#888", alignItems: "center" }}>
        {Object.entries(GC).map(([k]) => (
          <span key={k} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Badge g={k} dk={dk} />
            {k === "A" && "通读"}
            {k === "A-" && "方法+实验"}
            {k === "B+" && "问题+结论"}
            {k === "B" && "粗看"}
            {k === "C" && "核心思想"}
          </span>
        ))}
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <NewTag dk={dk} /> 本轮新增
        </span>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16, padding: "8px 12px", borderRadius: 9, background: dk ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", fontSize: 12, color: dk ? "#999" : "#888" }}>
        <span><strong style={{ color: dk ? "#eee" : "#333", fontWeight: 500 }}>{tot}</strong> 篇</span>
        <span><strong style={{ color: dk ? C.coral.dt : C.coral.t, fontWeight: 500 }}>+{nw}</strong> 新增</span>
        <span><strong style={{ color: dk ? C.purple.dt : C.purple.t, fontWeight: 500 }}>{ac}A + {am}A-</strong></span>
        <span style={{ flex: 1 }} />
        {Object.entries(yc).sort(([a], [b]) => Number(a) - Number(b)).map(([y, cnt]) => (
          <span key={y}>{y}:<strong style={{ fontWeight: 500 }}>{cnt}</strong></span>
        ))}
      </div>

      {DATA.map((c) => <Cat key={c.id} c={c} dk={dk} />)}

      <div style={{ marginTop: 16, padding: "8px 12px", borderRadius: 9, background: dk ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", fontSize: 11, color: dk ? "#777" : "#aaa", lineHeight: 1.6 }}>
        Hover 查看备注，点击论文名跳转原文。五大类 24 子方向。Updated 2026-03-22。
      </div>
    </div>
  );
}
