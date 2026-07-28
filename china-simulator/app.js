import { productCatalog } from "./product-catalog.js";
import { cultureGuide, cultureSources, exhibitionCalendar } from "./culture-guide.js";
import { createScenario, resolveScene } from "./scenario.js";
import {
  applyChoice,
  applyDueEvents,
  applyPreparationAction,
  applyScenarioEvents,
  calculateOutcome,
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
} from "./engine.js";

const $ = (selector) => document.querySelector(selector);

const elements = {
  catalogScreen: $("#catalogScreen"),
  cultureScreen: $("#cultureScreen"),
  simulatorScreen: $("#simulatorScreen"),
  resultScreen: $("#resultScreen"),
  cultureButton: $("#cultureButton"),
  documentsButton: $("#documentsButton"),
  restartButton: $("#restartButton"),
  briefingModal: $("#briefingModal"),
  briefingNumber: $("#briefingNumber"),
  briefingCaller: $("#briefingCaller"),
  briefingTitle: $("#briefingTitle"),
  briefingMandate: $("#briefingMandate"),
  briefingAtRisk: $("#briefingAtRisk"),
  briefingNonNegotiable: $("#briefingNonNegotiable"),
  briefingMark: $("#briefingMark"),
  briefingRole: $("#briefingRole"),
  briefingDays: $("#briefingDays"),
  briefingBudget: $("#briefingBudget"),
  briefingObjectives: $("#briefingObjectives"),
  caseCards: $("#caseCards"),
  casePreview: $("#casePreview"),
  brandMark: $("#brandMark"),
  brandCase: $("#brandCase"),
  chapterList: $("#chapterList"),
  sceneMeta: $("#sceneMeta"),
  sceneTitle: $("#sceneTitle"),
  storyCopy: $("#storyCopy"),
  decisionPrompt: $("#decisionPrompt"),
  selectionHint: $("#selectionHint"),
  choiceList: $("#choiceList"),
  dossierGrid: $("#dossierGrid"),
  budgetBoard: $("#budgetBoard"),
  mechanicBoard: $("#mechanicBoard"),
  termsBoard: $("#termsBoard"),
  rationaleBox: $("#rationaleBox"),
  rationaleInput: $("#rationaleInput"),
  rationaleCount: $("#rationaleCount"),
  rationaleSignals: $("#rationaleSignals"),
  insightText: $("#insightText"),
  eventBanner: $("#eventBanner"),
  inboxButton: $("#inboxButton"),
  inboxCount: $("#inboxCount"),
  deskDocumentCount: $("#deskDocumentCount"),
  deadlineIndicator: $("#deadlineIndicator"),
  saveIndicator: $("#saveIndicator"),
  inboxModal: $("#inboxModal"),
  inboxList: $("#inboxList"),
  messageView: $("#messageView"),
  preparationButton: $("#preparationButton"),
  actionTokenCount: $("#actionTokenCount"),
  preparationModal: $("#preparationModal"),
  preparationIntro: $("#preparationIntro"),
  preparationOptions: $("#preparationOptions"),
  preparationResult: $("#preparationResult"),
  stakeholdersButton: $("#stakeholdersButton"),
  stakeholderCount: $("#stakeholderCount"),
  stakeholdersModal: $("#stakeholdersModal"),
  stakeholderGrid: $("#stakeholderGrid"),
  stakeholderConnections: $("#stakeholderConnections"),
  consequenceCard: $("#consequenceCard"),
  consequenceTitle: $("#consequenceTitle"),
  consequenceText: $("#consequenceText"),
  consequenceTradeoff: $("#consequenceTradeoff"),
  impactChips: $("#impactChips"),
  decisionSubmit: $("#decisionSubmit"),
  nextButton: $("#nextButton"),
  scenePosition: $("#scenePosition"),
  caseBadge: $("#caseBadge"),
  caseEyebrow: $("#caseEyebrow"),
  caseProduct: $("#caseProduct"),
  caseDay: $("#caseDay"),
  metrics: $("#metrics"),
  resources: $("#resources"),
  routeLine: $("#routeLine"),
  documentCount: $("#documentCount"),
  documentModal: $("#documentModal"),
  documentTabs: $("#documentTabs"),
  documentTitle: $("#documentTitle"),
  documentBody: $("#documentBody"),
  documentReview: $("#documentReview"),
  methodModal: $("#methodModal"),
  analystDrawer: $("#analystDrawer"),
  chatLog: $("#chatLog"),
  promptChips: $("#promptChips"),
  analystForm: $("#analystForm"),
  analystInput: $("#analystInput"),
  resultProduct: $("#resultProduct"),
  resultTitle: $("#resultTitle"),
  resultLead: $("#resultLead"),
  resultScore: $("#resultScore"),
  boardVerdict: $("#boardVerdict"),
  boardLead: $("#boardLead"),
  boardConditions: $("#boardConditions"),
  assessmentBreakdown: $("#assessmentBreakdown"),
  evidenceCount: $("#evidenceCount"),
  evidenceList: $("#evidenceList"),
  profileTitle: $("#profileTitle"),
  profileText: $("#profileText"),
  resultMetrics: $("#resultMetrics"),
  resultVerdict: $("#resultVerdict"),
  actionPlan: $("#actionPlan"),
  decisionTrail: $("#decisionTrail"),
  economicsLabel: $("#economicsLabel"),
  economicsRevenue: $("#economicsRevenue"),
  economicsLines: $("#economicsLines"),
  economicsContribution: $("#economicsContribution"),
  economicsMargin: $("#economicsMargin"),
  resultEventCount: $("#resultEventCount"),
  resultStrongestDecision: $("#resultStrongestDecision"),
  resultRiskiestDecision: $("#resultRiskiestDecision"),
  resultBlindSpot: $("#resultBlindSpot"),
  alternativePath: $("#alternativePath"),
  catalogProgress: $("#catalogProgress"),
  masteryCases: $("#masteryCases"),
  skillMap: $("#skillMap"),
  cultureSearch: $("#cultureSearch"),
  cultureTabs: $("#cultureTabs"),
  cultureSectionNumber: $("#cultureSectionNumber"),
  cultureSectionTitle: $("#cultureSectionTitle"),
  cultureSectionIntro: $("#cultureSectionIntro"),
  cultureCards: $("#cultureCards"),
  cultureEmpty: $("#cultureEmpty"),
  cultureChecklist: $("#cultureChecklist"),
  checklistProgress: $("#checklistProgress"),
  culturePhrases: $("#culturePhrases"),
  cultureSources: $("#cultureSources"),
  cultureDisclaimer: $("#cultureDisclaimer"),
  exhibitionYears: $("#exhibitionYears"),
  exhibitionGrid: $("#exhibitionGrid"),
  exhibitionNote: $("#exhibitionNote"),
};

let selectedProductId = "instrument";
let scenario = null;
let product = null;
let state = null;
let selectedChoiceId = null;
let dossierSelection = new Set();
let budgetAllocation = {};
let mechanicSelections = {};
let termSelections = {};
let dueEvents = [];
let pendingProductId = null;
let currentInboxMessageId = null;
let screenBeforeCulture = elements.catalogScreen;
let selectedCultureCategory = "trust";
let selectedExhibitionYear = 2026;
let checkedCultureItems = new Set(loadChecklist());
let focusBeforeModal = null;

