import assert from "node:assert/strict";
import test from "node:test";
import { productCatalog } from "../product-catalog.js";
import { cultureGuide, cultureSources, exhibitionCalendar } from "../culture-guide.js";
import { createScenario, resolveScene } from "../scenario.js";
import {
  applyChoice,
  applyDueEvents,
  applyPreparationAction,
  applyScenarioEvents,
  calculateOutcome,
  calculateEconomics,
  commitBudget,
  commitDossier,
  commitMechanic,
  commitTerms,
  createState,
  evaluateBudget,
  evaluateDossier,
  evaluateMechanic,
  evaluateRationale,
  evaluateTerms,
} from "../engine.js";

async function worker() {
  const url = new URL("../dist/server/index.js", import.meta.url);
  url.searchParams.set("test", `${process.pid}-${Date.now()}`);
  return (await import(url.href)).default;
}

const rationale = "Принимаю этот риск, потому что первая поставка ограничена и результат можно проверить.";

test("defines five independent practical cases in one catalog", () => {
  assert.deepEqual(Object.keys(productCatalog), ["instrument", "food", "software", "logistics", "finance"]);
  assert.equal(productCatalog.instrument.company, "ЗаречьеМаш");
  assert.match(productCatalog.food.product, /Лебедянские/);
  assert.equal(productCatalog.software.company, "ООО «Тасей»");
  assert.match(productCatalog.logistics.product, /Сучжоу/);
  assert.match(productCatalog.finance.eyebrow, /QFII/);
  assert.deepEqual(createScenario("finance").chapters.map((chapter) => chapter.label), ["Мандат", "Хранитель", "Досье", "Бюджет", "Контроль", "Договор", "Средства", "Надзор"]);

  for (const product of Object.values(productCatalog)) {
    const scenario = createScenario(product.id);
    assert.doesNotMatch(product.mission, /рыночный всплеск|пилот|контур риска/i);
    assert.doesNotMatch(product.hook, /рыночное окно|коммерческий импульс/i);
    assert.equal(scenario.chapters.length, 8);
    assert.deepEqual(Object.keys(scenario.scenes), scenario.chapters.map((chapter) => chapter.id));
    assert.equal(scenario.scenes.dossier.type, "dossier");
    assert.equal(scenario.scenes.budget.type, "budget");
    assert.equal(scenario.scenes.crisis.type, "mechanic");
    assert.equal(scenario.scenes.contract.type, "terms");
    assert.equal(scenario.scenes.contract.fields.length, 4);
    assert.equal(scenario.variations.length, 3);
    assert.equal(scenario.scenes.partner.choices.length, 3);
    assert.equal(scenario.scenes.dossier.facts.filter((fact) => fact.risk).length, 3);
    assert.equal(scenario.scenes.budget.buckets.reduce((sum, bucket) => sum + bucket.ideal, 0), 10);
    assert.equal(scenario.inbox.length, 4);
    assert.equal(scenario.twists.length, 3);
    assert.ok(scenario.briefing.nonNegotiable);
    assert.equal(scenario.briefing.objectives.length, 3);
    assert.equal(scenario.actionTokens, 3);
    assert.equal(scenario.stakeholders.length, 5);
    assert.ok(scenario.branches.contract.length >= 2);
  }
});

test("checks the substance of an explanation instead of its length alone", () => {
  const empty = evaluateRationale("Очень длинное объяснение без конкретного факта и без понятного следующего шага.");
  assert.equal(empty.ready, false);
  const useful = evaluateRationale("По договору не указан плательщик: юрист проверит связь сторон до выставления счёта.");
  assert.equal(useful.ready, true);
  assert.ok(useful.score >= 3);
});

test("limits preparation actions and turns each one into a visible fact", () => {
  const scenario = createScenario("instrument");
  const state = createState(scenario);
  const scene = scenario.scenes.partner;
  const first = applyPreparationAction(state, scene, scenario.actionTypes[0], scenario.actionClues.partner[0]);
  assert.equal(state.actionTokens, 2);
  assert.match(first.clue, /лаборатории/);
  assert.equal(applyPreparationAction(state, scene, scenario.actionTypes[1], scenario.actionClues.partner[1]), null);

  for (const sceneId of ["dossier", "contract"]) {
    applyPreparationAction(state, scenario.scenes[sceneId], scenario.actionTypes[1], scenario.actionClues[sceneId][1]);
  }
  assert.equal(state.actionTokens, 0);
  assert.equal(state.preparationActions.length, 3);
  assert.equal(applyPreparationAction(state, scenario.scenes.payment, scenario.actionTypes[2], scenario.actionClues.payment[2]), null);
});

