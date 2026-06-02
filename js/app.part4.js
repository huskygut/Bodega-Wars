"use strict";

function marketScreen() {
  const active = activeStreetHookup();
  const dealerOptions = streetHookups().map((hookup) => `
    <option value="${esc(hookup.id)}" ${hookup.id === active.id ? "selected" : ""}>${esc(hookup.name)} - ${esc(hookup.style)}</option>
  `).join("");
  const dealerCards = streetHookups().map((hookup) => {
    const activeClass = hookup.id === active.id ? " selected" : "";
    return `
      <section class="card dealer-card${activeClass}">
        ${hookup.image ? `<img class="dealer-art" src="${esc(hookup.image)}" alt="${esc(hookup.name)}">` : ""}
        <h4>${esc(hookup.name)}</h4>
        <p>${esc(hookup.tagline)}</p>
        <p>
          <span class="badge">Buy ${Math.round(hookup.buyMod * 100)}% street</span>
          <span class="badge">Sell ${Math.round(hookup.sellMod * 100)}% street</span>
          <span class="badge">Bunk ${Math.round(hookup.bunk * 100)}%</span>
          <span class="badge">Heat +${hookup.heat}</span>
        </p>
        <button class="small-btn ${hookup.id === active.id ? "secondary" : ""}" type="button" onclick="BW.setStreetHookup('${hookup.id}')">${hookup.id === active.id ? "Current Hookup" : "Use This Hookup"}</button>
      </section>`;
  }).join("");

  const rows = data.items.map((item) => {
    const base = currentPrice(item.id);
    const buyPrice = streetBuyPrice(item.id, active);
    const sellPrice = streetSellPrice(item.id, active);
    const canBuy = Math.max(0, Math.min(Math.floor(spendableCash() / buyPrice), state.carriedCapacity - carriedCount()));
    const edge = sellPrice - buyPrice;
    const sellable = sellableCount(item.id);
    return `
      <tr>
        <td><strong>${esc(itemName(item.id))}</strong><br><span class="badge">${esc(item.category)}</span> <span class="badge">Risk ${item.risk}</span></td>
        <td>${money(base)}</td>
        <td><strong>${money(buyPrice)}</strong><br><small class="muted">${esc(active.name)}</small></td>
        <td><strong>${money(sellPrice)}</strong><br><small class="${edge >= 0 ? "good" : "bad"}">${edge >= 0 ? "+" : ""}${money(edge)} spread</small></td>
        <td>${state.carried[item.id] || 0}<br><small class="muted">Sellable ${sellable}</small></td>
        <td>${state.safe[item.id] || 0}</td>
        <td>
          <div class="inline-form">
            <input id="buy-${item.id}" type="number" min="1" max="${canBuy}" value="1" aria-label="Amount for ${esc(itemName(item.id))}">
            <button class="small-btn" type="button" onclick="BW.buyItem('${item.id}')">Buy</button>
            <button class="small-btn secondary" type="button" onclick="BW.sellItem('${item.id}')">Sell</button>
          </div>
        </td>
      </tr>`;
  }).join("");

  return `
    ${statsHtml()}
    <section class="screen-img" style="background-image:url('${data.images.items}')"></section>
    <section class="notice">
      <h3>Street Hookups</h3>
      <p>Street buys are instant, but each hookup has different prices, payout, heat, turf pressure, and a small chance of bunk goods. Dark Terminals should beat street on bulk margins, but street is faster.</p>
      <div class="inline-form">
        <label for="street-hookup">Current hookup</label>
        <select id="street-hookup" onchange="BW.setStreetHookup(this.value)">${dealerOptions}</select>
      </div>
    </section>
    <div class="grid three">${dealerCards}</div>
    <section class="card">
      <h3>${esc(city().name)} Street Board</h3>
      <p>Sales create Hot Cash. Hot Cash spends like pocket cash, but the bodega can convert it into Register Cash once you own the place.</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Goods</th><th>Market</th><th>Buy</th><th>Sell</th><th>Carried</th><th>Safe</th><th>Action</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
    <div class="actions">
      <button class="btn secondary" type="button" onclick="BW.advanceDay('market')">End Day / New Prices</button>
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
          <input id="stash-${item.id}" type="number" min="1" value="1" aria-label="Amount to move for ${esc(itemName(item.id))}">
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
          <input id="safe-cash-amount" type="number" min="1" value="500" aria-label="Safe House cash amount">
          <button class="small-btn" type="button" onclick="BW.depositCash()">Deposit</button>
          <button class="small-btn secondary" type="button" onclick="BW.withdrawCash()">Withdraw</button>
        </div>
      </section>
      <section class="card">
        <h3>Wallet Breakdown</h3>
        <p><span class="badge">Street Cash ${money(state.streetCash)}</span> <span class="badge">Hot Cash ${money(state.hotCash)}</span> <span class="badge">Register Cash ${money(state.registerCash)}</span></p>
        <p><span class="badge">Safe ${safeCount()} / ${state.safeCapacity}</span> <span class="badge">Reserved ${reservedSafeCount()}</span> <span class="badge">Open ${availableSafeSlots()}</span> <span class="badge">Carried ${carriedCount()} / ${state.carriedCapacity}</span></p>
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
      <p>Travel costs cash and advances the day. Big cities pay better, but Heat and Turf Pressure climb fast when you get sloppy.</p>
      <div class="table-wrap"><table><thead><tr><th>City</th><th>Cost</th><th>Heat Mod</th><th>Turf</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>
    </section>
    ${logHtml()}
  `;
}

function cryptoReportHtml() {
  const report = state.cryptoReports && state.cryptoReports.length ? state.cryptoReports[0] : null;
  if (!report) {
    return `
      <section class="card">
        <h3>Daily Crypto Report</h3>
        <p>No report yet. End the day once and Crypto Carl will start printing fake wisdom.</p>
      </section>`;
  }
  const lines = report.lines.map((line) => `
    <div class="report-line">
      <strong>${esc(line.name)}</strong>
    <span>${money(line.old)} -> ${money(line.price)}</span>
      <span class="${line.change >= 0 ? "good" : "bad"}">${line.change >= 0 ? "+" : ""}${line.change.toFixed(1)}%</span>
      <small>${esc(line.note)}</small>
      ${line.hint ? `<small>${esc(line.hint)}</small>` : ""}
    </div>
  `).join("");
  const history = state.cryptoReports.slice(1, 4).map((oldReport) => `<div class="log-item">Day ${oldReport.day}: ${esc(oldReport.summary)}</div>`).join("");
  return `
    <section class="card crypto-report">
      <h3>Daily Crypto Report</h3>
      <p><span class="badge">Day ${report.day}</span> ${esc(report.summary)}</p>
      <div class="report-list">${lines}</div>
      ${history ? `<h4>Recent Reports</h4><div class="log-list">${history}</div>` : ""}
    </section>`;
}