function loadChecklist() {
  try {
    const saved = JSON.parse(localStorage.getItem("china-culture-checklist") || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setAccent(color) {
  document.documentElement.style.setProperty("--accent", color);
}

function storageKey(productId) {
  return `china-simulator-v24:${productId}`;
}

const portfolioKey = "china-simulator-portfolio-v24";

function loadPortfolio() {
  try {
    const saved = JSON.parse(localStorage.getItem(portfolioKey) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function savePortfolioResult(productId, result) {
  const portfolio = loadPortfolio();
  portfolio[productId] = {
    score: result.score,
    completedAt: new Date().toISOString(),
    skills: result.skills,
  };
  try {
    localStorage.setItem(portfolioKey, JSON.stringify(portfolio));
  } catch {
    // Итог дела всё равно остаётся в состоянии текущего прохождения.
  }
  return portfolio;
}

function aggregatePortfolio(portfolio = loadPortfolio()) {
  const entries = Object.values(portfolio).filter((item) => Array.isArray(item.skills));
  const skillIds = [...new Set(entries.flatMap((entry) => entry.skills.map((skill) => skill.id)))];
  const skills = skillIds.map((id) => {
    const matching = entries.flatMap((entry) => entry.skills.filter((skill) => skill.id === id));
    return {
      id,
      label: matching[0]?.label || id,
      value: Math.round(matching.reduce((sum, skill) => sum + skill.value, 0) / matching.length),
    };
  });
  return { completed: entries.length, skills };
}

function currentScene() {
  return resolveScene(scenario, state, state.sceneId);
}

function loadSavedState(productId) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(productId)) || "null");
    if (!saved || saved.productId !== productId || !Number.isInteger(saved.sceneIndex)) return null;
    if (!Array.isArray(saved.decisions) || saved.sceneIndex < 0 || saved.sceneIndex > 7) return null;
    return saved;
  } catch {
    return null;
  }
}

function activate(screen) {
  [elements.catalogScreen, elements.cultureScreen, elements.simulatorScreen, elements.resultScreen].forEach((item) => item.classList.remove("active"));
  screen.classList.add("active");
  document.body.classList.toggle("simulation-active", screen === elements.simulatorScreen);
  const showCaseControls = screen === elements.simulatorScreen || screen === elements.resultScreen;
  elements.documentsButton.hidden = !showCaseControls || !scenario;
  elements.restartButton.hidden = !showCaseControls;
}

function openModal(modal, focusTarget = null) {
  focusBeforeModal = document.activeElement;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  const target = focusTarget || modal.querySelector(".close-button, button, [href], input, textarea, [tabindex]:not([tabindex='-1'])");
  window.setTimeout(() => target?.focus(), 0);
}

function closeModals() {
  document.querySelectorAll(".modal").forEach((modal) => { modal.hidden = true; });
  document.body.classList.remove("modal-open");
  if (focusBeforeModal instanceof HTMLElement) focusBeforeModal.focus();
  focusBeforeModal = null;
}

function renderCatalog() {
  const portfolio = aggregatePortfolio();
  const strongestSkill = [...portfolio.skills].sort((a, b) => b.value - a.value)[0];
  elements.catalogProgress.innerHTML = portfolio.completed
    ? `<span><b>${portfolio.completed} из ${Object.keys(productCatalog).length}</b> дел пройдено</span><span>Сильная сторона: <b>${escapeHtml(strongestSkill?.label || "—")}</b></span>`
    : "<span><b>0 из 5</b> дел пройдено</span><span>После первого дела здесь появится общая карта навыков.</span>";
  elements.caseCards.innerHTML = Object.values(productCatalog).map((item, index) => `
    <button
      class="case-card ${item.id === selectedProductId ? "selected" : ""}"
      data-product="${item.id}"
      style="--case-color:${item.color}"
      aria-pressed="${item.id === selectedProductId}"
    >
      <span class="case-card-top">
        <span class="case-card-mark">${escapeHtml(item.mark)}</span>
        <span class="case-card-index">Дело 0${index + 1}</span>
        <span class="case-card-state">${item.id === selectedProductId ? "Выбрано" : "Выбрать"}</span>
      </span>
      <span class="case-card-copy">
        <small>${escapeHtml(item.eyebrow)}</small>
        <strong>${escapeHtml(item.product)}</strong>
        <span>${escapeHtml(item.company)} · ${escapeHtml(item.origin)}</span>
      </span>
      <span class="case-card-foot">
        <span>${loadSavedState(item.id)
          ? `<b>${loadSavedState(item.id).completedAt ? "Пройдено" : `Этап ${loadSavedState(item.id).sceneIndex + 1}/8`}</b> сохранено на этом устройстве`
          : `<b>${escapeHtml(item.signal)}</b> ${escapeHtml(item.signalLabel)}`}</span>
        <b class="case-card-arrow">↗</b>
      </span>
    </button>
  `).join("");

  product = productCatalog[selectedProductId];
  const saved = loadSavedState(selectedProductId);
  setAccent("#ef4638");
  elements.casePreview.style.setProperty("--preview-color", product.color);
  const caseNumber = Object.keys(productCatalog).indexOf(selectedProductId) + 1;
  elements.casePreview.innerHTML = `
    <div class="preview-top">
      <span class="overline">Дело 0${caseNumber} · ${escapeHtml(product.company)} · ${escapeHtml(product.duration)}</span>
      <div class="preview-signal">
        <strong>${escapeHtml(product.signal)}</strong>
        <span>${escapeHtml(product.signalLabel)}</span>
      </div>
    </div>
    <div class="preview-main">
      <span class="preview-kicker">${escapeHtml(product.eyebrow)}</span>
      <h2>${escapeHtml(product.mission)}</h2>
      <p class="preview-hook">${escapeHtml(product.hook)}</p>
      <span class="preview-objectives-label">В этом деле нужно выяснить</span>
      <div class="preview-readiness">
        ${product.briefing.objectives.map((objective, index) => `<span><b>0${index + 1}</b>${escapeHtml(objective)}</span>`).join("")}
      </div>
    </div>
    <div class="preview-footer">
      <div class="preview-actions">
        <button class="primary-button" data-start-case>${saved ? (saved.completedAt ? "Посмотреть результат" : `Продолжить · этап ${saved.sceneIndex + 1}/8`) : "Начать дело"} <span>→</span></button>
        ${saved ? `<button class="preview-new-case" data-new-case>Начать заново</button>` : ""}
      </div>
      <p class="source-note"><b>${escapeHtml(product.signalValue)}</b> · ${escapeHtml(product.signalNote)}</p>
    </div>
  `;
}

function configureCase(productId, restoredState = null) {
  selectedProductId = productId;
  product = productCatalog[productId];
  scenario = createScenario(productId);
  state = restoredState || createState(scenario);
  state.readMessages ||= [];
  state.actionTokens ??= scenario.actionTokens;
  state.preparationActions ||= [];
  selectedChoiceId = null;
  dossierSelection = new Set();
  budgetAllocation = Object.fromEntries(product.budget.buckets.map((bucket) => [bucket.id, 0]));
  mechanicSelections = {};
  termSelections = {};
  elements.chatLog.innerHTML = "";

  setAccent(product.color);
  elements.brandMark.textContent = product.mark;
  elements.brandCase.textContent = `${product.company} · ${product.origin}`;
  elements.documentCount.textContent = scenario.documents.length;
  elements.caseBadge.textContent = product.mark;
  elements.caseEyebrow.textContent = product.eyebrow;
  elements.caseProduct.textContent = product.product;
  elements.deskDocumentCount.textContent = scenario.documents.length;
  elements.stakeholderCount.textContent = scenario.stakeholders.length;
}

function startCase(productId) {
  localStorage.removeItem(storageKey(productId));
  configureCase(productId);
  activate(elements.simulatorScreen);
  renderScene();
}

function resumeCase(productId) {
  const saved = loadSavedState(productId);
  if (!saved) {
    openBriefing(productId);
    return;
  }
  configureCase(productId, saved);
  if (saved.completedAt || saved.decisions.length >= scenario.chapters.length) {
    renderResult();
    return;
  }
  activate(elements.simulatorScreen);
  renderScene({ resume: true });
}

function openBriefing(productId) {
  pendingProductId = productId;
  const item = productCatalog[productId];
  const briefing = item.briefing;
  const caseNumber = Object.keys(productCatalog).indexOf(productId) + 1;
  setAccent(item.color);
  elements.briefingNumber.textContent = `0${caseNumber}`;
  elements.briefingCaller.textContent = briefing.caller;
  elements.briefingTitle.textContent = briefing.headline;
  elements.briefingMandate.textContent = briefing.mandate;
  elements.briefingAtRisk.textContent = briefing.atRisk;
  elements.briefingNonNegotiable.textContent = briefing.nonNegotiable;
  elements.briefingMark.textContent = item.mark;
  elements.briefingRole.textContent = item.role;
  elements.briefingDays.textContent = `${item.initialResources.days} дней`;
  elements.briefingBudget.textContent = item.budgetLabel;
  elements.briefingObjectives.innerHTML = briefing.objectives.map((objective) => `<li>${escapeHtml(objective)}</li>`).join("");
  openModal(elements.briefingModal, $("#acceptBriefingButton"));
}

function saveState() {
  if (!state) return;
  state.savedAt = new Date().toISOString();
  try {
    localStorage.setItem(storageKey(state.productId), JSON.stringify(state));
    elements.saveIndicator.textContent = "Сохранено";
  } catch {
    elements.saveIndicator.textContent = "Не сохранено";
  }
}

function renderChapters() {
  elements.chapterList.innerHTML = scenario.chapters.map((chapter, index) => `
    <li class="${index === state.sceneIndex ? "active" : ""} ${index < state.sceneIndex ? "done" : ""}">
      <b>${index < state.sceneIndex ? "✓" : index + 1}</b>
      <span>${escapeHtml(chapter.label)}</span>
    </li>
  `).join("");
}

function renderMetrics(target = elements.metrics) {
  target.innerHTML = Object.entries(scenario.metricCatalog).map(([key, meta]) => {
    const value = Math.round(state.metrics[key]);
    return `
      <div class="metric">
        <div><span>${escapeHtml(meta.label)}</span><strong>${value}</strong></div>
        <div class="metric-track"><i style="width:${value}%"></i></div>
      </div>
    `;
  }).join("");
}

function resourceValue(key, value) {
  if (key === "budget") return `${value.toLocaleString("ru-RU")} тыс.`;
  if (key === "days") return `${value} дн.`;
  if (key === "team") return `${value} ч/д`;
  return `${value}%`;
}

function renderResources() {
  elements.resources.innerHTML = Object.entries(scenario.resources).map(([key, meta]) => {
    const value = state.resources[key];
    const risk = (key === "budget" && value < 0) || (key === "days" && value < 10) || (key === "team" && value < 3) || (key === "exposure" && value > 60);
    return `
      <div class="resource ${risk ? "risk" : ""}">
        <span>${escapeHtml(meta.label)}</span>
        <strong>${escapeHtml(resourceValue(key, value))}</strong>
        <small>${escapeHtml(meta.hint)}</small>
      </div>
    `;
  }).join("");
  const elapsed = product.initialResources.days - state.resources.days + 1;
  elements.caseDay.textContent = `День ${Math.max(1, elapsed)}`;
  const partner = product.partners.find((item) => item.id === state.flags.partner);
  elements.routeLine.textContent = partner ? partner.name : "маршрут открыт";
}

function renderEvents() {
  if (!dueEvents.length) {
    elements.eventBanner.hidden = true;
    elements.eventBanner.innerHTML = "";
    return;
  }
  elements.eventBanner.hidden = false;
  elements.eventBanner.innerHTML = dueEvents.map((event) => `<strong>${escapeHtml(event.title)}:</strong> ${escapeHtml(event.text)}`).join(" ");
}

function availableMessages() {
  if (!scenario || !state) return [];
  const authored = (scenario.inbox || [])
    .filter((message) => message.at <= state.sceneIndex)
    .map((message) => ({ ...message, source: "inbox" }));
  const consequences = state.appliedEvents
    .filter((event) => ["scenario", "variation"].includes(event.source))
    .map((event) => ({
      id: `event-${event.id}`,
      at: scenario.chapters.findIndex((chapter) => chapter.id === event.appliedAt),
      from: "Последствия решений",
      role: "результат вашего предыдущего выбора",
      subject: event.title,
      body: event.text,
      urgent: true,
      source: "event",
    }));
  return [...authored, ...consequences].sort((a, b) => b.at - a.at || Number(b.urgent) - Number(a.urgent));
}

function renderDesk() {
  const messages = availableMessages();
  const read = new Set(state.readMessages || []);
  const unread = messages.filter((message) => !read.has(message.id)).length;
  const actionTaken = state.preparationActions.some((item) => item.sceneId === state.sceneId);
  const actionAvailable = Boolean(scenario.actionClues[state.sceneId]) && state.actionTokens > 0 && !actionTaken;
  elements.inboxCount.textContent = unread;
  elements.inboxButton.classList.toggle("has-unread", unread > 0);
  elements.actionTokenCount.textContent = state.actionTokens;
  elements.preparationButton.disabled = !actionAvailable;
  elements.preparationButton.classList.toggle("action-used", actionTaken);
  elements.preparationButton.title = actionTaken
    ? "Проверка в этой главе уже проведена"
    : actionAvailable
      ? "Можно провести одну дополнительную проверку"
      : "Дополнительная проверка недоступна в этой главе";
  elements.deadlineIndicator.textContent = `${state.resources.days} дн.`;
}

function renderPreparation() {
  const scene = currentScene();
  const clues = scenario.actionClues[scene.id];
  const taken = state.preparationActions.find((item) => item.sceneId === scene.id);
  elements.preparationIntro.textContent = clues
    ? `На всё дело доступно три дополнительные проверки. Осталось: ${state.actionTokens}. На этом этапе можно провести только одну. Она потребует времени, а иногда и денег.`
    : "В этой главе дополнительная проверка не предусмотрена: решение нужно принять по уже собранным материалам.";
  elements.preparationOptions.hidden = Boolean(taken) || !clues;
  elements.preparationOptions.innerHTML = clues ? scenario.actionTypes.map((action, index) => `
    <button data-preparation-action="${action.id}" ${state.actionTokens <= 0 ? "disabled" : ""}>
      <span>0${index + 1}</span>
      <strong>${escapeHtml(action.title)}</strong>
      <small>${escapeHtml(action.cost)}</small>
    </button>
  `).join("") : "";
  elements.preparationResult.hidden = !taken;
  elements.preparationResult.innerHTML = taken ? `
    <span>Получен новый факт</span>
    <h3>${escapeHtml(taken.actionTitle)}</h3>
    <p>${escapeHtml(taken.clue)}</p>
    <div>${renderImpact(taken.impact, taken.resources)}</div>
  ` : "";
}

function openPreparation() {
  if (!state) return;
  renderPreparation();
  openModal(elements.preparationModal);
}

function stakeholderName(item) {
  if (item.dynamic !== "partner") return item.name;
  return product.partners.find((partner) => partner.id === state.flags.partner)?.name || item.name;
}

function renderStakeholders() {
  elements.stakeholderGrid.innerHTML = scenario.stakeholders.map((item) => {
    const visible = state.sceneIndex >= item.visibleAt;
    return `
      <article class="${visible ? "" : "locked"}">
        <span>${escapeHtml(item.kind)}</span>
        <h3>${visible ? escapeHtml(stakeholderName(item)) : "Сторона ещё не установлена"}</h3>
        <p>${visible ? escapeHtml(item.role) : `Информация появится на этапе ${item.visibleAt + 1}.`}</p>
        ${visible ? `<dl><div><dt>Интерес</dt><dd>${escapeHtml(item.interest)}</dd></div><div><dt>Риск</dt><dd>${escapeHtml(item.risk)}</dd></div></dl>` : ""}
      </article>
    `;
  }).join("");
  elements.stakeholderConnections.innerHTML = `
    <span>Что нужно закрепить документами</span>
    ${scenario.stakeholderConnections.map((connection) => `<p>${escapeHtml(connection)}</p>`).join("")}
  `;
}

function openStakeholders() {
  if (!state) return;
  renderStakeholders();
  openModal(elements.stakeholdersModal);
}

function renderInbox(messageId = null) {
  const messages = availableMessages();
  if (!messages.length) return;
  const selected = messages.find((message) => message.id === messageId)
    || messages.find((message) => message.id === currentInboxMessageId)
    || messages[0];
  currentInboxMessageId = selected.id;
  state.readMessages ||= [];
  if (!state.readMessages.includes(selected.id)) state.readMessages.push(selected.id);
  elements.inboxList.innerHTML = messages.map((message) => `
    <button class="${message.id === selected.id ? "active" : ""} ${state.readMessages.includes(message.id) ? "" : "unread"}" data-message="${message.id}">
      <span>${message.urgent ? "Важно" : `Глава ${message.at + 1}`}</span>
      <strong>${escapeHtml(message.subject)}</strong>
      <small>${escapeHtml(message.from)}</small>
    </button>
  `).join("");
  elements.messageView.innerHTML = `
    <div class="message-meta">
      <span>${selected.urgent ? "Требует внимания" : `Получено в главе ${selected.at + 1}`}</span>
      <b>${escapeHtml(selected.from)}</b>
      <small>${escapeHtml(selected.role)}</small>
    </div>
    <h3>${escapeHtml(selected.subject)}</h3>
    <p>${escapeHtml(selected.body)}</p>
    ${selected.source === "event" ? `<blockquote>Это сообщение появилось как последствие ваших предыдущих решений.</blockquote>` : ""}
  `;
  renderDesk();
  saveState();
}

function renderChoiceScene(scene) {
  elements.selectionHint.textContent = "Один вариант";
  elements.choiceList.hidden = false;
  elements.dossierGrid.hidden = true;
  elements.budgetBoard.hidden = true;
  elements.mechanicBoard.hidden = true;
  elements.termsBoard.hidden = true;
  elements.choiceList.innerHTML = scene.choices.map((choice, index) => `
    <button class="choice-card ${selectedChoiceId === choice.id ? "selected" : ""}" data-choice="${choice.id}">
      <span class="choice-number">0${index + 1}</span>
      <span><strong>${escapeHtml(choice.title)}</strong><small>${escapeHtml(choice.text)}</small></span>
      <span class="choice-tag">${escapeHtml(choice.tag)}</span>
    </button>
  `).join("");
}

function renderDossierScene(scene) {
  elements.choiceList.hidden = true;
  elements.budgetBoard.hidden = true;
  elements.mechanicBoard.hidden = true;
  elements.termsBoard.hidden = true;
  elements.dossierGrid.hidden = false;
  const evaluation = evaluateDossier(scene, [...dossierSelection]);
  elements.selectionHint.textContent = `Проверка: ${evaluation.spent}/${scene.investigationBudget}`;
  const selectedFacts = evaluation.selectedFacts.map((fact) => `<span>${escapeHtml(fact.title)}</span>`).join("");
  elements.dossierGrid.innerHTML = `
    <section class="dossier-workbench">
      <div>
        <span>Работа с документом</span>
        <h3>Найдите фрагменты, которые могут изменить решение</h3>
        <p>Откройте досье, сравните шесть фрагментов и отметьте только те, на которые стоит потратить ограниченный ресурс проверки.</p>
      </div>
      <div class="dossier-meter">
        <strong>${evaluation.spent}/${scene.investigationBudget}</strong>
        <span>единиц проверки использовано</span>
      </div>
      <button class="primary-button" data-open-review>Открыть досье <span>↗</span></button>
      <div class="dossier-selected">${selectedFacts || "<span>Пока ничего не отмечено</span>"}</div>
    </section>
  `;
}

function renderBudgetScene(scene) {
  elements.choiceList.hidden = true;
  elements.dossierGrid.hidden = true;
  elements.mechanicBoard.hidden = true;
  elements.termsBoard.hidden = true;
  elements.budgetBoard.hidden = false;
  const evaluation = evaluateBudget(scene, budgetAllocation);
  const remaining = 10 - evaluation.total;
  elements.selectionHint.textContent = remaining === 0 ? "Все доли распределены" : `Осталось долей: ${remaining}`;
  elements.budgetBoard.innerHTML = `
    <div class="budget-summary">
      <span>1 доля = ${product.budgetUnit.toLocaleString("ru-RU")} тыс. ₽</span>
      <strong>${evaluation.total}/10 · ${(evaluation.total * product.budgetUnit).toLocaleString("ru-RU")} тыс. ₽</strong>
    </div>
    <div class="budget-buckets">
      ${scene.buckets.map((bucket) => `
        <div class="budget-item">
          <span><strong>${escapeHtml(bucket.title)}</strong><small>${escapeHtml(bucket.hint)}</small></span>
          <div class="budget-controls">
            <button data-budget="${bucket.id}" data-delta="-1" aria-label="Уменьшить ${escapeHtml(bucket.title)}">−</button>
            <b>${budgetAllocation[bucket.id]}</b>
            <button data-budget="${bucket.id}" data-delta="1" aria-label="Увеличить ${escapeHtml(bucket.title)}">+</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderMechanicScene(scene) {
  elements.choiceList.hidden = true;
  elements.dossierGrid.hidden = true;
  elements.budgetBoard.hidden = true;
  elements.termsBoard.hidden = true;
  elements.mechanicBoard.hidden = false;
  const selectedCount = Object.keys(mechanicSelections).length;
  elements.selectionHint.textContent = `Выбрано: ${selectedCount}/${scene.fields.length}`;
  elements.mechanicBoard.className = `mechanic-board ${scene.mechanicType}`;
  elements.mechanicBoard.innerHTML = scene.fields.map((field, fieldIndex) => `
    <section class="mechanic-field">
      <header><span>0${fieldIndex + 1}</span><strong>${escapeHtml(field.title)}</strong></header>
      <div>
        ${field.options.map((option) => `
          <button class="${mechanicSelections[field.id] === option.id ? "selected" : ""}" data-mechanic-field="${field.id}" data-mechanic-option="${option.id}">
            <strong>${escapeHtml(option.title)}</strong>
            <small>${escapeHtml(option.text)}</small>
          </button>
        `).join("")}
      </div>
    </section>
  `).join("");
}

function renderTermsScene(scene) {
  elements.choiceList.hidden = true;
  elements.dossierGrid.hidden = true;
  elements.budgetBoard.hidden = true;
  elements.mechanicBoard.hidden = true;
  elements.termsBoard.hidden = false;
  const selectedCount = Object.keys(termSelections).length;
  elements.selectionHint.textContent = `Выбрано: ${selectedCount}/${scene.fields.length}`;
  elements.termsBoard.innerHTML = `
    <div class="counteroffer"><span>Встречное предложение</span><p>${escapeHtml(scene.counteroffer)}</p></div>
    <div class="term-fields">
      ${scene.fields.map((field, fieldIndex) => `
        <section class="term-field">
          <header><span>0${fieldIndex + 1}</span><strong>${escapeHtml(field.title)}</strong></header>
          <div>
            ${field.options.map((option) => `
              <button class="${termSelections[field.id] === option.id ? "selected" : ""}" data-term-field="${field.id}" data-term-option="${option.id}">
                <strong>${escapeHtml(option.title)}</strong>
                <small>${escapeHtml(option.text)}</small>
              </button>
            `).join("")}
          </div>
        </section>
      `).join("")}
    </div>
  `;
}

function rationaleValid() {
  return evaluateRationale(elements.rationaleInput.value).ready;
}

function decisionReady(scene) {
  if (!rationaleValid()) return false;
  if (scene.type === "choice") return Boolean(selectedChoiceId);
  if (scene.type === "dossier") return evaluateDossier(scene, [...dossierSelection]).valid;
  if (scene.type === "budget") return evaluateBudget(scene, budgetAllocation).valid;
  if (scene.type === "mechanic") return Boolean(evaluateMechanic(scene, mechanicSelections));
  if (scene.type === "terms") return Boolean(evaluateTerms(scene, termSelections));
  return false;
}

function updateSubmitState() {
  if (!scenario || !state) return;
  const scene = currentScene();
  const review = evaluateRationale(elements.rationaleInput.value);
  elements.rationaleCount.textContent = `${review.length}/300`;
  elements.rationaleSignals.innerHTML = review.signals.map((signal) => `
    <span class="${signal.met ? "met" : ""}">${signal.met ? "✓" : "○"} ${escapeHtml(signal.label)}</span>
  `).join("");
  elements.decisionSubmit.disabled = !decisionReady(scene);
}

function messageForScene(scene) {
  const caseMessages = {
    logistics: {
      market: "Сравните срок, перегрузки, резерв мощности и контроль состояния груза.",
    },
    finance: {
      market: "Закрепите инструменты, предел риска и право остановки операций.",
      partner: "Проверьте, кто ведёт заявление, счета, расчёты и отчётность.",
      dossier: "Сверьте владельцев, репутацию и независимость внутреннего контроля.",
      budget: "Не экономьте на досье, хранении, контроле и проверочном запуске.",
      crisis: "Остановите перевод, обновите сведения и определите порядок уведомления.",
      contract: "Разделите обязанности инвестора, хранителя активов и брокера.",
      payment: "Свяжите источник, валюту, специальный счёт и назначение средств.",
      scale: "Расширяйте мандат только после полной сверки первого цикла.",
    },
  };
  const messages = {
    market: "Выберите покупателя и факт, которым проверите спрос.",
    partner: "Проверьте полномочия, команду и обязанности партнёра.",
    dossier: "Ищите несоответствия между покупателем, плательщиком и исполнителями.",
    budget: "Неоплаченный риск вернётся задержкой или дополнительными расходами.",
    crisis: "Выбирайте условия, которые можно проверить документом или измерением.",
    contract: "Широкие права требуют точных обязанностей и показателей.",
    payment: "Привязывайте оплату к подтверждаемому событию.",
    scale: "Расширяйте только то, что команда умеет повторять.",
  };
  return caseMessages[selectedProductId]?.[scene.id] || messages[scene.id];
}

function promptsForScene(scene) {
  const typePrompts = {
    choice: ["Какой риск будет трудно исправить?", "Что проверить до подписи?", "Какой вариант можно остановить с наименьшими потерями?"],
    dossier: ["Какой факт может изменить решение?", "Какие связи между сторонами нужно подтвердить?", "Чего не хватает в документах?"],
    budget: ["Какие расходы защищают сделку?", "Где экономия приведёт к большим потерям?", "На чём можно сэкономить без опасных последствий?"],
    mechanic: ["Что осталось без проверки?", "Какой документ или измерение получит клиент?", "Какое решение будет труднее всего отменить?"],
    terms: ["Где партнёру можно уступить?", "Какое условие должно быть измеримым?", "Что вызовет спор после подписания?"],
  };
  return typePrompts[scene.type] || typePrompts.choice;
}

function showConsequence(decision) {
  elements.consequenceTitle.textContent = decision.resultTitle;
  elements.consequenceText.textContent = decision.result;
  elements.consequenceTradeoff.textContent = decision.tradeoff;
  elements.impactChips.innerHTML = renderImpact(decision.impact, decision.resources);
  elements.consequenceCard.hidden = false;
  elements.decisionSubmit.hidden = true;
  elements.nextButton.hidden = false;
  elements.rationaleBox.hidden = true;
}

function renderScene({ resume = false } = {}) {
  const scene = currentScene();
  dueEvents = [
    ...applyDueEvents(state, scene.id),
    ...applyScenarioEvents(scenario, state, scene.id),
  ];
  selectedChoiceId = null;
  dossierSelection = new Set();
  budgetAllocation = Object.fromEntries((scene.buckets || []).map((bucket) => [bucket.id, 0]));
  mechanicSelections = {};
  termSelections = {};
  elements.rationaleInput.value = "";
  elements.rationaleCount.textContent = "0/300";
  elements.consequenceCard.hidden = true;
  elements.decisionSubmit.hidden = false;
  elements.nextButton.hidden = true;
  elements.rationaleBox.hidden = false;
  elements.sceneMeta.textContent = scene.label
    ? `Глава ${state.sceneIndex + 1} · ${scenario.chapters[state.sceneIndex].label} · ${scene.label}`
    : `Глава ${state.sceneIndex + 1} · ${scenario.chapters[state.sceneIndex].label}`;
  elements.sceneTitle.textContent = scene.title;
  elements.storyCopy.textContent = scene.story;
  elements.decisionPrompt.textContent = scene.prompt;
  elements.scenePosition.textContent = `${state.sceneIndex + 1} из ${scenario.chapters.length}`;
  elements.insightText.textContent = messageForScene(scene);
  renderChapters();
  renderMetrics();
  renderResources();
  renderEvents();
  renderDesk();
  if (scene.type === "choice") renderChoiceScene(scene);
  if (scene.type === "dossier") renderDossierScene(scene);
  if (scene.type === "budget") renderBudgetScene(scene);
  if (scene.type === "mechanic") renderMechanicScene(scene);
  if (scene.type === "terms") renderTermsScene(scene);
  renderAnalystPrompts(scene);
  updateSubmitState();
  const savedDecision = resume ? state.decisions.find((decision) => decision.sceneId === state.sceneId) : null;
  if (savedDecision) showConsequence(savedDecision);
  saveState();
  if (!resume) window.setTimeout(() => elements.sceneTitle.focus(), 0);
}

function renderImpact(impact = {}, resources = {}) {
  const metricLabels = Object.fromEntries(Object.entries(scenario.metricCatalog).map(([key, value]) => [key, value.label]));
  const resourceLabels = { budget: "Резерв", days: "Срок", team: "Команда", exposure: "Раскрытие" };
  const chips = [];
  for (const [key, value] of Object.entries(impact)) {
    if (!value) continue;
    chips.push(`<span class="impact-chip ${value > 0 ? "positive" : "negative"}">${escapeHtml(metricLabels[key])} ${value > 0 ? "+" : ""}${value}</span>`);
  }
  for (const [key, value] of Object.entries(resources)) {
    if (!value) continue;
    chips.push(`<span class="impact-chip ${value > 0 ? "positive" : "negative"}">${escapeHtml(resourceLabels[key])} ${value > 0 ? "+" : ""}${value}${key === "budget" ? " тыс." : ""}</span>`);
  }
  return chips.join("");
}

function commitDecision() {
  const scene = currentScene();
  if (!decisionReady(scene)) return;
  const rationale = elements.rationaleInput.value;
  let decision;

  if (scene.type === "choice") {
    const choice = scene.choices.find((item) => item.id === selectedChoiceId);
    decision = applyChoice(state, scene, choice, rationale);
  } else if (scene.type === "dossier") {
    decision = commitDossier(state, scene, [...dossierSelection], rationale);
  } else if (scene.type === "budget") {
    decision = commitBudget(state, scene, budgetAllocation, rationale, product.budgetUnit);
  } else if (scene.type === "mechanic") {
    decision = commitMechanic(state, scene, mechanicSelections, rationale);
  } else {
    decision = commitTerms(state, scene, termSelections, rationale);
  }

  showConsequence(decision);
  renderMetrics();
  renderResources();
  renderDesk();
  saveState();
}

function nextScene() {
  if (state.sceneIndex >= scenario.chapters.length - 1) {
    renderResult();
    return;
  }
  state.sceneIndex += 1;
  state.sceneId = scenario.chapters[state.sceneIndex].id;
  renderScene();
}

function renderResult() {
  state.completedAt ||= new Date().toISOString();
  const result = calculateOutcome(scenario, state);
  const portfolio = savePortfolioResult(product.id, result);
  const overall = aggregatePortfolio(portfolio);
  activate(elements.resultScreen);
  elements.resultProduct.textContent = product.product;
  elements.resultTitle.textContent = result.title;
  elements.resultLead.textContent = result.lead;
  elements.resultScore.textContent = result.score;
  elements.boardVerdict.textContent = result.board.title;
  elements.boardLead.textContent = result.board.lead;
  elements.boardConditions.innerHTML = result.board.conditions.map((condition) => `<li>${escapeHtml(condition)}</li>`).join("");
  elements.boardVerdict.closest(".board-card").dataset.tone = result.board.tone;
  elements.assessmentBreakdown.innerHTML = result.assessment.map((item) => `
    <article class="assessment-row">
      <div><span>${escapeHtml(item.label)} · вес ${item.weight}%</span><strong>${item.value}</strong></div>
      <div class="assessment-track"><i style="width:${item.value}%"></i></div>
      <p>${escapeHtml(item.description)}</p>
    </article>
  `).join("");
  const visibleEvidence = result.evidence.slice(0, 6);
  elements.evidenceCount.textContent = `${result.evidence.length} фактов`;
  elements.evidenceList.innerHTML = visibleEvidence.length ? visibleEvidence.map((item) => `
    <article>
      <span>${escapeHtml(item.type)}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.detail)}</p>
    </article>
  `).join("") : "<p class=\"evidence-empty\">Дополнительные проверки не проводились. Поэтому итоговое решение опирается на меньшее число подтверждённых фактов.</p>";
  elements.profileTitle.textContent = result.profile.title;
  elements.profileText.textContent = result.profile.text;
  elements.masteryCases.textContent = `${overall.completed} из ${Object.keys(productCatalog).length} дел`;
  elements.skillMap.innerHTML = overall.skills.map((skill) => `
    <article>
      <div><span>${escapeHtml(skill.label)}</span><strong>${skill.value}</strong></div>
      <div><i style="width:${skill.value}%"></i></div>
    </article>
  `).join("");
  elements.resultVerdict.textContent = result.verdict;
  elements.actionPlan.innerHTML = result.actions.map((action) => `<li>${escapeHtml(action)}</li>`).join("");
  renderMetrics(elements.resultMetrics);
  elements.economicsLabel.textContent = result.economics.label;
  elements.economicsRevenue.textContent = `${result.economics.revenue.toLocaleString("ru-RU")} ${result.economics.currency}`;
  elements.economicsLines.innerHTML = result.economics.lines.map((line) => `
    <div><span>${escapeHtml(line.label)}</span><strong>−${line.value.toLocaleString("ru-RU")}</strong></div>
  `).join("");
  elements.economicsContribution.textContent = `${result.economics.contribution.toLocaleString("ru-RU")} ${result.economics.currency}`;
  elements.economicsMargin.textContent = `${result.economics.margin}% выручки`;
  elements.resultEventCount.textContent = `${result.review.events} событий · ${result.review.actions.length} проверок`;
  elements.resultStrongestDecision.textContent = result.review.strongest;
  elements.resultRiskiestDecision.textContent = result.review.risk;
  elements.resultBlindSpot.textContent = result.review.blindSpot;
  elements.alternativePath.innerHTML = result.review.alternative ? `
    <span>Другой вариант · ${escapeHtml(result.review.alternative.scene)}</span>
    <div>
      <p><b>Вы выбрали:</b> ${escapeHtml(result.review.alternative.chosen)}</p>
      <p><b>Можно было:</b> ${escapeHtml(result.review.alternative.option)}</p>
    </div>
    <strong>${escapeHtml(result.review.alternative.consequence)}</strong>
    <small>${escapeHtml(result.review.alternative.tradeoff)}</small>
  ` : "<span>Другой вариант</span><p>Для сравнения нужно завершить хотя бы один этап.</p>";
  elements.decisionTrail.innerHTML = state.decisions.map((decision, index) => `
    <article class="trail-item">
      <span>0${index + 1} · ${escapeHtml(decision.sceneTitle)}</span>
      <strong>${escapeHtml(decision.choiceTitle)}</strong>
      <p>«${escapeHtml(decision.rationale)}»</p>
    </article>
  `).join("");
  saveState();
  window.setTimeout(() => elements.resultTitle.focus(), 0);
}

function openDocument(documentId) {
  if (!scenario) return;
  const documents = scenario.documents;
  const selected = documents.find((item) => item.id === documentId) || documents[0];
  elements.documentTabs.innerHTML = documents.map((item) => `
    <button class="${item.id === selected.id ? "active" : ""}" data-document="${item.id}">${escapeHtml(item.title)}</button>
  `).join("");
  elements.documentTitle.textContent = selected.title;
  elements.documentBody.innerHTML = selected.body;
  const scene = state ? currentScene() : null;
  const showReview = scene?.type === "dossier" && selected.id === scene.documentId;
  elements.documentReview.hidden = !showReview;
  if (showReview) {
    const evaluation = evaluateDossier(scene, [...dossierSelection]);
    elements.documentReview.innerHTML = `
      <header>
        <div><span>Задание по досье</span><strong>Отметьте фрагменты для углублённой проверки</strong></div>
        <b>${evaluation.spent}/${scene.investigationBudget}</b>
      </header>
      <p>У вас ограниченный ресурс. Подтверждённый факт может быть полезен, но не обязательно требует дополнительной проверки.</p>
      <div>
        ${scene.facts.map((fact) => {
          const selectedFact = dossierSelection.has(fact.id);
          const blocked = !selectedFact && evaluation.spent + fact.cost > scene.investigationBudget;
          return `
            <button class="${selectedFact ? "selected" : ""}" data-review-fact="${fact.id}" ${blocked ? "disabled" : ""} aria-pressed="${selectedFact}">
              <span>${selectedFact ? "Отмечено" : "Фрагмент"}</span>
              <strong>${escapeHtml(fact.title)}</strong>
              <small>${escapeHtml(fact.text)}</small>
              <em>${fact.cost} ${fact.cost === 1 ? "единица" : "единицы"} проверки</em>
            </button>
          `;
        }).join("")}
      </div>
    `;
  } else {
    elements.documentReview.innerHTML = "";
  }
  if (elements.documentModal.hidden) openModal(elements.documentModal);
}

function renderAnalystPrompts(scene) {
  elements.promptChips.innerHTML = promptsForScene(scene).map((prompt) => `<button type="button" data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`).join("");
}

function analystAnswer(question) {
  const scene = currentScene();
  const generic = {
    market: "Определите, какой факт через 30 дней покажет, что группа покупателей выбрана правильно: встреча с конечным клиентом, образцы для испытания или оплаченный запрос.",
    partner: "Разделите доступ к клиенту, право подписывать, право получать деньги и обязанность обслуживать. Если всё обещает одна сторона, проверьте каждую роль отдельно.",
    dossier: "Ищите отсутствие важных связей: плательщик не указан в договоре, для сервиса нет сотрудников, у данных нет ответственного, а на части маршрута не записывается температура.",
    budget: "Сначала защитите необратимые риски. Рекламу можно отложить; уже выпущенную партию, переданный код или сорванную приёмку вернуть сложнее.",
    crisis: "Надёжное решение оставляет проверяемый результат: подписанный протокол, журнал температуры, набор проверочных данных или записанную ответственность сторон.",
    contract: "Сравните права и обязанности: широкая территория требует плана продаж, доступ к данным — указанной цели и срока, а скидка — обязательства партнёра.",
    payment: "Событие оплаты должно быть наблюдаемым обеими сторонами и зависеть от документов, которые команда реально может подготовить.",
    scale: "Если второй проект снова требует срочных доработок и постоянного участия разработчиков, нужно сначала описать и упростить порядок внедрения.",
  };
  const prefix = question.toLowerCase().includes("риск") ? "Главный вопрос сейчас: что будет трудно отменить? " : "";
  return `${prefix}${generic[scene.id]}`;
}

function addChat(text, user = false) {
  const item = document.createElement("div");
  item.className = `chat-message ${user ? "user" : ""}`;
  item.textContent = text;
  elements.chatLog.append(item);
  elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
}

function askAnalyst(question) {
  const clean = question.trim();
  if (!clean) return;
  addChat(clean, true);
  addChat(analystAnswer(clean));
}

function renderCultureChecklist() {
  elements.cultureChecklist.innerHTML = cultureGuide.checklist.map((item, index) => `
    <label>
      <input type="checkbox" data-checklist="${index}" ${checkedCultureItems.has(index) ? "checked" : ""}>
      <span>${escapeHtml(item)}</span>
    </label>
  `).join("");
  elements.checklistProgress.textContent = `${checkedCultureItems.size}/${cultureGuide.checklist.length}`;
}

function renderExhibitions() {
  const items = exhibitionCalendar.filter((item) => item.year === selectedExhibitionYear);
  elements.exhibitionYears.innerHTML = [...new Set(exhibitionCalendar.map((item) => item.year))].map((year) => `
    <button class="${year === selectedExhibitionYear ? "active" : ""}" data-exhibition-year="${year}">${year}</button>
  `).join("");
  elements.exhibitionGrid.innerHTML = items.map((item) => `
    <article class="exhibition-card">
      <header>
        <span>${escapeHtml(item.date)}</span>
        <b class="${item.status === "подтверждено" ? "confirmed" : ""}">${escapeHtml(item.status)}</b>
      </header>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.city)} · ${escapeHtml(item.sector)}</p>
      <small>${escapeHtml(item.relevance)}</small>
      <a href="${item.url}" target="_blank" rel="noreferrer">Сайт организатора ↗</a>
    </article>
  `).join("");
  elements.exhibitionNote.textContent = selectedExhibitionYear === 2026
    ? "Прошедшие выставки оставлены в календаре, чтобы можно было заранее готовиться к следующему циклу."
    : "Для 2027 года пока указан предварительный список. Покупайте билеты и бронируйте стенд только после публикации точных дат организатором.";
}

function renderCulture() {
  const query = elements.cultureSearch.value.trim().toLocaleLowerCase("ru");
  elements.cultureTabs.innerHTML = cultureGuide.categories.map((category) => `
    <button class="${!query && category.id === selectedCultureCategory ? "active" : ""}" data-culture-category="${category.id}">
      ${escapeHtml(category.short)}
    </button>
  `).join("");

  const category = cultureGuide.categories.find((item) => item.id === selectedCultureCategory) || cultureGuide.categories[0];
  const allEntries = cultureGuide.categories.flatMap((item) => item.entries.map((entry) => ({ ...entry, category: item })));
  const entries = query
    ? allEntries.filter(({ title, text, practice, avoid, category: item }) =>
      [title, text, practice, avoid, item.title].join(" ").toLocaleLowerCase("ru").includes(query))
    : category.entries.map((entry) => ({ ...entry, category }));

  elements.cultureSectionNumber.textContent = query ? "⌕" : String(cultureGuide.categories.indexOf(category) + 1).padStart(2, "0");
  elements.cultureSectionTitle.textContent = query ? `Поиск: «${elements.cultureSearch.value.trim()}»` : category.title;
  elements.cultureSectionIntro.textContent = query ? `Материалов найдено: ${entries.length}` : category.intro;
  elements.cultureEmpty.hidden = entries.length > 0;
  elements.cultureCards.innerHTML = entries.map((entry) => `
    <article class="culture-card">
      ${query ? `<span class="culture-category-label">${escapeHtml(entry.category.short)}</span>` : ""}
      <h3>${escapeHtml(entry.title)}</h3>
      <p>${escapeHtml(entry.text)}</p>
      <dl>
        <div><dt>На практике</dt><dd>${escapeHtml(entry.practice)}</dd></div>
        <div><dt>Не стоит</dt><dd>${escapeHtml(entry.avoid)}</dd></div>
      </dl>
      ${entry.sources.length ? `<footer>${entry.sources.map((id) => {
        const source = cultureSources.find((item) => item.id === id);
        return `<a href="${source.url}" target="_blank" rel="noreferrer">${escapeHtml(source.publisher)} ↗</a>`;
      }).join("")}</footer>` : `<footer><span>Практическое наблюдение — проверяйте в своём контексте</span></footer>`}
    </article>
  `).join("");

  elements.culturePhrases.innerHTML = cultureGuide.phrases.map((phrase) => `
    <article>
      <strong lang="zh">${escapeHtml(phrase.chinese)}</strong>
      <span>${escapeHtml(phrase.pinyin)}</span>
      <small>${escapeHtml(phrase.russian)}</small>
    </article>
  `).join("");
  elements.cultureDisclaimer.textContent = cultureGuide.disclaimer;
  const primarySources = cultureSources.filter((source, index, items) =>
    items.findIndex((item) => item.url === source.url) === index);
  elements.cultureSources.innerHTML = primarySources.map((source, index) => `
    <a href="${source.url}" target="_blank" rel="noreferrer">
      <b>${String(index + 1).padStart(2, "0")}</b>
      <span><strong>${escapeHtml(source.title)}</strong><small>${escapeHtml(source.publisher)} · ${escapeHtml(source.note)}</small></span>
      <i>↗</i>
    </a>
  `).join("");
  renderCultureChecklist();
  renderExhibitions();
}

function toggleCulture() {
  if (elements.cultureScreen.classList.contains("active")) {
    activate(screenBeforeCulture || elements.catalogScreen);
    elements.cultureButton.textContent = "О бизнес-культуре";
    return;
  }
  screenBeforeCulture = document.querySelector(".screen.active") || elements.catalogScreen;
  activate(elements.cultureScreen);
  document.body.classList.remove("simulation-active");
  elements.cultureButton.textContent = "Вернуться";
  renderCulture();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function chooseAnother() {
  activate(elements.catalogScreen);
  document.body.classList.remove("simulation-active");
  elements.brandMark.textContent = "КП";
  elements.brandCase.textContent = "экспортный тренажёр";
  elements.documentCount.textContent = "0";
  elements.cultureButton.textContent = "О бизнес-культуре";
  renderCatalog();
}

function downloadDecisions() {
  const result = calculateOutcome(scenario, state);
  const report = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>Отчёт — ${escapeHtml(product.product)}</title>
<style>
body{max-width:920px;margin:40px auto;padding:0 24px;color:#112720;font:15px/1.5 Arial,sans-serif}
h1,h2{font-family:Georgia,serif;font-weight:500}h1{font-size:42px;line-height:1}.score{font-size:28px}
section{margin:24px 0;padding-top:16px;border-top:1px solid #aab3af}li{margin:7px 0}
table{width:100%;border-collapse:collapse}td,th{padding:8px;border:1px solid #c9cfcc;text-align:left;vertical-align:top}
small{color:#52615c}@media print{body{margin:0}.no-print{display:none}}
</style></head><body>
<small>Китай: первая партия · версия 2.4 · учебный материал</small>
<h1>${escapeHtml(product.company)}<br>${escapeHtml(product.product)}</h1>
<p class="score"><b>${result.score} из 100.</b> ${escapeHtml(result.title)}</p>
<p>${escapeHtml(result.lead)}</p>
<section><h2>Рекомендация</h2><h3>${escapeHtml(result.board.title)}</h3><p>${escapeHtml(result.board.lead)}</p>
<ol>${result.board.conditions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></section>
<section><h2>План действий</h2><ol>${result.actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></section>
<section><h2>Карта навыков</h2><table><tbody>${result.skills.map((skill) => `<tr><th>${escapeHtml(skill.label)}</th><td>${skill.value} из 100</td></tr>`).join("")}</tbody></table></section>
<section><h2>Главные выводы</h2>
<p><b>Сильное решение:</b> ${escapeHtml(result.review.strongest)}</p>
<p><b>Рискованный выбор:</b> ${escapeHtml(result.review.risk)}</p>
<p><b>Что осталось без проверки:</b> ${escapeHtml(result.review.blindSpot)}</p></section>
<section><h2>Ход решений</h2><table><thead><tr><th>Этап</th><th>Решение</th><th>Обоснование</th></tr></thead><tbody>
${state.decisions.map((decision) => `<tr><td>${escapeHtml(decision.sceneTitle)}</td><td>${escapeHtml(decision.choiceTitle)}</td><td>${escapeHtml(decision.rationale)}</td></tr>`).join("")}
</tbody></table></section>
<section><h2>Экономика</h2><p>Выручка: <b>${result.economics.revenue.toLocaleString("ru-RU")} ${result.economics.currency}</b></p>
<p>Остаток после расходов и рисков: <b>${result.economics.contribution.toLocaleString("ru-RU")} ${result.economics.currency}</b></p></section>
<p><small>Это результат учебной симуляции, а не юридическая, таможенная или инвестиционная рекомендация.</small></p>
</body></html>`;
  const blob = new Blob([report], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `otchet-china-case-${product.id}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

elements.caseCards.addEventListener("click", (event) => {
  const card = event.target.closest("[data-product]");
  if (!card) return;
  selectedProductId = card.dataset.product;
  renderCatalog();
});
elements.casePreview.addEventListener("click", (event) => {
  if (event.target.closest("[data-start-case]")) {
    if (loadSavedState(selectedProductId)) resumeCase(selectedProductId);
    else openBriefing(selectedProductId);
  }
  if (event.target.closest("[data-new-case]")) openBriefing(selectedProductId);
});
elements.choiceList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-choice]");
  if (!card) return;
  selectedChoiceId = card.dataset.choice;
  renderChoiceScene(currentScene());
  updateSubmitState();
});
elements.dossierGrid.addEventListener("click", (event) => {
  if (event.target.closest("[data-open-review]")) openDocument(currentScene().documentId);
});
elements.documentReview.addEventListener("click", (event) => {
  const item = event.target.closest("[data-review-fact]");
  if (!item || item.disabled) return;
  const id = item.dataset.reviewFact;
  if (dossierSelection.has(id)) dossierSelection.delete(id);
  else {
    const scene = currentScene();
    const fact = scene.facts.find((entry) => entry.id === id);
    const current = evaluateDossier(scene, [...dossierSelection]);
    if (current.spent + fact.cost <= scene.investigationBudget) dossierSelection.add(id);
  }
  renderDossierScene(currentScene());
  openDocument(currentScene().documentId);
  updateSubmitState();
});
elements.budgetBoard.addEventListener("click", (event) => {
  const control = event.target.closest("[data-budget]");
  if (!control) return;
  const id = control.dataset.budget;
  const delta = Number(control.dataset.delta);
  const total = Object.values(budgetAllocation).reduce((sum, value) => sum + value, 0);
  if (delta > 0 && total >= 10) return;
  budgetAllocation[id] = Math.max(0, Math.min(10, budgetAllocation[id] + delta));
  renderBudgetScene(currentScene());
  updateSubmitState();
});
elements.mechanicBoard.addEventListener("click", (event) => {
  const option = event.target.closest("[data-mechanic-field]");
  if (!option) return;
  mechanicSelections[option.dataset.mechanicField] = option.dataset.mechanicOption;
  renderMechanicScene(currentScene());
  updateSubmitState();
});
elements.termsBoard.addEventListener("click", (event) => {
  const option = event.target.closest("[data-term-field]");
  if (!option) return;
  termSelections[option.dataset.termField] = option.dataset.termOption;
  renderTermsScene(currentScene());
  updateSubmitState();
});
elements.rationaleInput.addEventListener("input", updateSubmitState);
elements.decisionSubmit.addEventListener("click", commitDecision);
elements.nextButton.addEventListener("click", nextScene);

$("#documentsButton").addEventListener("click", () => scenario && openDocument(scenario.documents[0].id));
$("#deskDocumentsButton").addEventListener("click", () => scenario && openDocument(scenario.documents[0].id));
elements.inboxButton.addEventListener("click", () => {
  if (!state || !availableMessages().length) return;
  renderInbox();
  openModal(elements.inboxModal);
});
elements.inboxList.addEventListener("click", (event) => {
  const message = event.target.closest("[data-message]");
  if (message) renderInbox(message.dataset.message);
});
elements.preparationButton.addEventListener("click", openPreparation);
elements.stakeholdersButton.addEventListener("click", openStakeholders);
elements.preparationOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-preparation-action]");
  if (!button) return;
  const scene = currentScene();
  const actionIndex = scenario.actionTypes.findIndex((item) => item.id === button.dataset.preparationAction);
  const action = scenario.actionTypes[actionIndex];
  const clue = scenario.actionClues[scene.id]?.[actionIndex];
  if (!action || !clue) return;
  const record = applyPreparationAction(state, scene, action, clue);
  if (!record) return;
  renderPreparation();
  renderMetrics();
  renderResources();
  renderDesk();
  saveState();
});
$("#acceptBriefingButton").addEventListener("click", () => {
  if (!pendingProductId) return;
  closeModals();
  startCase(pendingProductId);
  pendingProductId = null;
});
$("#cancelBriefingButton").addEventListener("click", () => {
  closeModals();
  pendingProductId = null;
  setAccent("#ef4638");
});
$("#contextDocumentButton").addEventListener("click", () => openDocument(currentScene().documentId));
elements.documentTabs.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-document]");
  if (tab) openDocument(tab.dataset.document);
});
$("#methodButton").addEventListener("click", () => {
  openModal(elements.methodModal);
});
elements.cultureButton.addEventListener("click", toggleCulture);
$("#catalogGuideButton").addEventListener("click", toggleCulture);
elements.cultureSearch.addEventListener("input", renderCulture);
$("#clearCultureSearch").addEventListener("click", () => {
  elements.cultureSearch.value = "";
  renderCulture();
  elements.cultureSearch.focus();
});
elements.cultureTabs.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-culture-category]");
  if (!tab) return;
  selectedCultureCategory = tab.dataset.cultureCategory;
  elements.cultureSearch.value = "";
  renderCulture();
  window.scrollTo({ top: elements.cultureTabs.offsetTop - 90, behavior: "smooth" });
});
elements.exhibitionYears.addEventListener("click", (event) => {
  const button = event.target.closest("[data-exhibition-year]");
  if (!button) return;
  selectedExhibitionYear = Number(button.dataset.exhibitionYear);
  renderExhibitions();
});
elements.cultureChecklist.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-checklist]");
  if (!checkbox) return;
  const index = Number(checkbox.dataset.checklist);
  if (checkbox.checked) checkedCultureItems.add(index);
  else checkedCultureItems.delete(index);
  localStorage.setItem("china-culture-checklist", JSON.stringify([...checkedCultureItems]));
  renderCultureChecklist();
});
$("#resetChecklist").addEventListener("click", () => {
  checkedCultureItems.clear();
  localStorage.removeItem("china-culture-checklist");
  renderCultureChecklist();
});
document.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-modal]") || event.target.closest(".modal-panel > .close-button")) closeModals();
});

