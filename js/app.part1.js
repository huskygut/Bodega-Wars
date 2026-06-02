"use strict";

const data = window.BW_DATA;
const SAVE_KEY = "bodega_wars_save_v01";
const NAMES_KEY = "bodega_wars_item_names_v01";
const MAX_MONEY = 999999999;
const MAX_ITEMS = 9999;

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

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function wholeNumber(value, fallback = 0, min = 0, max = MAX_MONEY) {
  return clamp(Math.floor(finiteNumber(value, fallback)), min, max);
}

function moneyValue(value, fallback = 0) {
  return wholeNumber(value, fallback, 0, MAX_MONEY);
}

function meterValue(value, fallback = 0) {
  return clamp(Math.round(finiteNumber(value, fallback)), 0, 100);
}

function mapCount(map) {
  return Object.values(map || {}).reduce((sum, n) => sum + wholeNumber(n, 0, 0, MAX_ITEMS), 0);
}

function normalizedItemMap(source) {
  const map = emptyItemMap();
  data.items.forEach((item) => {
    map[item.id] = wholeNumber(source?.[item.id], 0, 0, MAX_ITEMS);
  });
  return map;
}

function capItemMapToCapacity(map, capacity) {
  let overflow = Math.max(0, mapCount(map) - capacity);
  if (!overflow) return map;
  data.items.slice().reverse().forEach((item) => {
    if (overflow <= 0) return;
    const take = Math.min(map[item.id] || 0, overflow);
    map[item.id] -= take;
    overflow -= take;
  });
  return map;
}

function sanitizeStringList(value, max = 80) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => typeof entry === "string")
    .slice(0, max);
}

function sanitizeCustomNames(names) {
  const custom = {};
  if (!names || typeof names !== "object") return custom;
  data.items.forEach((item) => {
    const raw = typeof names[item.id] === "string" ? names[item.id].trim() : "";
    if (raw) custom[item.id] = raw.slice(0, 28);
  });
  return custom;
}

function sanitizeCryptoReports(value) {
  if (!Array.isArray(value)) return [];
  const validCoins = new Set(Object.keys(data.coins));
  return value.slice(0, 8).map((report) => {
    const lines = Array.isArray(report?.lines) ? report.lines : [];
    return {
      day: wholeNumber(report?.day, 1, 1, data.maxDays + 1),
      summary: typeof report?.summary === "string" ? report.summary.slice(0, 220) : "",
      lines: lines
        .filter((line) => validCoins.has(line?.id))
        .slice(0, Object.keys(data.coins).length)
        .map((line) => ({
          id: line.id,
          name: data.coins[line.id].name,
          symbol: data.coins[line.id].symbol,
          old: moneyValue(line.old, data.coins[line.id].start),
          price: moneyValue(line.price, data.coins[line.id].start),
          change: finiteNumber(line.change, 0),
          shock: !!line.shock,
          note: typeof line.note === "string" ? line.note.slice(0, 180) : "",
          hint: typeof line.hint === "string" ? line.hint.slice(0, 180) : ""
        }))
    };
  }).filter((report) => report.lines.length);
}

