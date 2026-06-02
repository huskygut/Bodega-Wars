"use strict";

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

function hookups() {
  return Array.isArray(data.hookups) && data.hookups.length
    ? data.hookups
    : (Array.isArray(data.vendors) ? data.vendors : []);
}

function streetHookups() {
  return Array.isArray(data.streetHookups) && data.streetHookups.length ? data.streetHookups : [{
    id: "street_default",
    name: "Street Dealer",
    buyMod: 1,
    sellMod: 1,
    bunk: 0.05,
    heat: 8,
    turf: 8,
    qualityMin: 0.85,
    qualityMax: 1,
    style: "Default hookup",
    tagline: "Plain street pricing."
  }];
}

function activeStreetHookup() {
  return streetHookups().find((h) => h.id === state.activeStreetHookup) || streetHookups()[0];
}

function streetBuyPrice(itemId, hookup = activeStreetHookup()) {
  return Math.max(1, Math.round(currentPrice(itemId) * (Number(hookup.buyMod) || 1)));
}

function streetSellPrice(itemId, hookup = activeStreetHookup()) {
  return Math.max(1, Math.round(currentPrice(itemId) * (Number(hookup.sellMod) || 1)));
}

function carriedCount() {
  return mapCount(state.carried);
}

function safeCount() {
  return mapCount(state.safe);
}

function reservedSafeCount() {
  return (state.terminalOrders || []).reduce((sum, order) => sum + wholeNumber(order.qty, 0, 0, MAX_ITEMS), 0);
}

function availableSafeSlots() {
  return Math.max(0, state.safeCapacity - safeCount() - reservedSafeCount());
}

function sameDayBuyCount(itemId) {
  return state.sameDayBuys?.[itemId] || 0;
}

