"use strict";

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
          <select id="route" aria-label="Fake coin conversion route">${routeOptions}</select>
          <input id="convert-amount" type="number" min="0.0001" step="0.0001" value="100" aria-label="Fake coin conversion amount">
          <button class="small-btn" type="button" onclick="BW.convertCurrency()">Convert</button>
        </div>
      </section>
      <section class="card">
        <h3>Coin Wallet</h3>
        <p><span class="badge">Fraggle ${coinAmt(state.coins.fraggle)}</span> <span class="badge">Onion ${coinAmt(state.coins.onion)}</span> <span class="badge">Devil ${coinAmt(state.coins.devil)}</span></p>
        <p>DevilCoin creates the least Dark Terminals heat, but it moves like a drunk chainsaw.</p>
      </section>
    </div>
    ${cryptoReportHtml()}
    <section class="card">
      <h3>Fake Coin Market</h3>
      <div class="table-wrap"><table><thead><tr><th>Coin</th><th>Price</th><th>Daily Change</th><th>You Hold</th></tr></thead><tbody>${coinRows}</tbody></table></div>
    </section>
    ${logHtml()}
  `;
}

function terminalsScreen() {
  const hookupCards = hookups().map((hookup) => {
    const coin = data.coins[hookup.coin];
    const estimatedFeeEdge = Math.round((1 - hookup.priceMod * coinEntryFeeMultiplier(hookup.coin)) * 100);
    const itemOptions = data.items.map((item) => {
      const quote = terminalPricing(hookup, item.id, 5);
      const edge = Math.round(quote.edgeAfterFees * 100);
      return `<option value="${item.id}">${itemName(item.id)} - ${money(quote.unitPrice)} each (${edge}% est. edge after coin fees)</option>`;
    }).join("");
    return `
      <section class="card">
        <h3>${esc(hookup.name)}</h3>
        <p>${esc(hookup.tagline)}</p>
        <p><span class="badge">${esc(hookup.style)}</span> <span class="badge">Accepts ${coin.name}</span> <span class="badge">Est. edge ${estimatedFeeEdge}%</span> <span class="badge">Bunk ${Math.round(hookup.bunk * 100)}%</span> <span class="badge">Ghost ${Math.round(hookup.ghost * 100)}%</span> <span class="badge">Delay ${hookup.delay} days</span></p>
        <p class="muted">Bulk discount: 10+ units = 5%, 25+ = 10%, 50+ = 15%. Even after the fake coin ladder fees, the hookup price is meant to beat street prices.</p>
        <div class="inline-form">
          <select id="term-item-${hookup.id}" aria-label="${esc(hookup.name)} terminal order goods">${itemOptions}</select>
          <input id="term-qty-${hookup.id}" type="number" min="1" value="5" aria-label="${esc(hookup.name)} terminal order quantity">
          <button class="small-btn" type="button" onclick="BW.placeTerminalOrder('${hookup.id}')">Order</button>
        </div>
      </section>`;
  }).join("");
  const orders = state.terminalOrders.length ? state.terminalOrders.map((order) => {
    const hookup = hookups().find((v) => v.id === order.hookupId || v.id === order.vendorId) || { name: "Unknown Hookup" };
    return `<div class="log-item">${esc(hookup.name)}: ${order.qty} ${esc(itemName(order.itemId))}, ${order.daysLeft} day(s) left</div>`;
  }).join("") : `<div class="log-item">No pending terminal orders.</div>`;

  return `
    ${statsHtml()}
    <section class="screen-img" style="background-image:url('${data.images.terminals}')"></section>
    <section class="notice">
      <h3>Dark Terminals</h3>
      <p>Dark Terminals uses three fictional hookup people instead of a vendor market. The advantage is wholesale pricing: lower unit cost, bulk discounts, and lower heat on better coin paths. The tradeoff is delay, ghost risk, and possible bunk goods.</p>
      <p><span class="badge">Safe House open slots ${availableSafeSlots()}</span> <span class="badge">Reserved ${reservedSafeCount()}</span></p>
    </section>
    <div class="grid two">${hookupCards}</div>
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
          <input id="debt-pay-amount" type="number" min="1" value="500" aria-label="Debt payment amount">
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
  const canBuy = spendableCash() >= data.bodega.cost;
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
            <input id="convert-hot-amount" type="number" min="1" value="500" aria-label="Hot Cash register amount">
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
        <p>Cost: ${money(data.bodega.cost)} in pocket cash. Owning a bodega unlocks Register Cash, daily legit profit, bigger storage, and the most important upgrade in any empire: a cat that judges your decisions.</p>
        <button class="btn" type="button" onclick="BW.buyBodega()" ${canBuy ? "" : "disabled"}>Buy Bodega</button>
      </section>`}
    ${logHtml()}
  `;
}

