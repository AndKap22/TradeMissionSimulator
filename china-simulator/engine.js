export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}
export function applyDelta(target, delta = {}, limits = {}) {
  for (const [key, value] of Object.entries(delta)) {
    const [min, max] = limits[key] || [-Infinity, Infinity];
    target[key] = clamp((target[key] ?? 0) + value, min, max);
  }
}

function metricLimits(state) {
  return Object.fromEntries(Object.keys(state.metrics).map((key) => [key, [0, 100]]));
}

function resourceLimits() {
  return {
    budget: [-5000, 15000],
    days: [-30, 180],
    team: [0, 60],
    exposure: [0, 100],
  };
}

const rationaleSignals = [
  {
    id: "fact",
    label: "Опора на факт",
    pattern: /(документ|договор|выписк|сч[её]т|письм|данн|протокол|журнал|реестр|провер|подтверж|образц|расч[её]т|услови)/i,
  },
  {
    id: "risk",
    label: "Назван риск",
    pattern: /(риск|если|иначе|может|срыв|потер|задерж|отказ|несовпад|наруш|не подтверд|неизвест|неясн)/i,
  },
  {
    id: "action",
    label: "Есть действие",
    pattern: /(запрос|свер|провер|соглас|закреп|огранич|получ|подпис|измер|уточн|останов|назнач|провед)/i,
  },
  {
    id: "owner",
    label: "Есть ответственный или срок",
    pattern: /(до\s|в течение|дн|срок|ответствен|юрист|банк|партн[её]р|команд|служб|директор|лаборатор|хранител|брокер|перевозчик|импорт[её]р)/i,
  },
];

export function evaluateRationale(text = "") {
  const clean = String(text).trim().replace(/\s+/g, " ");
  const signals = rationaleSignals.map((signal) => ({
    id: signal.id,
    label: signal.label,
    met: signal.pattern.test(clean),
  }));
  const score = signals.filter((signal) => signal.met).length;
  return {
    text: clean,
    length: clean.length,
    score,
    maxScore: rationaleSignals.length,
    signals,
    ready: clean.length >= 35 && score >= 2,
  };
}

export function queueEvents(state, events = []) {
  for (const event of events) {
    if (!state.pendingEvents.some((item) => item.id === event.id) &&
        !state.appliedEvents.some((item) => item.id === event.id)) {
      state.pendingEvents.push(structuredClone(event));
    }
  }
}

export function applyDueEvents(state, sceneId) {
  const due = state.pendingEvents.filter((event) => event.at === sceneId);
  for (const event of due) {
    applyDelta(state.metrics, event.impact, metricLimits(state));
    applyDelta(state.resources, event.resources, resourceLimits());
    state.appliedEvents.push({ ...event, appliedAt: sceneId });
  }
  state.pendingEvents = state.pendingEvents.filter((event) => event.at !== sceneId);
  return due;
}

function conditionMatches(condition = {}, state) {
  if (condition.flag) {
    const value = state.flags[condition.flag];
    if ("equals" in condition && value !== condition.equals) return false;
    if ("gte" in condition && Number(value ?? -Infinity) < condition.gte) return false;
    if ("lte" in condition && Number(value ?? Infinity) > condition.lte) return false;
  }
  return true;
}

export function applyScenarioEvents(scenario, state, sceneId) {
  const due = [];
  const variation = (scenario.variations || []).find((item) => item.id === state.variationId);
  if (variation?.at === sceneId && !state.appliedEvents.some((event) => event.id === variation.id)) {
    const event = structuredClone(variation);
    applyDelta(state.metrics, event.impact, metricLimits(state));
    applyDelta(state.resources, event.resources, resourceLimits());
    state.appliedEvents.push({ ...event, appliedAt: sceneId, source: "variation" });
    due.push(event);
  }
  for (const twist of scenario.twists || []) {
    if (twist.at !== sceneId || state.appliedEvents.some((event) => event.id === twist.id)) continue;
    const variant = twist.variants.find((item) => !item.default && conditionMatches(item.when, state))
      || twist.variants.find((item) => item.default);
    if (!variant) continue;
    const event = { ...structuredClone(variant), id: twist.id, at: sceneId };
    delete event.when;
    delete event.default;
    applyDelta(state.metrics, event.impact, metricLimits(state));
    applyDelta(state.resources, event.resources, resourceLimits());
    state.appliedEvents.push({ ...event, appliedAt: sceneId, source: "scenario" });
    due.push(event);
  }
  return due;
}