function sellableCount(itemId) {
  return Math.max(0, (state.carried[itemId] || 0) - sameDayBuyCount(itemId));
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

function spendCashFromPools(amount, pools) {
  amount = moneyValue(amount, 0);
  if (amount <= 0 || spendableCash() < amount) return false;
  const total = pools.reduce((sum, pool) => sum + moneyValue(state[pool], 0), 0);
  if (total < amount) return false;
  pools.forEach((pool) => {
    if (amount <= 0) return;
    const take = Math.min(moneyValue(state[pool], 0), amount);
    state[pool] -= take;
    amount -= take;
  });
  return amount <= 0;
}

function spendCash(amount) {
  return spendCashFromPools(amount, ["streetCash", "registerCash", "hotCash"]);
}

function spendExposedCash(amount) {
  return spendCashFromPools(amount, ["streetCash", "hotCash"]);
}

function currentPrice(itemId) {
  return state.marketPrices?.[state.city]?.[itemId] || data.items.find((i) => i.id === itemId)?.min || 1;
}

function coinEntryFeeMultiplier(coinId) {
  const paths = {
    fraggle: [0.04],
    onion: [0.04, 0.07],
    devil: [0.04, 0.07, 0.10]
  };
  const fees = paths[coinId] || [];
  const retained = fees.reduce((value, fee) => value * (1 - fee), 1);
  return retained > 0 ? 1 / retained : 1;
}

function bulkDiscountRate(qty) {
  qty = Number(qty) || 0;
  if (qty >= 50) return 0.15;
  if (qty >= 25) return 0.10;
  if (qty >= 10) return 0.05;
  return 0;
}

function terminalPricing(hookup, itemId, qty = 5) {
  qty = Math.max(1, Math.floor(Number(qty) || 1));
  const street = currentPrice(itemId);
  const bulk = bulkDiscountRate(qty);
  const unitPrice = Math.max(1, Math.round(street * hookup.priceMod * (1 - bulk)));
  const cashCost = unitPrice * qty;
  const coinCost = cashCost / state.coinPrices[hookup.coin];
  const effectiveCashCost = cashCost * coinEntryFeeMultiplier(hookup.coin);
  const effectiveUnit = effectiveCashCost / qty;
  const rawEdge = 1 - unitPrice / street;
  const edgeAfterFees = 1 - effectiveUnit / street;
  return {
    street,
    unitPrice,
    cashCost,
    coinCost,
    bulk,
    rawEdge,
    edgeAfterFees
  };
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

function coinReportLine(coin, changePct) {
  const up = changePct >= 0;
  const magnitude = Math.abs(changePct);
  if (coin.id === "fraggle") {
    if (magnitude > 28) return up ? "FraggleCoin got pumped by snack-store influencers." : "FraggleCoin holders discovered gravity again.";
    return up ? "FraggleCoin is creeping up on cheap hype." : "FraggleCoin cooled off after the yelling stopped.";
  }
  if (coin.id === "onion") {
    if (magnitude > 38) return up ? "OnionCoin peeled off a big green candle." : "OnionCoin dropped a layer and made traders cry.";
  return up ? "OnionCoin privacy rumors pushed demand higher." : "OnionCoin fees annoyed traders today.";
  }
  if (magnitude > 55) return up ? "DevilCoin ripped upward after Dark Terminals tightened supply." : "DevilCoin face-planted like a haunted slot machine.";
  return up ? "DevilCoin rose while everyone pretended that was normal." : "DevilCoin dipped, hissed, and blamed the chart.";
}

function coinDecisionHint(coin, changePct) {
  const magnitude = Math.abs(changePct);
  if (magnitude < 8) return "Quiet move. Fees may matter more than the chart.";
  if (changePct < 0) return `${coin.symbol} is cheaper today, but dips can keep dipping.`;
  if (magnitude > 35) return `${coin.symbol} has momentum, but buying after a spike is risky.`;
  return `${coin.symbol} is moving up; consider the fees before chasing it.`;
}

function updateCoinMarket() {
  const report = {
    day: state.day,
    lines: [],
    summary: ""
  };

  Object.values(data.coins).forEach((coin) => {
    const old = state.coinPrices[coin.id];
    state.coinLastPrices[coin.id] = old;
    let move = rand(-coin.volatility, coin.volatility);
    let shock = false;
    if (Math.random() < 0.18) {
      move += rand(-coin.volatility * 1.25, coin.volatility * 1.55);
      shock = true;
    }
    const next = Math.max(coin.min, Math.round(old * (1 + move)));
    state.coinPrices[coin.id] = next;
    const change = old ? ((next - old) / old) * 100 : 0;
    report.lines.push({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      old,
      price: next,
      change: Number(change.toFixed(1)),
      shock,
      note: coinReportLine(coin, change),
      hint: coinDecisionHint(coin, change)
    });
  });

  const biggest = report.lines.slice().sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
  report.summary = `${biggest.name} moved ${biggest.change >= 0 ? "+" : ""}${biggest.change.toFixed(1)}%. ${biggest.note}`;
  state.cryptoReports.unshift(report);
  state.cryptoReports = state.cryptoReports.slice(0, 8);
  addLog(`Crypto Report: ${report.summary}`);
}

function processTerminalOrders() {
  state.terminalOrders.forEach((order) => { order.daysLeft -= 1; });
  const arrivals = state.terminalOrders.filter((order) => order.daysLeft <= 0);
  state.terminalOrders = state.terminalOrders.filter((order) => order.daysLeft > 0);

  arrivals.forEach((order) => {
    const hookup = hookups().find((v) => v.id === order.hookupId || v.id === order.vendorId);
    if (!hookup) {
      addLog("A Dark Terminals order vanished because its hookup no longer exists.");
      return;
    }

    const safeRoom = availableSafeSlots();
    if (Math.random() < order.ghostChance) {
      state.heat = clamp(state.heat + hookup.heat, 0, 100);
      addLog(`${hookup.name} ghosted your Dark Terminals order. The terminal hums like it knows something.`);
      return;
    }

    let usableQty = order.qty;
    let qualityNote = "";
    if (Math.random() < order.bunkChance) {
      usableQty = Math.max(1, Math.floor(order.qty * rand(0.22, 0.62)));
      qualityNote = ` The rest was bunk filler and got tossed.`;
      state.heat = clamp(state.heat + Math.ceil(hookup.heat / 2), 0, 100);
    } else {
      usableQty = Math.max(1, Math.round(order.qty * rand(order.qualityMin, order.qualityMax)));
      if (usableQty > order.qty) qualityNote = ` ${hookup.name} included a little extra for once.`;
    }

    const delivered = Math.min(usableQty, safeRoom);
    state.safe[order.itemId] += delivered;
    if (delivered <= 0) addLog(`${hookup.name} delivered ${itemName(order.itemId)}, but your safe was full. Brutal storage math.`);
    else if (delivered < usableQty) addLog(`${hookup.name} delivered ${delivered} usable ${itemName(order.itemId)}, but your safe was too full for the rest.${qualityNote}`);
    else addLog(`${hookup.name} delivered ${delivered} usable ${itemName(order.itemId)} to the Safe House.${qualityNote}`);
    state.heat = clamp(state.heat + Math.ceil(hookup.heat / 2), 0, 100);
  });
}