$("#analystButton").addEventListener("click", () => {
  elements.analystDrawer.classList.add("open");
  elements.analystDrawer.setAttribute("aria-hidden", "false");
  if (!elements.chatLog.children.length) addChat("Я помогу проверить решение. Выберите готовый вопрос или напишите свой.");
});
$("#closeAnalyst").addEventListener("click", () => {
  elements.analystDrawer.classList.remove("open");
  elements.analystDrawer.setAttribute("aria-hidden", "true");
});
elements.promptChips.addEventListener("click", (event) => {
  const button = event.target.closest("[data-prompt]");
  if (button) askAnalyst(button.dataset.prompt);
});
elements.analystForm.addEventListener("submit", (event) => {
  event.preventDefault();
  askAnalyst(elements.analystInput.value);
  elements.analystInput.value = "";
});

$("#brandHome").addEventListener("click", chooseAnother);
elements.restartButton.addEventListener("click", chooseAnother);
$("#chooseAnotherButton").addEventListener("click", chooseAnother);
$("#replayButton").addEventListener("click", () => openBriefing(selectedProductId));
$("#printButton").addEventListener("click", () => window.print());
$("#downloadButton").addEventListener("click", downloadDecisions);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModals();
    elements.analystDrawer.classList.remove("open");
    elements.analystDrawer.setAttribute("aria-hidden", "true");
    return;
  }
  if (!elements.simulatorScreen.classList.contains("active") || !state) return;
  const scene = currentScene();
  if (scene.type === "choice" && ["1", "2", "3"].includes(event.key) && document.activeElement !== elements.rationaleInput) {
    const choice = scene.choices[Number(event.key) - 1];
    if (choice) {
      selectedChoiceId = choice.id;
      renderChoiceScene(scene);
      updateSubmitState();
    }
  }
  if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && decisionReady(scene)) commitDecision();
});

renderCatalog();
renderCulture();
activate(elements.catalogScreen);