export function applyPreparationAction(state, scene, action, clue) {
  state.preparationActions ||= [];
  if ((state.actionTokens ?? 0) <= 0) return null;
  if (state.preparationActions.some((item) => item.sceneId === scene.id)) return null;

  applyDelta(state.metrics, action.impact, metricLimits(state));
  applyDelta(state.resources, action.resources, resourceLimits());
  state.actionTokens -= 1;
  const record = {
    id: `${scene.id}-${action.id}`,
    sceneId: scene.id,
    sceneTitle: scene.title,
    actionId: action.id,
    actionTitle: action.title,
    clue,
    impact: action.impact || {},
    resources: action.resources || {},
  };
  state.preparationActions.push(record);
  return record;
}

function commit(state, scene, decision) {
  const rationaleReview = evaluateRationale(decision.rationale);
  state.decisions.push({
    sceneId: scene.id,
    sceneTitle: scene.title,
    ...decision,
    rationale: decision.rationale.trim(),
    rationaleReview,
  });
  return state.decisions.at(-1);
}

export function applyChoice(state, scene, choice, rationale) {
  applyDelta(state.metrics, choice.impact, metricLimits(state));
  applyDelta(state.resources, choice.resources, resourceLimits());
  Object.assign(state.flags, choice.set || {});
  queueEvents(state, choice.events);
  return commit(state, scene, {
    kind: "choice",
    choiceId: choice.id,
    choiceTitle: choice.title,
    resultTitle: choice.resultTitle,
    result: choice.result,
    tradeoff: choice.tradeoff,
    impact: choice.impact || {},
    resources: choice.resources || {},
    rationale,
  });
}

export function evaluateDossier(scene, selectedIds) {
  const selected = new Set(selectedIds);
  const selectedFacts = scene.facts.filter((fact) => selected.has(fact.id));
  const spent = selectedFacts.reduce((sum, fact) => sum + fact.cost, 0);
  const risks = scene.facts.filter((fact) => fact.risk);
  const found = risks.filter((fact) => selected.has(fact.id));
  const missed = risks.filter((fact) => !selected.has(fact.id));
  const falsePositives = scene.facts.filter((fact) => !fact.risk && selected.has(fact.id));
  return {
    valid: spent === scene.investigationBudget,
    spent,
    remaining: scene.investigationBudget - spent,
    selectedFacts,
    score: found.length,
    found,
    missed,
    falsePositives,
    impact: {
      control: found.length * 5 - missed.length * 5,
      trust: found.length * 2 - falsePositives.length,
      speed: falsePositives.length * -2,
    },
  };
}

export function commitDossier(state, scene, selectedIds, rationale) {
  const evaluation = evaluateDossier(scene, selectedIds);
  if (!evaluation.valid) return null;
  applyDelta(state.metrics, evaluation.impact, metricLimits(state));
  const reviewDays = Math.max(1, Math.ceil(evaluation.spent / 2));
  applyDelta(state.resources, { days: -reviewDays }, resourceLimits());
  state.flags.dossierScore = evaluation.score;
  state.flags.dossierSpend = evaluation.spent;
  return commit(state, scene, {
    kind: "dossier",
    choiceId: "dossier-check",
    choiceTitle: `Найдено важных проблем: ${evaluation.score} из 3`,
    resultTitle: evaluation.score === 3 ? "Все важные проблемы найдены" : evaluation.score === 2 ? "Одна важная проблема пропущена" : "Вы проверили не самые важные факты",
    result: evaluation.missed.length
      ? `Пропущено: ${evaluation.missed.map((item) => item.title).join(", ")}.`
      : "Вы нашли все три проблемы, которые могли изменить решение о запуске.",
    tradeoff: evaluation.falsePositives.length
      ? `Часть средств потрачена на факты, которые уже были подтверждены: ${evaluation.falsePositives.map((item) => item.title).join(", ")}.`
      : "Средства на юридическую проверку использованы по назначению.",
    impact: evaluation.impact,
    resources: { days: -reviewDays },
    selectedIds: [...selectedIds],
    findings: evaluation.selectedFacts.map((fact) => ({ title: fact.title, finding: fact.finding || fact.text, risk: fact.risk })),
    rationale,
  });
}

