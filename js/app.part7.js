"use strict";

function render() {
  renderNav();
  const screen = $("screen");
  const chip = $("saveStatus");
  if (chip) chip.textContent = state ? `Saved day ${state.day}` : "No save loaded";
  if (!screen) return;

  if (!state && !["home", "tutorial", "settings"].includes(currentScreen)) currentScreen = "home";
  const screens = {
    home: heroScreen,
    tutorial: tutorialScreen,
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
  const value = input ? Number(input.value) : fallback;
  if (!Number.isFinite(value)) return Math.max(0, finiteNumber(fallback, 0));
  return Math.max(0, value || fallback || 0);
}

const BW = {
  newGame,
  continueGame,
  resetSave,
  finishTutorial() {
    if (state) {
      state.tutorialSeen = true;
      saveGame();
      currentScreen = "market";
    } else {
      currentScreen = "home";
    }
    render();
  },
  advanceDay,
  show(screen) {
    currentScreen = screen;
    render();
  },
  setStreetHookup(hookupId) {
    if (!requireState()) return;
    const hookup = streetHookups().find((h) => h.id === hookupId);
    if (!hookup) return;
    state.activeStreetHookup = hookup.id;
    addLog(`Street hookup switched to ${hookup.name}.`);
    saveGame();
    render();
  },
  buyItem(itemId) {
    if (!requireState()) return;
    const hookup = activeStreetHookup();
    const qty = Math.floor(amountFrom(`buy-${itemId}`, 1));
    const price = streetBuyPrice(itemId, hookup);
    const cost = qty * price;
    if (qty <= 0) return toast("Enter a real amount.");
    if (carriedCount() + qty > state.carriedCapacity) return toast("Not enough carry space.");
    if (!spendCash(cost)) return toast("Not enough pocket cash.");
    let usableQty = qty;
    let bunkNote = "";
    if (Math.random() < hookup.bunk) {
      usableQty = Math.max(0, Math.floor(qty * rand(hookup.qualityMin, hookup.qualityMax)));
      bunkNote = usableQty <= 0 ? " The whole batch was bunk." : ` Only ${usableQty} passed the sniff test.`;
    }
    state.carried[itemId] += usableQty;
    state.sameDayBuys[itemId] = (state.sameDayBuys[itemId] || 0) + usableQty;
    const itemRisk = data.items.find((i) => i.id === itemId).risk;
    state.heat = clamp(state.heat + Math.ceil((itemRisk * qty / 24) + hookup.heat / 5), 0, 100);
    state.turf[state.city] = clamp((state.turf[state.city] || 0) + Math.ceil(hookup.turf * qty / 35), 0, 100);
    addLog(`Bought ${qty} ${itemName(itemId)} from ${hookup.name} for ${money(cost)}.${bunkNote}`);
    saveGame();
    render();
  },
  sellItem(itemId) {
    if (!requireState()) return;
    const hookup = activeStreetHookup();
    const qty = Math.floor(amountFrom(`buy-${itemId}`, 1));
    if (qty <= 0) return toast("Enter a real amount.");
    if ((state.carried[itemId] || 0) < qty) return toast("You are not carrying that many.");
    if (sellableCount(itemId) < qty) return toast("Goods bought today need a new day or city before resale.");
    const sellPrice = streetSellPrice(itemId, hookup);
    const revenue = qty * sellPrice;
    state.carried[itemId] -= qty;
    state.hotCash += revenue;
    const cityTurf = state.turf[state.city] || 0;
    state.turf[state.city] = clamp(cityTurf + Math.ceil((qty / 2) + hookup.turf / 4), 0, 100);
    state.heat = clamp(state.heat + Math.ceil((qty / 8) + hookup.heat / 6), 0, 100);
    addLog(`Sold ${qty} ${itemName(itemId)} through ${hookup.name} for ${money(revenue)} Hot Cash.`);
    saveGame();
    render();
  },
  stashItem(itemId) {
    if (!requireState()) return;
    const qty = Math.floor(amountFrom(`stash-${itemId}`, 1));
    if (qty <= 0) return toast("Enter a real amount.");
    if ((state.carried[itemId] || 0) < qty) return toast("You are not carrying that many.");
    if (qty > availableSafeSlots()) return toast("Safe space is full or reserved for terminal orders.");
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
    state.heat = clamp(state.heat + Math.max(1, destination.heatMod) + Math.ceil(carriedCount() / 10), 0, 100);
    state.turf[state.city] = clamp((state.turf[state.city] || 0) + Math.max(0, destination.turfMod / 2), 0, 100);
    addLog(`Traveled to ${destination.name} for ${money(destination.travelCost)}.`);
    advanceDay("travel");
  },
  convertCurrency() {
    if (!requireState()) return;
    const routeId = $("route")?.value;
    let amount = amountFrom("convert-amount", 0);
    const route = data.conversionRoutes.find((r) => r.id === routeId);
    if (!route || amount <= 0) return toast("Pick a route and amount.");
    const from = route.from;
    const to = route.to;
    let fromValue;
    if (from === "streetCash") {
      if (!Number.isInteger(amount) || amount < 1) return toast("Cash conversions use whole dollars.");
      if (spendableCash() < amount) return toast("Not enough pocket cash.");
      fromValue = amount;
    } else {
      if ((state.coins[from] || 0) < amount) return toast("Not enough coin.");
      fromValue = amount * state.coinPrices[from];
    }
    const afterFee = fromValue * (1 - route.fee);
    let received;
    if (to === "streetCash") {
      received = Math.floor(afterFee);
    } else {
      received = afterFee / state.coinPrices[to];
    }
    if (from === "streetCash") {
      if (!spendCash(amount)) return toast("Not enough pocket cash.");
    } else {
      state.coins[from] -= amount;
    }
    if (to === "streetCash") state.streetCash += received;
    else state.coins[to] += received;
    addLog(`Crypto Carl swapped ${route.label}. Fee: ${Math.round(route.fee * 100)}%.`);
    saveGame();
    render();
  },
  placeTerminalOrder(hookupId) {
    if (!requireState()) return;
    const hookup = hookups().find((v) => v.id === hookupId);
    if (!hookup) return;
    const itemId = $(`term-item-${hookupId}`)?.value;
    const qty = Math.floor(amountFrom(`term-qty-${hookupId}`, 5));
    const quote = terminalPricing(hookup, itemId, qty);
    const coinCost = quote.coinCost;
    if (qty <= 0) return toast("Enter a real amount.");
    if (qty > availableSafeSlots()) return toast(`Safe House only has room for ${availableSafeSlots()} more goods.`);
    if ((state.coins[hookup.coin] || 0) < coinCost) return toast(`Not enough ${data.coins[hookup.coin].name}.`);
    state.coins[hookup.coin] -= coinCost;
    const trace = data.coins[hookup.coin].trace;
    state.heat = clamp(state.heat + Math.ceil(hookup.heat * trace), 0, 100);
    state.terminalOrders.push({
      hookupId,
      vendorId: hookupId,
      itemId,
      qty,
      daysLeft: hookup.delay,
      ghostChance: hookup.ghost,
      bunkChance: hookup.bunk,
      qualityMin: hookup.qualityMin,
      qualityMax: hookup.qualityMax,
      unitPrice: quote.unitPrice,
      bulkDiscount: quote.bulk,
      edgeAfterFees: quote.edgeAfterFees
    });
    const edge = Math.round(quote.edgeAfterFees * 100);
    const bulkText = quote.bulk ? ` with ${Math.round(quote.bulk * 100)}% bulk discount` : "";
    addLog(`Placed a Dark Terminals order with ${hookup.name}: ${qty} ${itemName(itemId)} at ${money(quote.unitPrice)} each${bulkText}. Paid ${coinAmt(coinCost)} ${data.coins[hookup.coin].symbol}. Est. edge after coin fees: ${edge}%.`);
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
    if (spendableCash() < data.bodega.cost) return toast(`You need ${money(data.bodega.cost)} in pocket cash.`);
    spendCash(data.bodega.cost);
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
      if (payload.names) localStorage.setItem(NAMES_KEY, JSON.stringify(sanitizeCustomNames(payload.names)));
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