test("changes later scene copy after consequential choices", () => {
  for (const productId of Object.keys(productCatalog)) {
    const scenario = createScenario(productId);
    const state = createState(scenario);
    const base = resolveScene(scenario, state, "contract");
    applyChoice(state, scenario.scenes.partner, scenario.scenes.partner.choices.at(-1), rationale);
    const branched = resolveScene(scenario, state, "contract");
    assert.ok(branched.label.includes("Последствие"));
    assert.notEqual(branched.story, base.story);

    state.flags.mechanicScore = 6;
    const strongPayment = resolveScene(scenario, state, "payment");
    state.flags.mechanicScore = 1;
    const weakPayment = resolveScene(scenario, state, "payment");
    assert.notEqual(strongPayment.story, weakPayment.story);
  }
});

test("requires real judgment in dossier inspection", () => {
  const scenario = createScenario("food");
  const scene = scenario.scenes.dossier;
  const riskIds = scene.facts.filter((fact) => fact.risk).map((fact) => fact.id);
  const perfect = evaluateDossier(scene, riskIds);
  assert.equal(perfect.score, 3);
  assert.equal(perfect.missed.length, 0);

  const state = createState(scenario);
  const partial = [riskIds[0], riskIds[2], scene.facts.find((fact, index) => !fact.risk && index % 2 === 1).id];
  const decision = commitDossier(state, scene, partial, rationale);
  assert.equal(decision.kind, "dossier");
  assert.equal(state.decisions.length, 1);
  assert.equal(decision.rationale, rationale);
  assert.match(decision.result, /Пропущено/);
});

test("gives every product a distinct interactive risk mechanic", () => {
  const types = [];
  for (const productId of Object.keys(productCatalog)) {
    const scenario = createScenario(productId);
    const scene = scenario.scenes.crisis;
    types.push(scene.mechanicType);
    const selections = Object.fromEntries(scene.fields.map((field) => [field.id, field.options.at(-1).id]));
    const preview = evaluateMechanic(scene, selections);
    assert.equal(preview.score, 6);
    const state = createState(scenario);
    const decision = commitMechanic(state, scene, selections, rationale);
    assert.equal(decision.kind, "mechanic");
    assert.equal(state.flags.mechanicScore, 6);
  }
  assert.deepEqual(types, ["acceptance", "coldchain", "architecture", "custody", "qfii-controls"]);
});

test("builds four negotiated terms and records weak concessions", () => {
  for (const productId of Object.keys(productCatalog)) {
    const scenario = createScenario(productId);
    const scene = scenario.scenes.contract;
    const protectedTerms = Object.fromEntries(scene.fields.map((field) => [field.id, "protected"]));
    const evaluation = evaluateTerms(scene, protectedTerms);
    assert.equal(evaluation.score, 8);
    assert.equal(evaluation.weak.length, 0);
    const state = createState(scenario);
    const decision = commitTerms(state, scene, protectedTerms, rationale);
    assert.equal(decision.kind, "terms");
    assert.equal(state.flags.termsScore, 8);
    assert.deepEqual(Object.keys(state.metrics).sort(), Object.keys(scenario.metricCatalog).sort());
  }
});

test("changes one starting condition on a new run and applies it only once", () => {
  const scenario = createScenario("logistics");
  const state = createState(scenario);
  assert.ok(scenario.variations.some((item) => item.id === state.variationId));
  const first = applyScenarioEvents(scenario, state, "market");
  assert.equal(first.length, 1);
  assert.equal(first[0].id, state.variationId);
  assert.equal(applyScenarioEvents(scenario, state, "market").length, 0);
});

test("allocates exactly ten budget shares and records the shortfall", () => {
  const scenario = createScenario("software");
  const scene = scenario.scenes.budget;
  assert.equal(evaluateBudget(scene, { localization: 2, "data-law": 3, edge: 2, validation: 2 }).valid, false);

  const allocation = Object.fromEntries(scene.buckets.map((bucket) => [bucket.id, bucket.ideal]));
  const evaluation = evaluateBudget(scene, allocation);
  assert.equal(evaluation.valid, true);
  assert.deepEqual(evaluation.gaps, []);

  const state = createState(scenario);
  const decision = commitBudget(state, scene, allocation, rationale, productCatalog.software.budgetUnit);
  assert.equal(decision.kind, "budget");
  assert.equal(state.resources.budget, 0);
  assert.equal(state.flags.budgetAllocation.edge, 3);
});

test("brings a partner decision back as a delayed consequence", () => {
  const scenario = createScenario("instrument");
  const state = createState(scenario);
  const partner = scenario.scenes.partner.choices.find((item) => item.id === "daxin");
  applyChoice(state, scenario.scenes.partner, partner, rationale);
  assert.equal(state.pendingEvents.length, 1);
  const before = state.metrics.control;
  const due = applyDueEvents(state, "payment");
  assert.equal(due.length, 1);
  assert.ok(state.metrics.control < before);
});