export function evaluateBudget(scene, allocations) {
  const total = Object.values(allocations).reduce((sum, value) => sum + Number(value || 0), 0);
  const impact = { speed: 0, trust: 0, control: 0, economy: 0 };
  const gaps = [];

  for (const bucket of scene.buckets) {
    const value = Number(allocations[bucket.id] || 0);
    const gap = value - bucket.ideal;
    impact[bucket.metric] += gap >= 0 ? Math.min(6, 2 + gap) : gap * 4;
    if (gap < 0) gaps.push(bucket.title);
  }

  if (total !== 10) return { valid: false, total, impact, gaps };
  impact.economy += gaps.length === 0 ? 4 : 0;
  return { valid: true, total, impact, gaps };
}

export function commitBudget(state, scene, allocations, rationale, unit) {
  const evaluation = evaluateBudget(scene, allocations);
  if (!evaluation.valid) return null;
  applyDelta(state.metrics, evaluation.impact, metricLimits(state));
  state.flags.budgetAllocation = { ...allocations };
  state.flags.budgetGaps = [...evaluation.gaps];
  const spend = evaluation.total * unit;
  state.resources.budget = clamp(state.resources.budget - spend, -5000, 15000);
  return commit(state, scene, {
    kind: "budget",
    choiceId: "budget-allocation",
    choiceTitle: scene.buckets.map((bucket) => `${bucket.title}: ${allocations[bucket.id]}`).join(" · "),
    resultTitle: evaluation.gaps.length ? "На важные задачи выделено недостаточно денег" : "Все важные задачи получили необходимый бюджет",
    result: evaluation.gaps.length
      ? `Недостаточно профинансированы: ${evaluation.gaps.join(", ")}. Это повлияет на итоговую оценку.`
      : "На каждую важную задачу выделена достаточная сумма.",
    tradeoff: "Недостаток денег на одном этапе повышает вероятность дополнительных расходов позже.",
    impact: evaluation.impact,
    allocations: { ...allocations },
    resources: { budget: -spend },
    rationale,
  });
}

export function evaluateMechanic(scene, selections) {
  const options = [];
  for (const field of scene.fields) {
    const selected = field.options.find((option) => option.id === selections[field.id]);
    if (!selected) return null;
    options.push({ field, option: selected });
  }

  const impact = {};
  const resources = {};
  let score = 0;
  for (const { option } of options) {
    score += option.score || 0;
    for (const [key, value] of Object.entries(option.impact || {})) impact[key] = (impact[key] || 0) + value;
    for (const [key, value] of Object.entries(option.resources || {})) resources[key] = (resources[key] || 0) + value;
  }

  return { score, maxScore: scene.fields.length * 2, impact, resources, options };
}

export function commitMechanic(state, scene, selections, rationale) {
  const evaluation = evaluateMechanic(scene, selections);
  if (!evaluation) return null;
  applyDelta(state.metrics, evaluation.impact, metricLimits(state));
  applyDelta(state.resources, evaluation.resources, resourceLimits());
  state.flags.mechanicScore = evaluation.score;
  state.flags.mechanicSelections = { ...selections };

  const strong = evaluation.score >= evaluation.maxScore - 1;
  const weak = evaluation.score <= Math.floor(evaluation.maxScore / 2);
  return commit(state, scene, {
    kind: "mechanic",
    choiceId: "product-mechanic",
    choiceTitle: evaluation.options.map(({ field, option }) => `${field.title}: ${option.title}`).join(" · "),
    resultTitle: strong ? "Условия можно проверить" : weak ? "В решении остались серьёзные пробелы" : "Решение можно использовать после уточнений",
    result: strong
      ? "Все три условия согласуются между собой: стороны понимают критерии, документы и свою ответственность."
      : "Выбранные условия по отдельности выглядят удобными, но вместе оставляют важный вопрос без ответа.",
    tradeoff: "Этот выбор повлиял на расходы, итоговую оценку и рекомендации.",
    impact: evaluation.impact,
    resources: evaluation.resources,
    selections: { ...selections },
    mechanicScore: evaluation.score,
    rationale,
  });
}

