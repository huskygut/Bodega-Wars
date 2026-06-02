"use strict";

function dailyBodegaTick() {
  if (!state.bodega.owned) return;
  const income = Math.round(rand(data.bodega.dailyIncomeMin, data.bodega.dailyIncomeMax) * (1 + state.bodega.level * 0.12));
  const bills = Math.round(data.bodega.dailyBills * (1 + state.bodega.level * 0.05));
  const profit = Math.max(0, income - bills);
  state.registerCash += profit;
  state.suspicion = clamp(state.suspicion - 2 - state.bodega.security, 0, 100);
  addLog(`Your Bodega made ${money(profit)} after bills. The cat looked unimpressed.`);
}

function debtTick() {
  if (state.day > 1 && (state.day - 1) % 5 === 0 && state.debt > 0) {
    const interest = Math.ceil(state.debt * 0.1);
    state.debt += interest;
    state.heat = clamp(state.heat + 4, 0, 100);
    addLog(`Loan Shark Larry added ${money(interest)} interest. He called it a friendly reminder.`);
  }
}

function randomEvent(reason) {
  const currentCity = city();
  const turf = state.turf[state.city] || 0;
  const carriedRisk = Math.min(18, Math.floor(carriedCount() / 3));
  const cashRisk = Math.min(15, Math.floor((state.streetCash + state.hotCash) / 2500));
  const chance = 12 + state.heat / 5 + turf / 6 + carriedRisk + cashRisk;
  if (Math.random() * 100 > chance) return;

  const typeRoll = Math.random();
  if (typeRoll < 0.36) {
    const lossCash = Math.round((state.streetCash + state.hotCash) * rand(0.05, 0.18));
    if (lossCash > 0) spendExposedCash(lossCash);
    const item = pick(data.items);
    const lossItems = Math.min(state.carried[item.id] || 0, Math.ceil(rand(1, 4)));
    if (lossItems > 0) state.carried[item.id] -= lossItems;
    state.turf[state.city] = clamp(turf + 7, 0, 100);
    addLog(`Rivals in ${currentCity.name} made a move. You lost ${money(lossCash)}${lossItems ? ` and ${lossItems} ${itemName(item.id)}` : ""}.`);
  } else if (typeRoll < 0.7) {
    const item = pick(data.items);
    const lossItems = Math.min(state.carried[item.id] || 0, Math.ceil(rand(1, 6)));
    if (lossItems > 0) state.carried[item.id] -= lossItems;
    const fine = Math.round(rand(150, 900) * (1 + state.heat / 100));
    spendExposedCash(Math.min(fine, state.streetCash + state.hotCash));
    state.heat = clamp(state.heat + 8, 0, 100);
    addLog(`Heat spiked in ${currentCity.name}. You paid ${money(fine)} in fines and lost ${lossItems} ${itemName(item.id)} from carried inventory.`);
  } else {
    const item = pick(data.items);
    const direction = Math.random() < 0.5 ? -1 : 1;
    const change = direction > 0 ? rand(1.25, 1.8) : rand(0.45, 0.78);
    Object.keys(state.marketPrices).forEach((cityId) => {
      state.marketPrices[cityId][item.id] = Math.max(1, Math.round(state.marketPrices[cityId][item.id] * change));
    });
    addLog(`${itemName(item.id)} prices ${direction > 0 ? "spiked" : "crashed"} after a ${reason} rumor got weird.`);
  }
}

function checkGameOver() {
  if (state.day <= state.maxDays) return false;
  state.gameOver = true;
  saveGame();
  currentScreen = "ending";
  render();
  return true;
}

function advanceDay(reason) {
  if (!state || state.gameOver) return;
  state.day += 1;
  state.sameDayBuys = emptyItemMap();
  state.marketPrices = generateMarketPrices();
  updateCoinMarket();
  processTerminalOrders();
  dailyBodegaTick();
  debtTick();
  state.heat = clamp(state.heat - 2 + Math.max(0, city().heatMod / 5), 0, 100);
  state.turf[state.city] = clamp((state.turf[state.city] || 0) - 1, 0, 100);
  randomEvent(reason || "daily");
  saveGame();
  if (!checkGameOver()) render();
}

function newGame() {
  state = startingState();
  state.marketPrices = generateMarketPrices(state);
  addLog("You opened the doors with debt, pocket cash, and a dream that smells like old coffee.");
  currentScreen = "tutorial";
  state.tutorialSeen = false;
  saveGame();
  render();
  toast("New game started. Read the quick tutorial, then hit the street.");
}

function continueGame() {
  const loaded = loadGame();
  if (!loaded) {
    toast("No save found yet.");
    return;
  }
  state = loaded;
  currentScreen = "home";
  render();
  toast("Save loaded.");
}