test("branches three unexpected events from earlier decisions in every case", () => {
  for (const productId of Object.keys(productCatalog)) {
    const scenario = createScenario(productId);
    const state = createState(scenario);
    applyChoice(state, scenario.scenes.market, scenario.scenes.market.choices[0], rationale);
    const first = applyScenarioEvents(scenario, state, "dossier");
    assert.equal(first.length, 1);

    const risks = scenario.scenes.dossier.facts.filter((fact) => fact.risk).map((fact) => fact.id);
    commitDossier(state, scenario.scenes.dossier, risks, rationale);
    const second = applyScenarioEvents(scenario, state, "contract");
    assert.equal(second.length, 1);

    const selections = Object.fromEntries(scenario.scenes.crisis.fields.map((field) => [field.id, field.options.at(-1).id]));
    commitMechanic(state, scenario.scenes.crisis, selections, rationale);
    const third = applyScenarioEvents(scenario, state, "payment");
    assert.equal(third.length, 1);
    assert.equal(state.appliedEvents.filter((event) => event.source === "scenario").length, 3);
    assert.equal(applyScenarioEvents(scenario, state, "payment").length, 0);
  }
});

test("all five cases can complete eight decisions and produce a final profile", () => {
  for (const productId of Object.keys(productCatalog)) {
    const scenario = createScenario(productId);
    const state = createState(scenario);

    applyChoice(state, scenario.scenes.market, scenario.scenes.market.choices[1], rationale);
    applyChoice(state, scenario.scenes.partner, scenario.scenes.partner.choices[1], rationale);
    const risks = scenario.scenes.dossier.facts.filter((fact) => fact.risk).map((fact) => fact.id);
    commitDossier(state, scenario.scenes.dossier, risks, rationale);
    const allocation = Object.fromEntries(scenario.scenes.budget.buckets.map((bucket) => [bucket.id, bucket.ideal]));
    commitBudget(state, scenario.scenes.budget, allocation, rationale, productCatalog[productId].budgetUnit);
    const mechanicSelections = Object.fromEntries(scenario.scenes.crisis.fields.map((field) => [field.id, field.options.at(-1).id]));
    commitMechanic(state, scenario.scenes.crisis, mechanicSelections, rationale);
    const terms = Object.fromEntries(scenario.scenes.contract.fields.map((field) => [field.id, "protected"]));
    commitTerms(state, scenario.scenes.contract, terms, rationale);
    applyChoice(state, scenario.scenes.payment, scenario.scenes.payment.choices[0], rationale);
    applyChoice(state, scenario.scenes.scale, scenario.scenes.scale.choices[0], rationale);

    assert.equal(state.decisions.length, 8);
    assert.ok(state.decisions.every((decision) => decision.rationale.length >= 20));
    const result = calculateOutcome(scenario, state);
    assert.ok(result.score >= 0 && result.score <= 100);
    assert.equal(result.actions.length, 3);
    assert.ok(result.profile.title);
    assert.ok(result.review.strongest);
    assert.ok(result.review.risk);
    assert.ok(result.review.blindSpot);
    assert.ok(result.review.alternative);
    assert.ok(result.economics.revenue > 0);
    assert.deepEqual(result.assessment.map((item) => item.weight), [35, 25, 20, 20]);
    assert.ok(result.assessment.every((item) => item.value >= 0 && item.value <= 100));
    assert.ok(["ready", "conditional", "rework"].includes(result.board.tone));
    assert.ok(result.board.conditions.length >= 2);
    assert.ok(result.evidence.some((item) => item.type === "Досье"));
    assert.ok(result.evidence.some((item) => item.type === "Переговоры"));
    assert.equal(result.skills.length, 6);
    assert.equal(calculateEconomics(scenario, state).lines.length, 5);
  }
});