export function evaluateTerms(scene, selections) {
  const options = [];
  for (const field of scene.fields) {
    const selected = field.options.find((option) => option.id === selections[field.id]);
    if (!selected) return null;
    options.push({ field, option: selected });
  }

  const impact = {};
  const resources = {};
  let score = 0;
  for (const { option } of options) {
    score += option.score || 0;
    for (const [key, value] of Object.entries(option.impact || {})) impact[key] = (impact[key] || 0) + value;
    for (const [key, value] of Object.entries(option.resources || {})) resources[key] = (resources[key] || 0) + value;
  }
  const weak = options.filter(({ option }) => (option.score || 0) < 2);
  return { score, maxScore: scene.fields.length * 2, impact, resources, options, weak };
}

export function commitTerms(state, scene, selections, rationale) {
  const evaluation = evaluateTerms(scene, selections);
  if (!evaluation) return null;
  applyDelta(state.metrics, evaluation.impact, metricLimits(state));
  applyDelta(state.resources, evaluation.resources, resourceLimits());
  state.flags.termsScore = evaluation.score;
  state.flags.termSelections = { ...selections };
  const strong = evaluation.score >= evaluation.maxScore - 1;
  const weakTitles = evaluation.weak.map(({ field }) => field.title);

  return commit(state, scene, {
    kind: "terms",
    choiceId: "negotiated-terms",
    choiceTitle: evaluation.options.map(({ field, option }) => `${field.title}: ${option.title}`).join(" · "),
    resultTitle: strong ? "Встречное предложение можно принять" : "В условиях остались спорные места",
    result: strong
      ? "Вы сохранили проверяемые условия сделки и дали партнёру ограниченные уступки."
      : `Нужно вернуться к переговорам по следующим вопросам: ${weakTitles.join(", ")}.`,
    tradeoff: strong
      ? "Более точные условия требуют времени на согласование, но уменьшают риск спора после запуска."
      : "Быстрое согласие ускоряет подписание, но переносит спор на приёмку, оплату или масштабирование.",
    impact: evaluation.impact,
    resources: evaluation.resources,
    selections: { ...selections },
    termsScore: evaluation.score,
    findings: evaluation.options.map(({ field, option }) => ({
      title: field.title,
      finding: option.title,
      risk: (option.score || 0) < 2,
    })),
    rationale,
  });
}

export function calculateEconomics(scenario, state) {
  const config = scenario.economics;
  const deal = state.flags.deal;
  const multiplier = config.dealMultipliers[deal] || 1;
  const revenue = Math.round(config.baseRevenue * multiplier);
  const fulfillment = Math.round(config.fulfillment * multiplier);
  const channelFactor = deal === "direct" ? config.directChannelFactor : multiplier;
  const channel = Math.round(config.channel * channelFactor);
  const launch = Math.round(scenario.budgetTotal || 0);
  const dossierReserve = Math.max(0, 3 - (state.flags.dossierScore || 0)) * 480;
  const mechanicReserve = Math.max(0, 6 - (state.flags.mechanicScore || 0)) * 320;
  const termsReserve = Math.max(0, 8 - (state.flags.termsScore || 0)) * 180;
  const paymentReserve = {
    "third-party": 1200,
    "sell-through": 900,
    accuracy: 850,
    subscription: 1100,
  }[state.flags.payment] || 0;
  const exposureReserve = Math.round(state.resources.exposure * 12);
  const overrun = Math.max(0, -state.resources.budget);
  const riskReserve = dossierReserve + mechanicReserve + termsReserve + paymentReserve + exposureReserve;
  const costs = fulfillment + channel + launch + riskReserve + overrun;
  const contribution = revenue - costs;
  const margin = revenue ? Math.round((contribution / revenue) * 1000) / 10 : 0;

  return {
    label: config.label,
    revenue,
    lines: [
      { id: "fulfillment", label: "Производство и исполнение", value: fulfillment },
      { id: "launch", label: "Программа выхода", value: launch },
      { id: "channel", label: "Канал и поддержка", value: channel },
      { id: "risk", label: "Резерв выявленных рисков", value: riskReserve },
      { id: "overrun", label: "Превышение бюджета", value: overrun },
    ],
    costs,
    contribution,
    margin,
    currency: "тыс. ₽",
  };
}

