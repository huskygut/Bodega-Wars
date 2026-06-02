(function () {
  "use strict";

  const data = window.BW_DATA;
  const SAVE_KEY = "bodega_wars_save_v01";
  const NAMES_KEY = "bodega_wars_item_names_v01";

  let state = null;
  let currentScreen = "home";

  const $ = (id) => document.getElementById(id);
  const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString()}`;
  const coinAmt = (n) => (Number(n) || 0).toFixed(4).replace(/\.0+$/, "");
  const pct = (n) => `${Math.round(Number(n) || 0)}%`;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const rand = (min, max) => Math.random() * (max - min) + min;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function loadCustomNames() {
    try {
      return JSON.parse(localStorage.getItem(NAMES_KEY) || "{}");
    } catch (_err) {
      return {};
    }
  }

  function itemName(id) {
    const custom = loadCustomNames();
    const item = data.items.find((x) => x.id === id);
    return custom[id] || (item ? item.name : id);
  }

  function emptyItemMap() {
    return Object.fromEntries(data.items.map((item) => [item.id, 0]));
  }

  function startingState() {
    const turf = {};
    data.cities.forEach((city) => { turf[city.id] = 10 + Math.max(0, city.turfMod); });

    return {
      version: data.version,
      day: 1,
      maxDays: data.maxDays,
      city: "omaha",
      streetCash: 2000,
      hotCash: 0,
      registerCash: 0,
      safeCash: 0,
      debt: 5500,
      heat: 12,
      suspicion: 0,
      carriedCapacity: 25,
      safeCapacity: 50,
      carried: emptyItemMap(),
      safe: emptyItemMap(),
      coins: { fraggle: 0, onion: 0, devil: 0 },
      coinPrices: Object.fromEntries(Object.values(data.coins).map((coin) => [coin.id, coin.start])),
      coinLastPrices: Object.fromEntries(Object.values(data.coins).map((coin) => [coin.id, coin.start])),
      marketPrices: {},
      terminalOrders: [],
      bodega: { owned: false, level: 0, convertLimit: data.bodega.convertLimit, security: 0, storageBonusApplied: false },
      upgrades: { lockbox: false, lookout: false, driver: false },
      turf,
      logs: [],
      tutorialSeen: false,
      gameOver: false
    };
  }

  function saveGame() {
    if (!state) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    const chip = $("saveStatus");
    if (chip) chip.textContent = `Saved day ${state.day}`;
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const loaded = JSON.parse(raw);
      if (!loaded || !loaded.version) return null;
      return migrate(loaded);
    } catch (_err) {
      return null;
    }
  }

  function migrate(loaded) {
    const fresh = startingState();
    const merged = { ...fresh, ...loaded };
    merged.carried = { ...fresh.carried, ...(loaded.carried || {}) };
    merged.safe = { ...fresh.safe, ...(loaded.safe || {}) };
    merged.coins = { ...fresh.coins, ...(loaded.coins || {}) };
    merged.turf = { ...fresh.turf, ...(loaded.turf || {}) };
    merged.upgrades = { ...fresh.upgrades, ...(loaded.upgrades || {}) };
    merged.bodega = { ...fresh.bodega, ...(loaded.bodega || {}) };
    merged.logs = Array.isArray(loaded.logs) ? loaded.logs.slice(-80) : [];
    if (!merged.marketPrices || Object.keys(merged.marketPrices).length === 0) {
      merged.marketPrices = generateMarketPrices(merged);
    }
    return merged;
  }

  function addLog(text) {
    if (!state) return;
    state.logs.unshift(`Day ${state.day}: ${text}`);
    state.logs = state.logs.slice(0, 80);
  }

  function toast(text) {
    const el = $("toast");
    if (!el) return;
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 2600);
  }

  function city() {
    return data.cities.find((c) => c.id === state.city) || data.cities[0];
  }

  function carriedCount() {
    return Object.values(state.carried).reduce((sum, n) => sum + Number(n || 0), 0);
  }

  function safeCount() {
    return Object.values(state.safe).reduce((sum, n) => sum + Number(n || 0), 0);
  }

  function spendableCash() {
    return state.streetCash + state.hotCash + state.registerCash;
  }

  function netWorth() {
    let carriedValue = 0;
    let safeValue = 0;
    data.items.forEach((item) => {
      const current = currentPrice(item.id);
      carriedValue += (state.carried[item.id] || 0) * current;
      safeValue += (state.safe[item.id] || 0) * current;
    });
    const coinValue = Object.entries(state.coins).reduce((sum, [id, amount]) => sum + amount * state.coinPrices[id], 0);
    return state.streetCash + state.hotCash + state.registerCash + state.safeCash + carriedValue + safeValue + coinValue - state.debt;
  }

  function spendCash(amount) {
    amount = Math.round(Number(amount) || 0);
    if (amount <= 0 || spendableCash() < amount) return false;
    const takeStreet = Math.min(state.streetCash, amount);
    state.streetCash -= takeStreet;
    amount -= takeStreet;
    const takeRegister = Math.min(state.registerCash, amount);
    state.registerCash -= takeRegister;
    amount -= takeRegister;
    const takeHot = Math.min(state.hotCash, amount);
    state.hotCash -= takeHot;
    amount -= takeHot;
    return amount <= 0;
  }

  function spendCashAndSafe(amount) {
    amount = Math.round(Number(amount) || 0);
    if (amount <= 0 || spendableCash() + state.safeCash < amount) return false;
    const pocket = Math.min(spendableCash(), amount);
    if (pocket > 0) spendCash(pocket);
    state.safeCash -= amount - pocket;
    return true;
  }

  function currentPrice(itemId) {
    return state.marketPrices?.[state.city]?.[itemId] || data.items.find((i) => i.id === itemId)?.min || 1;
  }

  function generateMarketPrices(s = state) {
    const prices = {};
    data.cities.forEach((cityDef) => {
      prices[cityDef.id] = {};
      data.items.forEach((item) => {
        const base = rand(item.min, item.max) * cityDef.priceMod;
        const wobble = rand(1 - item.volatility / 2, 1 + item.volatility / 2);
        prices[cityDef.id][item.id] = Math.max(1, Math.round(base * wobble));
      });
    });
    return prices;
  }

  function updateCoinMarket() {
    Object.values(data.coins).forEach((coin) => {
      const old = state.coinPrices[coin.id];
      state.coinLastPrices[coin.id] = old;
      let move = rand(-coin.volatility, coin.volatility);
      if (Math.random() < 0.16) move += rand(-coin.volatility * 1.15, coin.volatility * 1.35);
      state.coinPrices[coin.id] = Math.max(coin.min, Math.round(old * (1 + move)));
    });

    const event = pick([
      "FraggleCoin traders are yelling about the moon again.",
      "OnionCoin network fees smell like old soup today.",
      "DevilCoin vendors claim everything is fine, which is never fine.",
      "Crypto Carl says the chart has vibes. Nobody knows what that means."
    ]);
    addLog(event);
  }

  function processTerminalOrders() {
    state.terminalOrders.forEach((order) => { order.daysLeft -= 1; });
    const arrivals = state.terminalOrders.filter((order) => order.daysLeft <= 0);
    state.terminalOrders = state.terminalOrders.filter((order) => order.daysLeft > 0);

    arrivals.forEach((order) => {
      const vendor = data.vendors.find((v) => v.id === order.vendorId);
      if (!vendor) {
        addLog("A Dark Terminals order fizzled because the vendor record was missing.");
        return;
      }
      const safeRoom = state.safeCapacity - safeCount();
      if (Math.random() < order.scamChance) {
        state.heat = clamp(state.heat + vendor.heat, 0, 100);
        addLog(`${vendor.name} ghosted your Dark Terminals order. The terminal hums like it knows something.`);
        return;
      }
      const delivered = Math.min(order.qty, safeRoom);
      state.safe[order.itemId] += delivered;
      if (delivered < order.qty) addLog(`${vendor.name} delivered ${delivered} ${itemName(order.itemId)}, but your safe was too full for the rest.`);
      else addLog(`${vendor.name} delivered ${delivered} ${itemName(order.itemId)} to the Safe House.`);
      state.heat = clamp(state.heat + Math.ceil(vendor.heat / 2), 0, 100);
    });
  }

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
      if (lossCash > 0) spendCash(lossCash);
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
      spendCash(Math.min(fine, spendableCash()));
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
    currentScreen = "home";
    saveGame();
    render();
    toast("New game started.");
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
      ["market", "Market", !!state],
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
        <span>${enabled ? "›" : "×"}</span>
      </button>
    `).join("");
  }

  function statsHtml() {
    if (!state) return "";
    return `
      <section class="stats-grid" aria-label="Player stats">
        <div class="stat"><span>Day</span><strong>${state.day} / ${state.maxDays}</strong></div>
        <div class="stat"><span>Location</span><strong>${esc(city().name)}</strong></div>
        <div class="stat"><span>Pocket Cash</span><strong>${money(spendableCash())}</strong></div>
        <div class="stat"><span>Safe Cash</span><strong>${money(state.safeCash)}</strong></div>
        <div class="stat"><span>Debt</span><strong>${money(state.debt)}</strong></div>
        <div class="stat"><span>Heat</span><strong>${pct(state.heat)}</strong><div class="meter"><i style="width:${state.heat}%"></i></div></div>
        <div class="stat"><span>Turf</span><strong>${pct(state.turf[state.city] || 0)}</strong><div class="meter"><i style="width:${state.turf[state.city] || 0}%"></i></div></div>
        <div class="stat"><span>Suspicion</span><strong>${pct(state.suspicion)}</strong><div class="meter"><i style="width:${state.suspicion}%"></i></div></div>
        <div class="stat"><span>Carried</span><strong>${carriedCount()} / ${state.carriedCapacity}</strong></div>
        <div class="stat"><span>Net Worth</span><strong>${money(netWorth())}</strong></div>
      </section>
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
          <p>Buy low, sell weird, stash smart, dodge heat, survive rivals, and build a bodega empire before Larry’s interest turns your pockets inside out.</p>
          <div class="actions">
            <button class="btn" type="button" onclick="BW.newGame()">New Game</button>
            <button class="btn secondary" type="button" onclick="BW.continueGame()" ${hasSave ? "" : "disabled"}>Continue</button>
            <button class="btn ghost" type="button" onclick="BW.show('settings')">Settings</button>
          </div>
        </div>
      </section>
      ${state ? statsHtml() : ""}
      ${state ? logHtml() : ""}
      <p class="footer-note">Bodega Wars is a fictional parody game. All markets, currencies, goods, vendors, characters, and events are made up for entertainment.</p>
    `;
  }

  function marketScreen() {
    const rows = data.items.map((item) => {
      const price = currentPrice(item.id);
      const canBuy = Math.min(Math.floor(spendableCash() / price), state.carriedCapacity - carriedCount());
      return `
        <tr>
          <td><strong>${esc(itemName(item.id))}</strong><br><span class="badge">${esc(item.category)}</span> <span class="badge">Risk ${item.risk}</span></td>
          <td>${money(price)}</td>
          <td>${state.carried[item.id] || 0}</td>
          <td>${state.safe[item.id] || 0}</td>
          <td>
            <div class="inline-form">
              <input id="buy-${item.id}" type="number" min="1" max="${canBuy}" value="1" aria-label="Buy amount for ${esc(itemName(item.id))}">
              <button class="small-btn" type="button" onclick="BW.buyItem('${item.id}')">Buy</button>
              <button class="small-btn secondary" type="button" onclick="BW.sellItem('${item.id}')">Sell</button>
            </div>
          </td>
        </tr>`;
    }).join("");

    return `
      ${statsHtml()}
      <section class="screen-img" style="background-image:url('${data.images.items}')"></section>
      <section class="card">
        <h3>${esc(city().name)} Street Market</h3>
        <p>Street sales create Hot Cash. Hot Cash spends like pocket cash, but the bodega can convert it into Register Cash once you own the place.</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Goods</th><th>Price</th><th>Carried</th><th>Safe</th><th>Action</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>
      <div class="actions">
        <button class="btn secondary" type="button" onclick="BW.advanceDay('market')">End Day</button>
        <button class="btn ghost" type="button" onclick="BW.show('safe')">Go to Safe House</button>
      </div>
      ${logHtml()}
    `;
  }

  function safeScreen() {
    const itemRows = data.items.map((item) => `
      <tr>
        <td><strong>${esc(itemName(item.id))}</strong></td>
        <td>${state.carried[item.id] || 0}</td>
        <td>${state.safe[item.id] || 0}</td>
        <td>
          <div class="inline-form">
            <input id="stash-${item.id}" type="number" min="1" value="1">
            <button class="small-btn" type="button" onclick="BW.stashItem('${item.id}')">Stash</button>
            <button class="small-btn secondary" type="button" onclick="BW.withdrawItem('${item.id}')">Withdraw</button>
          </div>
        </td>
      </tr>
    `).join("");

    return `
      ${statsHtml()}
      <section class="screen-img" style="background-image:url('${data.images.safe}')"></section>
      <div class="grid two">
        <section class="card">
          <h3>Safe Cash</h3>
          <p>Money and goods in the Safe House are protected from normal street robberies. If Heat and Suspicion both get stupid high, all bets get uglier.</p>
          <div class="inline-form">
            <input id="safe-cash-amount" type="number" min="1" value="500">
            <button class="small-btn" type="button" onclick="BW.depositCash()">Deposit</button>
            <button class="small-btn secondary" type="button" onclick="BW.withdrawCash()">Withdraw</button>
          </div>
        </section>
        <section class="card">
          <h3>Wallet Breakdown</h3>
          <p><span class="badge">Street Cash ${money(state.streetCash)}</span> <span class="badge">Hot Cash ${money(state.hotCash)}</span> <span class="badge">Register Cash ${money(state.registerCash)}</span></p>
          <p><span class="badge">Safe ${safeCount()} / ${state.safeCapacity}</span> <span class="badge">Carried ${carriedCount()} / ${state.carriedCapacity}</span></p>
        </section>
      </div>
      <section class="card">
        <h3>Move Goods</h3>
        <div class="table-wrap"><table><thead><tr><th>Goods</th><th>Carried</th><th>Safe</th><th>Action</th></tr></thead><tbody>${itemRows}</tbody></table></div>
      </section>
      ${logHtml()}
    `;
  }

  function travelScreen() {
    const rows = data.cities.map((c) => `
      <tr>
        <td><strong>${esc(c.name)}</strong><br><span class="badge">${esc(c.note)}</span></td>
        <td>${money(c.travelCost)}</td>
        <td>${c.heatMod >= 0 ? "+" : ""}${c.heatMod}</td>
        <td>${pct(state.turf[c.id] || 0)}</td>
        <td><button class="small-btn" type="button" onclick="BW.travel('${c.id}')" ${state.city === c.id ? "disabled" : ""}>Travel</button></td>
      </tr>
    `).join("");
    return `
      ${statsHtml()}
      <section class="screen-img" style="background-image:url('${data.images.map}')"></section>
      <section class="card">
        <h3>City Map</h3>
        <p>Travel costs cash and advances the day. Big cities pay better, but Heat and Turf Pressure climb like raccoons on a dumpster.</p>
        <div class="table-wrap"><table><thead><tr><th>City</th><th>Cost</th><th>Heat Mod</th><th>Turf</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>
      </section>
      ${logHtml()}
    `;
  }

  function cryptoScreen() {
    const coinRows = Object.values(data.coins).map((coin) => {
      const price = state.coinPrices[coin.id];
      const last = state.coinLastPrices[coin.id] || price;
      const change = last ? ((price - last) / last) * 100 : 0;
      return `
        <tr>
          <td><strong>${coin.name}</strong><br><span class="badge">${coin.symbol}</span> <span class="badge">Trace Risk ${Math.round(coin.trace * 100)}%</span></td>
          <td>${money(price)}</td>
          <td style="color:${change >= 0 ? "var(--green)" : "var(--red)"}">${change >= 0 ? "+" : ""}${change.toFixed(1)}%</td>
          <td>${coinAmt(state.coins[coin.id])}</td>
        </tr>`;
    }).join("");
    const routeOptions = data.conversionRoutes.map((route) => `<option value="${route.id}">${route.label} (${Math.round(route.fee * 100)}% fee)</option>`).join("");
    return `
      ${statsHtml()}
      <section class="screen-img" style="background-image:url('${data.images.crypto}')"></section>
      <div class="grid two">
        <section class="card">
          <h3>Crypto Carl</h3>
          <p>Carl runs the fake coin ladder. Cash turns into FraggleCoin, FraggleCoin turns into OnionCoin, and OnionCoin turns into DevilCoin. The chart is fake. The pain is real.</p>
          <div class="inline-form">
            <select id="route">${routeOptions}</select>
            <input id="convert-amount" type="number" min="0.0001" step="0.0001" value="100">
            <button class="small-btn" type="button" onclick="BW.convertCurrency()">Convert</button>
          </div>
        </section>
        <section class="card">
          <h3>Coin Wallet</h3>
          <p><span class="badge">Fraggle ${coinAmt(state.coins.fraggle)}</span> <span class="badge">Onion ${coinAmt(state.coins.onion)}</span> <span class="badge">Devil ${coinAmt(state.coins.devil)}</span></p>
          <p>DevilCoin creates the least Dark Terminals heat, but it moves like a drunk chainsaw.</p>
        </section>
      </div>
      <section class="card">
        <h3>Fake Coin Market</h3>
        <div class="table-wrap"><table><thead><tr><th>Coin</th><th>Price</th><th>Daily Change</th><th>You Hold</th></tr></thead><tbody>${coinRows}</tbody></table></div>
      </section>
      ${logHtml()}
    `;
  }

  function terminalsScreen() {
    const vendorCards = data.vendors.map((vendor) => {
      const coin = data.coins[vendor.coin];
      const itemOptions = data.items.map((item) => `<option value="${item.id}">${itemName(item.id)} at about ${money(Math.round(currentPrice(item.id) * vendor.priceMod))}</option>`).join("");
      return `
        <section class="card">
          <h3>${esc(vendor.name)}</h3>
          <p>${esc(vendor.tagline)}</p>
          <p><span class="badge">Accepts ${coin.name}</span> <span class="badge">Scam ${Math.round(vendor.scam * 100)}%</span> <span class="badge">Delay ${vendor.delay} days</span></p>
          <div class="inline-form">
            <select id="term-item-${vendor.id}">${itemOptions}</select>
            <input id="term-qty-${vendor.id}" type="number" min="1" value="5">
            <button class="small-btn" type="button" onclick="BW.placeTerminalOrder('${vendor.id}')">Order</button>
          </div>
        </section>`;
    }).join("");
    const orders = state.terminalOrders.length ? state.terminalOrders.map((order) => {
      const vendor = data.vendors.find((v) => v.id === order.vendorId);
      return `<div class="log-item">${esc(vendor.name)}: ${order.qty} ${esc(itemName(order.itemId))}, ${order.daysLeft} day(s) left</div>`;
    }).join("") : `<div class="log-item">No pending terminal orders.</div>`;

    return `
      ${statsHtml()}
      <section class="screen-img" style="background-image:url('${data.images.terminals}')"></section>
      <section class="notice">
        <h3>Dark Terminals</h3>
        <p>All vendors, sites, currencies, and goods are fictional parody. Orders arrive at the Safe House if the vendor does not pull goblin nonsense.</p>
      </section>
      <div class="grid two">${vendorCards}</div>
      <section class="card">
        <h3>Pending Orders</h3>
        <div class="log-list">${orders}</div>
      </section>
      ${logHtml()}
    `;
  }

  function loanScreen() {
    return `
      ${statsHtml()}
      <section class="screen-img" style="background-image:url('${data.images.loan}')"></section>
      <div class="grid two">
        <section class="card">
          <h3>Loan Shark Larry</h3>
          <p>Larry adds 10% interest every 5 days. He calls it math. You call it a boot on your neck.</p>
          <div class="inline-form">
            <input id="debt-pay-amount" type="number" min="1" value="500">
            <button class="small-btn" type="button" onclick="BW.payDebt()">Pay Debt</button>
            <button class="small-btn danger" type="button" onclick="BW.borrowMore()">Borrow $1,000</button>
          </div>
        </section>
        <section class="card">
          <h3>Debt Status</h3>
          <p><span class="badge">Debt ${money(state.debt)}</span> <span class="badge">Next interest day ${5 - ((state.day - 1) % 5)} day(s)</span></p>
          <p>Paying debt lowers pressure. Borrowing more is usually dumb, which is exactly why the button exists.</p>
        </section>
      </div>
      ${logHtml()}
    `;
  }

  function bodegaScreen() {
    const availableCash = spendableCash() + state.safeCash;
    const canBuy = availableCash >= data.bodega.cost;
    const owned = state.bodega.owned;
    return `
      ${statsHtml()}
      <section class="screen-img" style="background-image:url('${data.images.bodega}')"></section>
      ${owned ? `
        <div class="grid two">
          <section class="card">
            <h3>Your Bodega</h3>
            <p>Run Hot Cash through the register in an abstract parody business system. Push too much and Suspicion climbs.</p>
            <p><span class="badge">Level ${state.bodega.level}</span> <span class="badge">Daily convert limit ${money(state.bodega.convertLimit)}</span> <span class="badge">Security ${state.bodega.security}</span></p>
            <div class="inline-form">
              <input id="convert-hot-amount" type="number" min="1" value="500">
              <button class="small-btn" type="button" onclick="BW.convertHotCash()">Run Register</button>
            </div>
          </section>
          <section class="card">
            <h3>Upgrades</h3>
            <p>Upgrade the store to raise limits, cut suspicion, and make the cat smugger.</p>
            <button class="small-btn" type="button" onclick="BW.upgradeBodega()">Upgrade Bodega ${money(6000 + state.bodega.level * 3500)}</button>
            <button class="small-btn secondary" type="button" onclick="BW.buySecurity()">Buy Security ${money(2500 + state.bodega.security * 2200)}</button>
          </section>
        </div>` : `
        <section class="card">
          <h3>Buy a Bodega</h3>
          <p>Cost: ${money(data.bodega.cost)}. Pocket Cash plus Safe Cash available: ${money(availableCash)}. Owning a bodega unlocks Register Cash, daily legit profit, bigger storage, and the most important upgrade in any empire: a cat that judges your decisions.</p>
          <button class="btn" type="button" onclick="BW.buyBodega()" ${canBuy ? "" : "disabled"}>Buy Bodega</button>
        </section>`}
      ${logHtml()}
    `;
  }

  function rivalsScreen() {
    return `
      ${statsHtml()}
      <section class="screen-img" style="background-image:url('${data.images.rivals}')"></section>
      <section class="card">
        <h3>The Coupon Cartel</h3>
        <p>Rivals apply Turf Pressure when you dominate a city, undercut prices, or get too loud. The Coupon Cartel is not impressed by your little spreadsheet empire.</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>City</th><th>Turf Pressure</th><th>Move</th></tr></thead>
            <tbody>${data.cities.map((c) => `<tr><td>${esc(c.name)}</td><td>${pct(state.turf[c.id] || 0)}</td><td><button class="small-btn secondary" onclick="BW.payTribute('${c.id}')">Pay Tribute ${money(500 + (state.turf[c.id] || 0) * 18)}</button></td></tr>`).join("")}</tbody>
          </table>
        </div>
      </section>
      ${logHtml()}
    `;
  }

  function settingsScreen() {
    const custom = loadCustomNames();
    const renameRows = data.items.map((item) => `
      <div class="inline-form">
        <label style="min-width:190px" for="rename-${item.id}">${esc(item.name)}</label>
        <input id="rename-${item.id}" type="text" maxlength="28" value="${esc(custom[item.id] || item.name)}">
      </div>
    `).join("");
    return `
      <section class="card">
        <h3>Settings</h3>
        <p>Rename the goods without breaking the save. The game tracks item IDs under the hood, not whatever beautiful nonsense you type here.</p>
        <div class="row">${renameRows}</div>
        <div class="actions">
          <button class="btn" type="button" onclick="BW.saveNames()">Save Item Names</button>
          <button class="btn ghost" type="button" onclick="BW.resetNames()">Reset Item Names</button>
        </div>
      </section>
      <section class="card">
        <h3>Save Tools</h3>
        <p>Export a save before you mess with things. Browser storage is useful, but browsers can still act like goblins.</p>
        <div class="actions">
          <button class="btn secondary" type="button" onclick="BW.exportSave()">Export Save</button>
          <button class="btn secondary" type="button" onclick="BW.importSavePrompt()">Import Save</button>
          <button class="btn danger" type="button" onclick="BW.resetSave()">Delete Save</button>
        </div>
        <textarea id="save-text" placeholder="Exported save data appears here. Paste save data here before importing."></textarea>
      </section>
    `;
  }

  function endingScreen() {
    const worth = netWorth();
    let title = "Broke Goblin Ending";
    let text = "You survived, technically, but Larry is already pricing cardboard boxes.";
    if (worth > 100000 && state.bodega.owned && state.debt <= 0) {
      title = "Mini-Mart Mogul Ending";
      text = "Debt cleared, bodega running, rivals annoyed. The cat accepts your offering.";
    } else if (state.bodega.owned && worth > 25000) {
      title = "Bodega Boss Ending";
      text = "You built a greasy little empire and lived to count the register cash.";
    } else if (worth > 0) {
      title = "Street Hustler Ending";
      text = "You made it out ahead, but the bodega dream is still sitting under fluorescent lights.";
    }
    if (state.suspicion >= 100) {
      title = "Audited Idiot Ending";
      text = "Your bodega sold too much imaginary gum and the numbers got weird.";
    }
    return `
      <section class="hero" style="background-image:url('${data.images.home}')">
        <div class="hero-content">
          <span class="mini-label">Game Over</span>
          <h2>${esc(title)}</h2>
          <p>${esc(text)}</p>
          <p>Final net worth: ${money(worth)}</p>
          <div class="actions">
            <button class="btn" onclick="BW.newGame()">Play Again</button>
            <button class="btn secondary" onclick="BW.show('settings')">Export Save</button>
          </div>
        </div>
      </section>
      ${logHtml()}
    `;
  }

  function render() {
    renderNav();
    const screen = $("screen");
    const chip = $("saveStatus");
    if (chip) chip.textContent = state ? `Saved day ${state.day}` : "No save loaded";
    if (!screen) return;

    if (!state && !["home", "settings"].includes(currentScreen)) currentScreen = "home";
    const screens = {
      home: heroScreen,
      market: marketScreen,
      safe: safeScreen,
      map: travelScreen,
      crypto: cryptoScreen,
      terminals: terminalsScreen,
      loan: loanScreen,
      bodega: bodegaScreen,
      rivals: rivalsScreen,
      settings: settingsScreen,
      ending: endingScreen
    };
    screen.innerHTML = (screens[currentScreen] || heroScreen)();
    screen.focus({ preventScroll: true });
  }

  function requireState() {
    if (!state) {
      toast("Start or continue a game first.");
      return false;
    }
    return true;
  }

  function amountFrom(id, fallback) {
    const input = $(id);
    if (!input) return fallback || 0;
    const raw = String(input.value || "").trim();
    if (raw === "") return fallback || 0;
    const value = Number(raw);
    if (!Number.isFinite(value)) return fallback || 0;
    return Math.max(0, value);
  }

  const BW = {
    newGame,
    continueGame,
    resetSave,
    advanceDay,
    show(screen) {
      currentScreen = screen;
      render();
      const nav = $("nav");
      if (nav) nav.classList.remove("open");
    },
    buyItem(itemId) {
      if (!requireState()) return;
      const qty = Math.floor(amountFrom(`buy-${itemId}`, 1));
      const price = currentPrice(itemId);
      const cost = qty * price;
      if (qty <= 0) return toast("Enter a real amount.");
      if (carriedCount() + qty > state.carriedCapacity) return toast("Not enough carry space.");
      if (!spendCash(cost)) return toast("Not enough pocket cash.");
      state.carried[itemId] += qty;
      state.heat = clamp(state.heat + Math.ceil(data.items.find((i) => i.id === itemId).risk * qty / 20), 0, 100);
      addLog(`Bought ${qty} ${itemName(itemId)} for ${money(cost)}.`);
      saveGame();
      render();
    },
    sellItem(itemId) {
      if (!requireState()) return;
      const qty = Math.floor(amountFrom(`buy-${itemId}`, 1));
      if (qty <= 0) return toast("Enter a real amount.");
      if ((state.carried[itemId] || 0) < qty) return toast("You are not carrying that many.");
      const revenue = qty * currentPrice(itemId);
      state.carried[itemId] -= qty;
      state.hotCash += revenue;
      const cityTurf = state.turf[state.city] || 0;
      state.turf[state.city] = clamp(cityTurf + Math.ceil(qty / 2), 0, 100);
      state.heat = clamp(state.heat + Math.ceil(qty / 8), 0, 100);
      addLog(`Sold ${qty} ${itemName(itemId)} for ${money(revenue)} Hot Cash.`);
      saveGame();
      render();
    },
    stashItem(itemId) {
      if (!requireState()) return;
      const qty = Math.floor(amountFrom(`stash-${itemId}`, 1));
      if (qty <= 0) return toast("Enter a real amount.");
      if ((state.carried[itemId] || 0) < qty) return toast("You are not carrying that many.");
      if (safeCount() + qty > state.safeCapacity) return toast("Safe is full.");
      state.carried[itemId] -= qty;
      state.safe[itemId] += qty;
      addLog(`Stashed ${qty} ${itemName(itemId)} in the Safe House.`);
      saveGame();
      render();
    },
    withdrawItem(itemId) {
      if (!requireState()) return;
      const qty = Math.floor(amountFrom(`stash-${itemId}`, 1));
      if (qty <= 0) return toast("Enter a real amount.");
      if ((state.safe[itemId] || 0) < qty) return toast("Not that many in the safe.");
      if (carriedCount() + qty > state.carriedCapacity) return toast("Not enough carry space.");
      state.safe[itemId] -= qty;
      state.carried[itemId] += qty;
      addLog(`Withdrew ${qty} ${itemName(itemId)} from the Safe House.`);
      saveGame();
      render();
    },
    depositCash() {
      if (!requireState()) return;
      const amount = Math.round(amountFrom("safe-cash-amount", 500));
      if (!spendCash(amount)) return toast("Not enough pocket cash.");
      state.safeCash += amount;
      addLog(`Deposited ${money(amount)} in the Safe House.`);
      saveGame();
      render();
    },
    withdrawCash() {
      if (!requireState()) return;
      const amount = Math.round(amountFrom("safe-cash-amount", 500));
      if (state.safeCash < amount) return toast("Not enough safe cash.");
      state.safeCash -= amount;
      state.streetCash += amount;
      addLog(`Withdrew ${money(amount)} from the Safe House.`);
      saveGame();
      render();
    },
    travel(cityId) {
      if (!requireState()) return;
      const destination = data.cities.find((c) => c.id === cityId);
      if (!destination || destination.id === state.city) return;
      if (!spendCash(destination.travelCost)) return toast("Not enough pocket cash for travel.");
      state.city = destination.id;
      state.heat = clamp(state.heat + destination.heatMod + Math.ceil(carriedCount() / 10), 0, 100);
      state.turf[state.city] = clamp((state.turf[state.city] || 0) + Math.max(0, destination.turfMod / 2), 0, 100);
      addLog(`Traveled to ${destination.name} for ${money(destination.travelCost)}.`);
      advanceDay("travel");
    },
    convertCurrency() {
      if (!requireState()) return;
      const routeId = $("route")?.value;
      const route = data.conversionRoutes.find((r) => r.id === routeId);
      const amount = route?.from === "streetCash" ? Math.round(amountFrom("convert-amount", 0)) : amountFrom("convert-amount", 0);
      if (!route || amount <= 0) return toast("Pick a route and amount.");
      const from = route.from;
      const to = route.to;
      let fromValue;
      if (from === "streetCash") {
        if (spendableCash() < amount) return toast("Not enough pocket cash.");
        fromValue = amount;
      } else {
        if ((state.coins[from] || 0) < amount) return toast("Not enough coin.");
        fromValue = amount * state.coinPrices[from];
      }
      const afterFee = fromValue * (1 - route.fee);
      let received;
      if (to === "streetCash") {
        received = afterFee;
      } else {
        received = afterFee / state.coinPrices[to];
      }
      if (from === "streetCash") spendCash(amount);
      else state.coins[from] -= amount;
      if (to === "streetCash") state.streetCash += Math.round(received);
      else state.coins[to] += received;
      addLog(`Crypto Carl swapped ${route.label}. Fee: ${Math.round(route.fee * 100)}%.`);
      saveGame();
      render();
    },
    placeTerminalOrder(vendorId) {
      if (!requireState()) return;
      const vendor = data.vendors.find((v) => v.id === vendorId);
      if (!vendor) return;
      const itemId = $(`term-item-${vendorId}`)?.value;
      if (!data.items.some((item) => item.id === itemId)) return toast("Pick a real fake item.");
      const qty = Math.floor(amountFrom(`term-qty-${vendorId}`, 5));
      const price = Math.round(currentPrice(itemId) * vendor.priceMod);
      const costCash = price * qty;
      const coinCost = costCash / state.coinPrices[vendor.coin];
      if (qty <= 0) return toast("Enter a real amount.");
      if ((state.coins[vendor.coin] || 0) < coinCost) return toast(`Not enough ${data.coins[vendor.coin].name}.`);
      state.coins[vendor.coin] -= coinCost;
      const trace = data.coins[vendor.coin].trace;
      state.heat = clamp(state.heat + Math.ceil(vendor.heat * trace), 0, 100);
      state.terminalOrders.push({ vendorId, itemId, qty, daysLeft: vendor.delay, scamChance: vendor.scam });
      addLog(`Placed a Dark Terminals order with ${vendor.name}: ${qty} ${itemName(itemId)} for ${coinAmt(coinCost)} ${data.coins[vendor.coin].symbol}.`);
      saveGame();
      render();
    },
    payDebt() {
      if (!requireState()) return;
      const amount = Math.min(Math.round(amountFrom("debt-pay-amount", 500)), state.debt);
      if (!spendCash(amount)) return toast("Not enough pocket cash.");
      state.debt -= amount;
      state.heat = clamp(state.heat - Math.ceil(amount / 800), 0, 100);
      addLog(`Paid Larry ${money(amount)}. He still looked disappointed.`);
      saveGame();
      render();
    },
    borrowMore() {
      if (!requireState()) return;
      state.streetCash += 1000;
      state.debt += 1400;
      state.heat = clamp(state.heat + 5, 0, 100);
      addLog("Borrowed $1,000 from Larry. Somehow you owe $1,400. Classic Larry.");
      saveGame();
      render();
    },
    buyBodega() {
      if (!requireState()) return;
      if (state.bodega.owned) return;
      if (!spendCashAndSafe(data.bodega.cost)) return toast(`You need ${money(data.bodega.cost)} between Pocket Cash and Safe Cash.`);
      state.bodega.owned = true;
      state.bodega.level = 1;
      if (!state.bodega.storageBonusApplied) {
        state.safeCapacity += data.bodega.safeBonus;
        state.bodega.storageBonusApplied = true;
      }
      addLog("Bought your first bodega. The cat immediately claimed the best spot.");
      saveGame();
      render();
    },
    convertHotCash() {
      if (!requireState()) return;
      if (!state.bodega.owned) return toast("Buy the bodega first.");
      const amount = Math.min(Math.round(amountFrom("convert-hot-amount", 500)), state.hotCash, state.bodega.convertLimit);
      if (amount <= 0) return toast("No Hot Cash available or amount too high.");
      const fee = Math.round(amount * data.bodega.convertFee);
      const clean = amount - fee;
      state.hotCash -= amount;
      state.registerCash += clean;
      state.suspicion = clamp(state.suspicion + Math.ceil((amount / 1000) * data.bodega.suspicionPerThousand) - state.bodega.security, 0, 100);
      addLog(`Ran ${money(amount)} through the register. Got ${money(clean)} Register Cash after store nonsense.`);
      saveGame();
      render();
    },
    upgradeBodega() {
      if (!requireState()) return;
      const cost = 6000 + state.bodega.level * 3500;
      if (!state.bodega.owned) return toast("Buy the bodega first.");
      if (!spendCash(cost)) return toast("Not enough pocket cash.");
      state.bodega.level += 1;
      state.bodega.convertLimit += 750;
      state.safeCapacity += 10;
      state.suspicion = clamp(state.suspicion - 5, 0, 100);
      addLog(`Upgraded Your Bodega to level ${state.bodega.level}.`);
      saveGame();
      render();
    },
    buySecurity() {
      if (!requireState()) return;
      const cost = 2500 + state.bodega.security * 2200;
      if (!state.bodega.owned) return toast("Buy the bodega first.");
      if (!spendCash(cost)) return toast("Not enough pocket cash.");
      state.bodega.security += 1;
      state.suspicion = clamp(state.suspicion - 8, 0, 100);
      addLog("Bought bodega security. The cat approved, barely.");
      saveGame();
      render();
    },
    payTribute(cityId) {
      if (!requireState()) return;
      const c = data.cities.find((x) => x.id === cityId);
      const cost = 500 + (state.turf[cityId] || 0) * 18;
      if (!spendCash(cost)) return toast("Not enough pocket cash.");
      state.turf[cityId] = clamp((state.turf[cityId] || 0) - 18, 0, 100);
      addLog(`Paid tribute in ${c.name}. The Coupon Cartel clipped a coupon for your dignity.`);
      saveGame();
      render();
    },
    saveNames() {
      const custom = {};
      data.items.forEach((item) => {
        const raw = $(`rename-${item.id}`)?.value.trim();
        custom[item.id] = raw || item.name;
      });
      localStorage.setItem(NAMES_KEY, JSON.stringify(custom));
      toast("Item names saved.");
      render();
    },
    resetNames() {
      localStorage.removeItem(NAMES_KEY);
      toast("Item names reset.");
      render();
    },
    exportSave() {
      const text = $("save-text");
      const payload = JSON.stringify({ save: state, names: loadCustomNames() }, null, 2);
      if (text) text.value = payload;
      navigator.clipboard?.writeText(payload).catch(() => {});
      toast("Save exported. It is also in the text box.");
    },
    importSavePrompt() {
      const raw = $("save-text")?.value.trim();
      if (!raw) return toast("Paste exported save data into the box first.");
      try {
        const payload = JSON.parse(raw);
        if (payload.names) localStorage.setItem(NAMES_KEY, JSON.stringify(payload.names));
        state = migrate(payload.save || payload);
        saveGame();
        currentScreen = "home";
        render();
        toast("Save imported.");
      } catch (_err) {
        toast("That save data did not import.");
      }
    }
  };

  window.BW = BW;

  document.addEventListener("DOMContentLoaded", () => {
    $("mobileMenuButton")?.addEventListener("click", () => $("nav")?.classList.toggle("open"));
    state = loadGame();
    render();
  });
}());
