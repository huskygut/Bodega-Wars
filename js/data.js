(function () {
  window.BW_DATA = {
    version: "0.1.0",
    studio: "Huskygut Studios",
    maxDays: 30,
    images: {
      home: "assets/images/main-street-bodega.png",
      terminals: "assets/images/dark-terminals.png",
      crypto: "assets/images/crypto-carl.png",
      bodega: "assets/images/your-bodega.png",
      loan: "assets/images/loan-shark-larry.png",
      rivals: "assets/images/coupon-cartel.png",
      heat: "assets/images/heat-warning.png",
      safe: "assets/images/safe-house.png",
      map: "assets/images/city-map.png",
      items: "assets/images/item-sheet.png",
      coins: "assets/images/coin-sheet.png"
    },
    cities: [
      { id: "brock", name: "Brock", travelCost: 80, heatMod: -8, turfMod: -5, priceMod: 0.85, note: "Tiny market, weird swings, everyone knows too much." },
      { id: "omaha", name: "Omaha", travelCost: 160, heatMod: 0, turfMod: 0, priceMod: 1.0, note: "Balanced starter market with decent volume." },
      { id: "lincoln", name: "Lincoln", travelCost: 130, heatMod: 8, turfMod: -4, priceMod: 0.95, note: "More law pressure, less rival noise." },
      { id: "kansas_city", name: "Kansas City", travelCost: 240, heatMod: 4, turfMod: 10, priceMod: 1.08, note: "Better profits, tougher rivals." },
      { id: "chicago", name: "Chicago", travelCost: 420, heatMod: 16, turfMod: 12, priceMod: 1.25, note: "Big market, big heat, big mistakes." },
      { id: "denver", name: "Denver", travelCost: 360, heatMod: 5, turfMod: 4, priceMod: 1.12, note: "Fake coin weirdos love this place." },
      { id: "las_vegas", name: "Las Vegas", travelCost: 520, heatMod: 8, turfMod: 15, priceMod: 1.3, note: "Wild prices and scammy vendors." },
      { id: "new_york", name: "New York", travelCost: 720, heatMod: 20, turfMod: 18, priceMod: 1.45, note: "Huge money. Huge danger. Tiny patience." }
    ],
    items: [
      { id: "mystery_vapes", name: "Mystery Vapes", min: 45, max: 260, volatility: 0.34, risk: 6, category: "common" },
      { id: "rare_hot_sauce", name: "Rare Hot Sauce", min: 30, max: 220, volatility: 0.42, risk: 3, category: "food" },
      { id: "imported_snacks", name: "Imported Snacks", min: 20, max: 140, volatility: 0.27, risk: 2, category: "food" },
      { id: "bootleg_chargers", name: "Bootleg Chargers", min: 65, max: 420, volatility: 0.36, risk: 5, category: "tech" },
      { id: "counterfeit_ai_chips", name: "Counterfeit AI Chips", min: 240, max: 1800, volatility: 0.55, risk: 12, category: "tech" },
      { id: "gas_station_sushi", name: "Gas Station Sushi", min: 10, max: 95, volatility: 0.75, risk: 8, category: "weird" },
      { id: "quantum_moon_cakes", name: "Quantum Moon Cakes", min: 180, max: 1500, volatility: 0.62, risk: 10, category: "rare" },
      { id: "off_brand_sneakers", name: "Off-Brand Sneakers", min: 90, max: 720, volatility: 0.31, risk: 4, category: "luxury" },
      { id: "backroom_energy_drinks", name: "Backroom Energy Drinks", min: 25, max: 180, volatility: 0.44, risk: 5, category: "common" },
      { id: "cursed_phone_cases", name: "Cursed Phone Cases", min: 75, max: 650, volatility: 0.5, risk: 7, category: "weird" }
    ],
    coins: {
      fraggle: { id: "fraggle", name: "FraggleCoin", symbol: "FRAG", start: 100, min: 15, volatility: 0.15, trace: 0.7 },
      onion: { id: "onion", name: "OnionCoin", symbol: "ONION", start: 500, min: 60, volatility: 0.28, trace: 0.32 },
      devil: { id: "devil", name: "DevilCoin", symbol: "DEVIL", start: 2000, min: 150, volatility: 0.52, trace: 0.05 }
    },
    conversionRoutes: [
      { id: "cash_to_fraggle", from: "streetCash", to: "fraggle", fee: 0.04, label: "Cash to FraggleCoin" },
      { id: "fraggle_to_onion", from: "fraggle", to: "onion", fee: 0.07, label: "FraggleCoin to OnionCoin" },
      { id: "onion_to_devil", from: "onion", to: "devil", fee: 0.10, label: "OnionCoin to DevilCoin" },
      { id: "devil_to_onion", from: "devil", to: "onion", fee: 0.14, label: "DevilCoin to OnionCoin" },
      { id: "onion_to_fraggle", from: "onion", to: "fraggle", fee: 0.10, label: "OnionCoin to FraggleCoin" },
      { id: "fraggle_to_cash", from: "fraggle", to: "streetCash", fee: 0.08, label: "FraggleCoin to Cash" }
    ],
    vendors: [
      { id: "darrkmart", name: "DarrkMart", coin: "devil", priceMod: 0.78, scam: 0.18, delay: 2, heat: 3, tagline: "Probably ships. Probably legal somewhere." },
      { id: "packet_goblin", name: "Packet Goblin Market", coin: "onion", priceMod: 0.9, scam: 0.13, delay: 1, heat: 8, tagline: "Your package may arrive. Your dignity may not." },
      { id: "shadow_bodega", name: "ShadowBodega", coin: "devil", priceMod: 0.72, scam: 0.24, delay: 3, heat: 2, tagline: "DevilCoin only. We do not accept baby coins." },
      { id: "uncle_modem", name: "Uncle Modem Wholesale", coin: "fraggle", priceMod: 0.96, scam: 0.06, delay: 2, heat: 12, tagline: "Slow, dusty, oddly reliable." }
    ],
    bodega: {
      cost: 25000,
      dailyIncomeMin: 450,
      dailyIncomeMax: 950,
      dailyBills: 280,
      convertLimit: 2000,
      convertFee: 0.12,
      safeBonus: 40,
      suspicionPerThousand: 3
    }
  };
}());