function resetSave() {
  if (!confirm("Delete the local Bodega Wars save on this browser?")) return;
  localStorage.removeItem(SAVE_KEY);
  state = null;
  currentScreen = "home";
  render();
  toast("Save deleted.");
}

function renderNav() {
  const nav = $("nav");
  if (!nav) return;
  const items = [
    ["home", "Main Street", true],
    ["tutorial", "How to Play", true],
    ["market", "Street Hookups", !!state],
    ["safe", "Safe House", !!state],
    ["map", "Travel", !!state],
    ["crypto", "Crypto Carl", !!state],
    ["terminals", "Dark Terminals", !!state],
    ["loan", "Loan Shark Larry", !!state],
    ["bodega", "Your Bodega", !!state],
    ["rivals", "Rivals", !!state],
    ["settings", "Settings", true]
  ];
  nav.innerHTML = items.map(([screen, label, enabled]) => `
    <button class="nav-btn ${currentScreen === screen ? "active" : ""} ${enabled ? "" : "locked"}" type="button" ${enabled ? `onclick="BW.show('${screen}')"` : "disabled"}>
      <span>${esc(label)}</span>
    <span>${enabled ? ">" : "x"}</span>
    </button>
  `).join("");
}

function quickActionsHtml() {
  if (!state || state.gameOver) return "";
  return `
    <section class="quick-actions" aria-label="Quick actions">
      <button class="btn day-btn" type="button" onclick="BW.advanceDay('manual')">End Day</button>
      <button class="small-btn secondary" type="button" onclick="BW.show('market')">Dealers</button>
      <button class="small-btn secondary" type="button" onclick="BW.show('safe')">Safe</button>
      <button class="small-btn secondary" type="button" onclick="BW.show('map')">Travel</button>
      <button class="small-btn ghost" type="button" onclick="BW.show('terminals')">Dark Terminals</button>
    </section>
  `;
}

function statsHtml() {
  if (!state) return "";
  return `
    <section class="stats-grid" aria-label="Player stats">
      <div class="stat key-stat"><span>Day</span><strong>${state.day} / ${state.maxDays}</strong></div>
      <div class="stat key-stat"><span>Location</span><strong>${esc(city().name)}</strong></div>
      <div class="stat"><span>Pocket Cash</span><strong>${money(spendableCash())}</strong></div>
      <div class="stat"><span>Safe Cash</span><strong>${money(state.safeCash)}</strong></div>
      <div class="stat"><span>Debt</span><strong>${money(state.debt)}</strong></div>
      <div class="stat"><span>Heat</span><strong>${pct(state.heat)}</strong><div class="meter"><i style="width:${state.heat}%"></i></div></div>
      <div class="stat"><span>Turf</span><strong>${pct(state.turf[state.city] || 0)}</strong><div class="meter"><i style="width:${state.turf[state.city] || 0}%"></i></div></div>
      <div class="stat"><span>Suspicion</span><strong>${pct(state.suspicion)}</strong><div class="meter"><i style="width:${state.suspicion}%"></i></div></div>
      <div class="stat"><span>Carried</span><strong>${carriedCount()} / ${state.carriedCapacity}</strong></div>
      <div class="stat"><span>Net Worth</span><strong>${money(netWorth())}</strong></div>
    </section>
    ${quickActionsHtml()}
  `;
}

function logHtml() {
  if (!state) return "";
  return `
    <section class="card">
      <h3>Street Log</h3>
      <div class="log-list">
        ${state.logs.length ? state.logs.map((x) => `<div class="log-item">${esc(x)}</div>`).join("") : `<div class="log-item">No chaos yet. Give it a minute.</div>`}
      </div>
    </section>
  `;
}

function heroScreen() {
  const hasSave = !!loadGame();
  return `
    <section class="hero" style="background-image:url('${data.images.home}')">
      <div class="hero-content">
        <span class="mini-label">${esc(data.studio)}</span>
        <h2>Bodega Wars</h2>
        <p>A greasy street-market empire simulator where every profit has a problem.</p>
      <p>Buy low, sell weird, stash smart, dodge heat, survive rivals, and build a bodega empire before Larry's interest turns your pockets inside out.</p>
        <div class="actions">
          <button class="btn" type="button" onclick="BW.newGame()">New Game</button>
          <button class="btn secondary" type="button" onclick="BW.continueGame()" ${hasSave ? "" : "disabled"}>Continue</button>
          <button class="btn ghost" type="button" onclick="BW.show('tutorial')">How to Play</button>
          <button class="btn ghost" type="button" onclick="BW.show('settings')">Settings</button>
        </div>
      </div>
    </section>
    ${state ? statsHtml() : ""}
    ${state ? logHtml() : ""}
    <p class="footer-note">Bodega Wars is a fictional parody game. All markets, currencies, goods, vendors, characters, and events are made up for entertainment.</p>
  `;
}