export function createState(scenario) {
  const variationIndex = Math.floor(Math.random() * Math.max(1, (scenario.variations || []).length));
  return {
    productId: scenario.productId,
    sceneId: "market",
    sceneIndex: 0,
    metrics: { ...scenario.initialMetrics },
    resources: { ...scenario.initialResources },
    decisions: [],
    flags: {},
    pendingEvents: [],
    appliedEvents: [],
    actionTokens: scenario.actionTokens || 0,
    preparationActions: [],
    variationId: scenario.variations?.[variationIndex]?.id || null,
    startedAt: new Date().toISOString(),
  };
}

export function calculateOutcome(scenario, state) {
  const metricValues = Object.values(state.metrics);
  const metricAverage = metricValues.reduce((sum, value) => sum + value, 0) / metricValues.length;
  const rationaleAverage = state.decisions.length
    ? state.decisions.reduce((sum, item) => {
      const review = item.rationaleReview || evaluateRationale(item.rationale);
      return sum + review.score / review.maxScore;
    }, 0) / state.decisions.length
    : 0;
  const economics = calculateEconomics(scenario, state);
  const decisionScore = clamp(Math.round(metricAverage * 0.62 + rationaleAverage * 38));
  const dossierShare = clamp(Number(state.flags.dossierScore || 0) / 3, 0, 1);
  const mechanicShare = clamp(Number(state.flags.mechanicScore || 0) / 6, 0, 1);
  const termsShare = clamp(Number(state.flags.termsScore || 0) / 8, 0, 1);
  const preparationShare = clamp((state.preparationActions || []).length / Math.max(1, scenario.actionTokens || 3), 0, 1);
  const evidenceScore = clamp(Math.round(dossierShare * 30 + mechanicShare * 35 + termsShare * 20 + preparationShare * 15));
  const disciplinePenalty =
    (state.resources.budget < 0 ? 22 : 0) +
    (state.resources.days < 0 ? 22 : 0) +
    (state.resources.team < 2 ? 14 : 0) +
    (state.resources.exposure > 65 ? Math.min(18, Math.round((state.resources.exposure - 65) * 0.6)) : 0) +
    (economics.contribution < 0 ? 24 : 0) +
    Math.min(15, (state.flags.budgetGaps || []).length * 5);
  const disciplineScore = clamp(100 - disciplinePenalty);
  const resilienceScore = clamp(Math.round(
    ((state.metrics.trust + state.metrics.control) / 2) * 0.7 +
    ((state.metrics.speed + state.metrics.economy) / 2) * 0.3,
  ));
  const assessment = [
    {
      id: "decision",
      label: "Качество решений",
      value: decisionScore,
      weight: 35,
      description: "Учитываются скорость работы, доверие, контроль рисков, экономика и ясность письменных объяснений.",
    },
    {
      id: "evidence",
      label: "Доказательства",
      value: evidenceScore,
      weight: 25,
      description: "Учитываются проверка партнёра, особенности товара и дополнительные проверки.",
    },
    {
      id: "discipline",
      label: "Дисциплина ресурсов",
      value: disciplineScore,
      weight: 20,
      description: "Учитываются срок, бюджет, нагрузка на команду и возможные будущие расходы.",
    },
    {
      id: "resilience",
      label: "Устойчивость",
      value: resilienceScore,
      weight: 20,
      description: "Способность продолжить проект после событий, сохранив доверие и контроль.",
    },
  ];
  const skills = [
    { id: "partners", label: "Проверка партнёров", value: Math.round(dossierShare * 100) },
    { id: "documents", label: "Документы и приёмка", value: Math.round(mechanicShare * 100) },
    { id: "negotiation", label: "Переговоры", value: Math.round(termsShare * 100) },
    { id: "reasoning", label: "Обоснование решений", value: Math.round(rationaleAverage * 100) },
    { id: "resources", label: "Управление ресурсами", value: disciplineScore },
    { id: "resilience", label: "Работа с изменениями", value: resilienceScore },
  ];
  const score = clamp(Math.round(assessment.reduce((sum, item) => sum + item.value * item.weight / 100, 0)));

  const strongest = Object.entries(state.metrics).sort((a, b) => b[1] - a[1])[0];
  const weakest = Object.entries(state.metrics).sort((a, b) => a[1] - b[1])[0];
  const profiles = {
    speed: ["Ориентация на скорость", "Вы быстро переводите переговоры в действия. Перед следующим ускорением заранее определяйте условия остановки и проверки."],
    trust: ["Ориентация на доверие", "Вы умеете договариваться с партнёрами. Дополняйте устные договорённости документами и измеримыми обязательствами."],
    control: ["Ориентация на контроль", "Вы внимательно относитесь к ролям, данным и праву остановить работу. Проверяйте, не задерживает ли избыточный контроль необходимые действия."],
    economy: ["Ориентация на экономику", "Вы учитываете не только выручку, но и расходы на исполнение. Не сокращайте проверки, от которых зависит прибыль сделки."],
  };

  const status = score >= 80
    ? { title: "Сделка готова к повторению", lead: "Партнёры, документы, приёмка и расходы согласованы достаточно подробно для следующего заказа." }
    : score >= 62
      ? { title: "Сделку можно продолжать после доработки", lead: "Основные условия понятны, но перед расширением нужно исправить хотя бы одно слабое место." }
      : { title: "Условия сделки нужно пересмотреть", lead: "Интерес покупателя есть, но риски пока слишком велики для первой поставки или внедрения." };

  const actionsByMetric = {
    speed: "Назначить владельца следующего этапа и предельный срок решения.",
    trust: "Согласовать двуязычный протокол приёмки с названными ответственными.",
    control: "Закрепить стороны, данные, территорию и право остановки в приложениях к договору.",
    economy: "Пересчитать все расходы на исполнение, возвраты и поддержку после первой сделки.",
  };

  const decisionValue = (decision) => {
    const metricEffect = Object.values(decision.impact || {}).reduce((sum, value) => sum + value, 0);
    const resources = decision.resources || {};
    const resourceEffect =
      Number(resources.budget || 0) / 150 +
      Number(resources.days || 0) * 0.8 +
      Number(resources.team || 0) * 1.5 -
      Number(resources.exposure || 0) * 0.4;
    return metricEffect + resourceEffect;
  };
  const optionValue = (option) => decisionValue({ impact: option.impact, resources: option.resources });
  const rankedDecisions = [...state.decisions].sort((a, b) => decisionValue(b) - decisionValue(a));
  const strongestDecision = rankedDecisions[0] || null;
  const riskiestDecision = rankedDecisions.at(-1) || null;
  const choiceTurns = state.decisions
    .map((decision) => ({ decision, scene: scenario.scenes[decision.sceneId] }))
    .filter(({ decision, scene }) => decision.kind === "choice" && scene?.choices?.length > 1);
  const inflection = [...choiceTurns].sort((a, b) => decisionValue(a.decision) - decisionValue(b.decision))[0];
  const alternativeChoice = inflection
    ? [...inflection.scene.choices]
      .filter((choice) => choice.id !== inflection.decision.choiceId)
      .sort((a, b) => optionValue(b) - optionValue(a))[0]
    : null;
  const blindSpot = (state.flags.dossierScore || 0) < 3
    ? "В документах осталась хотя бы одна важная проблема, которая может изменить решение о запуске."
    : (state.flags.mechanicScore || 0) < 5
      ? "Особенности товара учтены не полностью: при приёмке стороны могут по-разному оценить результат."
      : (state.flags.termsScore || 0) < 7
        ? "В согласованных условиях осталась уступка, которая может привести к спору после запуска."
      : (state.flags.budgetGaps || []).length
        ? `Ниже сценарного минимума профинансированы: ${state.flags.budgetGaps.join(", ")}.`
        : `Самая низкая оценка получена по критерию «${scenario.metricCatalog[weakest[0]].label.toLowerCase()}». Его нужно улучшить перед расширением проекта.`;
  const boardConditions = [];
  if ((state.flags.dossierScore || 0) < 3) {
    boardConditions.push("До запуска проверить пропущенные проблемы в документах и подтвердить роли всех сторон.");
  }
  if ((state.flags.mechanicScore || 0) < 5) {
    boardConditions.push("Заново согласовать правила приёмки: сейчас стороны могут по-разному оценить результат.");
  }
  if ((state.flags.termsScore || 0) < 7) {
    boardConditions.push("Вернуться к встречному предложению и сделать спорные условия измеримыми.");
  }
  if ((state.flags.budgetGaps || []).length) {
    boardConditions.push(`Увеличить финансирование следующих задач: ${state.flags.budgetGaps.join(", ")}.`);
  }
  if (state.resources.budget < 0 || economics.contribution < 0) {
    boardConditions.push("Утвердить резерв и положительный вклад сделки до принятия новых обязательств.");
  }
  if (boardConditions.length < 2) boardConditions.push(actionsByMetric[weakest[0]]);
  if (boardConditions.length < 2) boardConditions.push("Назначить владельца следующей контрольной точки и срок повторного рассмотрения.");
  const board = score >= 80
    ? {
      title: "Можно начать ограниченную пробную работу",
      lead: "Основные риски учтены. Начинайте с небольшого объёма и не меняйте согласованные условия без новой проверки.",
      tone: "ready",
      conditions: boardConditions.slice(0, 3),
    }
    : score >= 62
      ? {
        title: "Сначала выполните обязательные условия",
        lead: "Сделка может быть выгодной, но до крупных расходов нужно выполнить перечисленные ниже действия.",
        tone: "conditional",
        conditions: boardConditions.slice(0, 3),
      }
      : {
        title: "Пересмотрите условия проекта",
        lead: "Найденные проблемы пока не позволяют рекомендовать первую поставку или внедрение.",
        tone: "rework",
        conditions: boardConditions.slice(0, 3),
      };
  const dossierDecision = state.decisions.find((decision) => decision.kind === "dossier");
  const mechanicDecision = state.decisions.find((decision) => decision.kind === "mechanic");
  const termsDecision = state.decisions.find((decision) => decision.kind === "terms");
  const evidence = [
    ...(state.preparationActions || []).map((action) => ({
      type: "Дополнительная проверка",
      title: action.actionTitle,
      detail: action.clue,
    })),
    ...(dossierDecision?.findings || []).filter((finding) => finding.risk).map((finding) => ({
      type: "Досье",
      title: finding.title,
      detail: finding.finding,
    })),
    ...(mechanicDecision ? [{
      type: "Проверка особенностей товара",
      title: mechanicDecision.resultTitle,
      detail: mechanicDecision.result,
    }] : []),
    ...(termsDecision ? [{
      type: "Переговоры",
      title: termsDecision.resultTitle,
      detail: termsDecision.result,
    }] : []),
  ];

  return {
    score,
    ...status,
    assessment,
    skills,
    board,
    evidence,
    profile: { title: profiles[strongest[0]][0], text: profiles[strongest[0]][1] },
    strongest: strongest[0],
    weakest: weakest[0],
    verdict: `Самая высокая оценка — по критерию «${scenario.metricCatalog[strongest[0]].label.toLowerCase()}», самая низкая — по критерию «${scenario.metricCatalog[weakest[0]].label.toLowerCase()}». Письменные объяснения также учтены.`,
    actions: [
      actionsByMetric[weakest[0]],
      "Подтвердить документами все важные факты, которые не были проверены.",
      "Ещё раз проверить бюджет: какие расходы снижают риск, а какие только ускоряют работу.",
    ],
    review: {
      strongest: strongestDecision
        ? `${strongestDecision.sceneTitle}: «${strongestDecision.choiceTitle}». Это решение лучше всего улучшило итог проекта.`
        : "Недостаточно решений для оценки.",
      risk: riskiestDecision
        ? `${riskiestDecision.sceneTitle}: «${riskiestDecision.choiceTitle}». Этот выбор создал больше всего дополнительных рисков и расходов.`
        : "Недостаточно решений для оценки.",
      blindSpot,
      alternative: inflection && alternativeChoice
        ? {
          scene: inflection.scene.title,
          chosen: inflection.decision.choiceTitle,
          option: alternativeChoice.title,
          consequence: alternativeChoice.result,
          tradeoff: alternativeChoice.tradeoff,
        }
        : null,
      events: state.appliedEvents.filter((event) => ["scenario", "variation"].includes(event.source)).length,
      actions: state.preparationActions || [],
    },
    economics,
  };
}
