"use strict";

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

function tutorialScreen() {
  const startButton = state
    ? `<button class="btn" type="button" onclick="BW.finishTutorial()">Start Playing</button>`
    : `<button class="btn" type="button" onclick="BW.show('home')">Back to Main Street</button>`;
  const saveTip = state
    ? `<p><span class="badge">Current run</span> Day ${state.day} / ${state.maxDays}. Your best early move is usually buy a few cheap goods, sell where prices are better, then stash cash before trouble finds you.</p>`
    : `<p><span class="badge">No active run</span> Start a new game from Main Street when you are ready.</p>`;
  return `
    ${state ? statsHtml() : ""}
    <section class="screen-img" style="background-image:url('${data.images.home}')"></section>
    <section class="card tutorial-card">
      <span class="mini-label">Quick Tutorial</span>
      <h3>How to Play</h3>
      <p>Your goal is to survive ${data.maxDays} days, pay down debt, build net worth, and eventually own a bodega without letting Heat, Turf, or Suspicion wreck you.</p>
      ${saveTip}
      <div class="tutorial-steps">
        <div class="tutorial-step"><strong>1. Buy low.</strong><span>Use the Market to buy fake goods when the local price looks cheap.</span></div>
        <div class="tutorial-step"><strong>2. Sell high.</strong><span>Travel to another city and sell carried goods when prices jump. Selling creates Hot Cash.</span></div>
        <div class="tutorial-step"><strong>3. Stash smart.</strong><span>Use the Safe House to protect cash and goods. Street Cash and carried goods are easier to lose.</span></div>
        <div class="tutorial-step"><strong>4. Watch danger.</strong><span>Heat means law pressure. Turf means rival pressure. Suspicion means bodega trouble.</span></div>
        <div class="tutorial-step"><strong>5. Use Crypto Carl.</strong><span>Cash can become FraggleCoin, then OnionCoin, then DevilCoin. Every swap has a fee.</span></div>
        <div class="tutorial-step"><strong>6. Try Dark Terminals.</strong><span>Three fictional hookups offer wholesale prices and bulk discounts, but orders can be delayed, ghosted, or partly bunk.</span></div>
        <div class="tutorial-step"><strong>7. Buy the bodega.</strong><span>Once you have enough cash, buy Your Bodega to convert Hot Cash into Register Cash and earn daily profit.</span></div>
        <div class="tutorial-step"><strong>8. End Day.</strong><span>End Day advances prices, coin values, shipments, bills, interest, and random events. On mobile it is the big button near the top.</span></div>
      </div>
    </section>
    <div class="grid two">
      <section class="card">
        <h3>Quick Screen Guide</h3>
        <ul class="how-list">
          <li><strong>Street Hookups:</strong> buy and sell fake goods through Cheder Bob, Crazy Eyes, or Walter Whiteboard.</li>
          <li><strong>Safe House:</strong> protect money and inventory.</li>
          <li><strong>Travel:</strong> move cities and hunt better prices.</li>
          <li><strong>Crypto Carl:</strong> trade fake coins.</li>
          <li><strong>Dark Terminals:</strong> order from three fictional hookups.</li>
          <li><strong>Loan Shark Larry:</strong> pay debt before interest hurts.</li>
          <li><strong>Your Bodega:</strong> buy, upgrade, and run the register.</li>
          <li><strong>Settings:</strong> rename goods, export saves, and return here.</li>
        </ul>
      </section>
      <section class="card">
        <h3>Beginner Advice</h3>
        <ul class="how-list">
          <li>Do not carry everything at once. That makes you a walking pinata.</li>
          <li>Deposit extra cash in the Safe House before ending days.</li>
          <li>Pay Larry when you can. Interest is a greased bear trap.</li>
          <li>Dark Terminals are cheaper, but bunk goods and delays can still bite.</li>
          <li>If Heat or Turf gets high, travel, stash goods, or lay low for a day.</li>
        </ul>
        <div class="actions">${startButton}</div>
      </section>
    </div>
    ${state ? logHtml() : ""}
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
      <h3>How to Play</h3>
      <p>Open the quick tutorial anytime. It explains the money loop, danger meters, Safe House, Crypto Carl, Dark Terminals, and the bodega.</p>
      <div class="actions">
        <button class="btn secondary" type="button" onclick="BW.show('tutorial')">Open How to Play</button>
      </div>
    </section>
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
      <p>Export a save before you mess with things. Browser storage is useful, but browser data can still disappear.</p>
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