test("builds a sourced China business culture guide without stereotypes as rules", () => {
  assert.ok(cultureGuide.categories.length >= 10);
  assert.ok(cultureGuide.checklist.length >= 8);
  assert.equal(cultureGuide.phrases.length, 5);
  assert.ok(cultureGuide.disclaimer.includes("не описывают все китайские компании"));
  assert.ok(cultureSources.every((source) => source.url.startsWith("https://")));
  assert.ok(cultureSources.some((source) => source.id === "trade-rep-site" && source.url.includes("minpromtorg.gov.ru")));
  assert.ok(cultureSources.some((source) => source.url === "https://t.me/rustorgpred"));
  assert.ok(cultureSources.some((source) => source.url === "https://t.me/russchinatrade"));
  assert.ok(!cultureSources.some((source) => source.id === "uk-market"));
  assert.ok(cultureSources.some((source) => source.id === "trade-rep-role"));
  assert.ok(cultureSources.some((source) => source.id === "mpk"));
  assert.ok(cultureSources.some((source) => source.id === "qfii-csrc"));
  assert.ok(cultureSources.some((source) => source.id === "qfii-funds"));
  assert.ok(cultureSources.some((source) => source.id === "customs-law"));
  assert.ok(!cultureSources.some((source) => ["canton-2026", "ciie-2026", "analytica-2026", "sial-2026", "cisile-2026", "waic-2026"].includes(source.id)));
  assert.deepEqual([...new Set(exhibitionCalendar.map((item) => item.year))], [2026, 2027]);
  assert.ok(exhibitionCalendar.some((item) => item.title.includes("analytica") && item.status === "подтверждено"));
  assert.ok(exhibitionCalendar.filter((item) => item.year === 2026).length >= 12);
  assert.ok(exhibitionCalendar.some((item) => item.title === "CeMAT ASIA" && item.date === "3–6 ноября"));
  assert.ok(exhibitionCalendar.some((item) => item.title === "FHC Shanghai" && item.date === "10–12 ноября"));
  assert.ok(exhibitionCalendar.some((item) => item.title === "China Hi-Tech Fair" && item.date === "26–28 ноября"));
  assert.ok(exhibitionCalendar.filter((item) => item.year === 2027).every((item) => item.date.includes("ожидаются")));
  assert.ok(cultureGuide.categories.flatMap((category) => category.entries).some((entry) => entry.title.includes("Правила компании")));
});

test("serves the one-screen simulator, modular catalog and social metadata", async () => {
  const app = await worker();
  const responses = await Promise.all([
    app.fetch(new Request("https://simulator.example/")),
    app.fetch(new Request("https://simulator.example/product-catalog.js")),
    app.fetch(new Request("https://simulator.example/scenario.js")),
    app.fetch(new Request("https://simulator.example/engine.js")),
    app.fetch(new Request("https://simulator.example/styles.css")),
    app.fetch(new Request("https://simulator.example/culture-guide.js")),
    app.fetch(new Request("https://simulator.example/og-v21.png")),
    app.fetch(new Request("https://simulator.example/missing")),
  ]);
  const [page, catalogSource, scenarioSource, engineSource, css] = await Promise.all(responses.slice(0, 5).map((response) => response.text()));

  assert.match(page, /Пять дел/);
  assert.match(page, /Обоснование/);
  assert.match(page, /id="dossierGrid"/);
  assert.match(page, /id="budgetBoard"/);
  assert.match(page, /О бизнес-культуре/);
  assert.match(page, /О бизнес-культуре Китая/);
  assert.match(page, /id="briefingModal"/);
  assert.doesNotMatch(page, /id="commissionModal"/);
  assert.doesNotMatch(page, />Для комиссии</);
  assert.match(page, /версия 2\.4/);
  assert.match(page, /Ключевой риск/);
  assert.match(page, /Принять решение/);
  assert.doesNotMatch(page, /id="messageCard"/);
  assert.match(page, /id="assessmentBreakdown"/);
  assert.match(page, /id="documentReview"/);
  assert.match(page, /id="termsBoard"/);
  assert.match(page, /id="skillMap"/);
  assert.match(page, /От запроса до первой продажи: семь шагов/);
  assert.match(page, /На чём основаны рекомендации/);
  assert.doesNotMatch(page, /class="qfii-route"/);
  assert.match(page, /id="inboxButton"/);
  assert.match(page, /id="preparationButton"/);
  assert.match(page, /id="stakeholdersModal"/);
  assert.match(page, /id="exhibitionGrid"/);
  assert.match(page, /Главные решения/);
  assert.match(page, /Китая/);
  assert.match(page, /https:\/\/simulator\.example\/og-v21\.png/);
  assert.match(catalogSource, /Лебедянские/);
  assert.match(catalogSource, /ООО «Тасей»/);
  assert.match(catalogSource, /БайкалТранс/);
  assert.match(catalogSource, /Амур Капитал/);
  assert.match(scenarioSource, /createScenario/);
  assert.match(scenarioSource, /resolveScene/);
  assert.match(engineSource, /commitDossier/);
  assert.match(engineSource, /applyPreparationAction/);
  assert.match(engineSource, /calculateEconomics/);
  assert.match(engineSource, /evaluateRationale/);
  assert.match(engineSource, /commitTerms/);
  assert.match(css, /height: 100dvh/);
  assert.match(css, /\.catalog-workbench/);
  assert.match(css, /grid-template-columns: var\(--catalog-side\) minmax\(0,1fr\)/);
  assert.match(await responses[5].text(), /cultureGuide/);
  assert.equal(responses[6].status, 200);
  assert.equal(responses[7].status, 404);
  assert.match(responses[7].headers.get("content-security-policy") ?? "", /default-src 'self'/);
});