function startingState() {
  const turf = {};
  data.cities.forEach((city) => { turf[city.id] = 10 + Math.max(0, city.turfMod); });

  return {
    version: data.version,
    day: 1,
    activeStreetHookup: "cheder_bob",
    maxDays: data.maxDays,
    city: "new_york",
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
    sameDayBuys: emptyItemMap(),
    coins: { fraggle: 0, onion: 0, devil: 0 },
    coinPrices: Object.fromEntries(Object.values(data.coins).map((coin) => [coin.id, coin.start])),
    coinLastPrices: Object.fromEntries(Object.values(data.coins).map((coin) => [coin.id, coin.start])),
    marketPrices: {},
    terminalOrders: [],
    bodega: { owned: false, level: 0, convertLimit: data.bodega.convertLimit, security: 0, storageBonusApplied: false },
    turf,
    logs: [],
    cryptoReports: [],
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
  const source = loaded && typeof loaded === "object" ? loaded : {};
  const merged = { ...fresh, ...source };

  const validCityIds = new Set(data.cities.map((c) => c.id));
  if (!validCityIds.has(merged.city)) merged.city = fresh.city;

  merged.version = data.version;
  merged.maxDays = data.maxDays;
  merged.day = wholeNumber(source.day, fresh.day, 1, data.maxDays + 1);
  merged.streetCash = moneyValue(source.streetCash, fresh.streetCash);
  merged.hotCash = moneyValue(source.hotCash, fresh.hotCash);
  merged.registerCash = moneyValue(source.registerCash, fresh.registerCash);
  merged.safeCash = moneyValue(source.safeCash, fresh.safeCash);
  merged.debt = moneyValue(source.debt, fresh.debt);
  merged.heat = meterValue(source.heat, fresh.heat);
  merged.suspicion = meterValue(source.suspicion, fresh.suspicion);
  merged.carriedCapacity = wholeNumber(source.carriedCapacity, fresh.carriedCapacity, 1, 500);
  merged.safeCapacity = wholeNumber(source.safeCapacity, fresh.safeCapacity, 1, 1000);
  merged.gameOver = !!source.gameOver && merged.day > data.maxDays;
  merged.tutorialSeen = !!source.tutorialSeen;

  merged.carried = capItemMapToCapacity(normalizedItemMap(source.carried), merged.carriedCapacity);
  merged.safe = capItemMapToCapacity(normalizedItemMap(source.safe), merged.safeCapacity);
  merged.sameDayBuys = normalizedItemMap(source.sameDayBuys);
  data.items.forEach((item) => {
    merged.sameDayBuys[item.id] = Math.min(merged.sameDayBuys[item.id] || 0, merged.carried[item.id] || 0);
  });

  merged.coins = { ...fresh.coins };
  Object.keys(data.coins).forEach((coinId) => {
    merged.coins[coinId] = Math.max(0, finiteNumber(source.coins?.[coinId], fresh.coins[coinId]));
  });
  merged.coinPrices = { ...fresh.coinPrices };
  merged.coinLastPrices = { ...fresh.coinLastPrices };
  Object.values(data.coins).forEach((coin) => {
    merged.coinPrices[coin.id] = Math.max(coin.min, moneyValue(source.coinPrices?.[coin.id], fresh.coinPrices[coin.id]));
    merged.coinLastPrices[coin.id] = Math.max(coin.min, moneyValue(source.coinLastPrices?.[coin.id], merged.coinPrices[coin.id]));
  });

  merged.bodega = { ...fresh.bodega, ...(source.bodega && typeof source.bodega === "object" ? source.bodega : {}) };
  merged.bodega.owned = !!merged.bodega.owned;
  merged.bodega.level = merged.bodega.owned ? wholeNumber(merged.bodega.level, 1, 1, 50) : 0;
  merged.bodega.convertLimit = moneyValue(merged.bodega.convertLimit, data.bodega.convertLimit);
  merged.bodega.security = wholeNumber(merged.bodega.security, 0, 0, 50);
  merged.bodega.storageBonusApplied = !!merged.bodega.storageBonusApplied;

  const validStreetHookups = new Set((data.streetHookups || []).map((h) => h.id));
  if (!validStreetHookups.has(merged.activeStreetHookup)) merged.activeStreetHookup = fresh.activeStreetHookup;

  merged.turf = { ...fresh.turf };
  data.cities.forEach((cityDef) => {
    merged.turf[cityDef.id] = meterValue(source.turf?.[cityDef.id], fresh.turf[cityDef.id]);
  });

  merged.logs = source.version === data.version ? sanitizeStringList(source.logs, 80) : [];

  merged.cryptoReports = sanitizeCryptoReports(source.cryptoReports);

  const generated = generateMarketPrices(merged);
  merged.marketPrices = source.marketPrices && typeof source.marketPrices === "object" ? source.marketPrices : {};
  data.cities.forEach((cityDef) => {
    if (!merged.marketPrices[cityDef.id]) merged.marketPrices[cityDef.id] = generated[cityDef.id];
    data.items.forEach((item) => {
      if (!Number.isFinite(Number(merged.marketPrices[cityDef.id][item.id]))) {
        merged.marketPrices[cityDef.id][item.id] = generated[cityDef.id][item.id];
      } else {
        merged.marketPrices[cityDef.id][item.id] = wholeNumber(merged.marketPrices[cityDef.id][item.id], generated[cityDef.id][item.id], 1, MAX_MONEY);
      }
    });
  });

  const terminalHookups = hookups();
  merged.terminalOrders = Array.isArray(source.terminalOrders) ? source.terminalOrders
    .map((order) => {
      const hookup = terminalHookups.find((entry) => entry.id === order?.hookupId || entry.id === order?.vendorId);
      const item = data.items.find((entry) => entry.id === order?.itemId);
      if (!hookup || !item) return null;
      const qty = wholeNumber(order.qty, 1, 1, merged.safeCapacity);
      return {
        hookupId: hookup.id,
        vendorId: hookup.id,
        itemId: item.id,
        qty,
        daysLeft: wholeNumber(order.daysLeft, hookup.delay, 0, 30),
        ghostChance: clamp(finiteNumber(order.ghostChance, hookup.ghost), 0, 1),
        bunkChance: clamp(finiteNumber(order.bunkChance, hookup.bunk), 0, 1),
        qualityMin: clamp(finiteNumber(order.qualityMin, hookup.qualityMin), 0, 2),
        qualityMax: clamp(finiteNumber(order.qualityMax, hookup.qualityMax), 0, 2),
        unitPrice: moneyValue(order.unitPrice, 1),
        bulkDiscount: clamp(finiteNumber(order.bulkDiscount, 0), 0, 1),
        edgeAfterFees: clamp(finiteNumber(order.edgeAfterFees, 0), -1, 1)
      };
    })
    .filter(Boolean)
    .slice(0, 25) : [];
  let reserved = 0;
  merged.terminalOrders = merged.terminalOrders.filter((order) => {
    if (reserved + order.qty > merged.safeCapacity) return false;
    reserved += order.qty;
    return true;
  });

  return merged;
}

