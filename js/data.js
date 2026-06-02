(function () {
  window.BW_DATA = {
    version: "0.1.9",
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
      { id: "new_york", name: "New York", travelCost: 180, heatMod: 5, turfMod: 6, priceMod: 1.05, note: "Huge volume, fast swings, zero patience." },
      { id: "los_angeles", name: "Los Angeles", travelCost: 420, heatMod: 10, turfMod: 9, priceMod: 1.18, note: "Big margins, bigger drama, expensive everything." },
      { id: "chicago", name: "Chicago", travelCost: 360, heatMod: 13, turfMod: 12, priceMod: 1.16, note: "Big market, big heat, big mistakes." },
      { id: "miami", name: "Miami", travelCost: 480, heatMod: 9, turfMod: 15, priceMod: 1.28, note: "Flashy profits and wild street pressure." },
      { id: "atlanta", name: "Atlanta", travelCost: 330, heatMod: 6, turfMod: 10, priceMod: 1.1, note: "Fast routes, loud rivals, solid volume." },
      { id: "dallas", name: "Dallas", travelCost: 390, heatMod: 7, turfMod: 11, priceMod: 1.14, note: "Wide market with sharp price jumps." },
      { id: "seattle", name: "Seattle", travelCost: 500, heatMod: 4, turfMod: 7, priceMod: 1.2, note: "Fake coin weirdos love this place." },
      { id: "las_vegas", name: "Las Vegas", travelCost: 520, heatMod: 8, turfMod: 16, priceMod: 1.32, note: "Wild prices and scammy vendors." }
    ],
    items: [
        { id: "weed", name: "weed", min: 45, max: 260, volatility: 0.34, risk: 2, category: "cannabis" },
      { id: "mushrooms", name: "mushrooms", min: 60, max: 300, volatility: 0.42, risk: 3, category: "psychedelics" },
      { id: "Acid", name: "Acid", min: 65, max: 325, volatility: 0.27, risk: 4, category: "psychedelics" },
      { id: "dmt", name: "dmt", min: 70, max: 350, volatility: 0.36, risk: 5, category: "psychedelics" },
      { id: "mdma", name: "mdma", min: 100, max: 400, volatility: 0.55, risk: 10, category: "stimulant" },
      { id: "Ketamine", name: "Ketamine", min: 25, max: 125, volatility: 0.75, risk: 8, category: "anesthetic" },
      { id: "cocaine", name: "cocaine", min: 180, max: 1500, volatility: 0.62, risk: 10, category: "Stimulant" },
      { id: "meth", name: "meth", min: 110, max: 720, volatility: 0.31, risk: 11, category: "luxury" },
      { id: "heroin", name: "heroin", min: 150, max: 1100, volatility: 0.44, risk: 15, category: "opioid" },
      { id: "benzos", name: "benzos", min: 75, max: 650, volatility: 0.5, risk: 7, category: "benzodiazepines" }
    ],

    streetHookups: [
      {
        id: "cheder_bob",
        name: "Cheder Bob",
        buyMod: 0.88,
        sellMod: 0.92,
        bunk: 0.12,
        heat: 8,
        turf: 7,
        qualityMin: 0.72,
        qualityMax: 1.0,
        style: "Cheap street hookup",
        image: "assets/images/cheder-bob.png",
        tagline: "Lowest street buy price, but he occasionally hands you a bag of pure disappointment."
      },
      {
        id: "crazy_eyes",
        name: "Crazy Eyes",
        buyMod: 1.0,
        sellMod: 1.08,
        bunk: 0.07,
        heat: 11,
        turf: 11,
        qualityMin: 0.84,
        qualityMax: 1.08,
        style: "Wild-margin hustler",
        image: "assets/images/crazy-eyes.png",
        tagline: "Fair buy price and the best sell payout, but the street pressure gets loud."
      },
      {
        id: "walter_whiteboard",
        name: "Walter Whiteboard",
        buyMod: 1.12,
        sellMod: 1.0,
        bunk: 0.02,
        heat: 5,
        turf: 5,
        qualityMin: 0.96,
        qualityMax: 1.14,
        style: "Clean-quality nerd",
        image: "assets/images/walter-whiteboard.png",
        tagline: "Costs more up front, but the goods are usually clean and the drama is lower."
      }
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
    hookups: [
      {
        id: "uncle_modem",
        name: "Uncle Modem",
        coin: "fraggle",
        priceMod: 0.42,
        ghost: 0.04,
        bunk: 0.14,
        delay: 2,
        heat: 10,
        qualityMin: 0.65,
        qualityMax: 0.92,
        style: "Cheap hookup",
        tagline: "Deep wholesale discount. Biggest chance of bunk filler, but the margins are nasty."
      },
      {
        id: "packet_patty",
        name: "Packet Patty",
        coin: "onion",
        priceMod: 0.52,
        ghost: 0.05,
        bunk: 0.07,
        delay: 1,
        heat: 6,
        qualityMin: 0.82,
        qualityMax: 1.02,
        style: "Balanced hookup",
        tagline: "Best middle path: real savings, decent quality, and fewer bad surprises in the box."
      },
      {
        id: "shadow_sal",
        name: "Shadow Sal",
        coin: "devil",
        priceMod: 0.58,
        ghost: 0.03,
        bunk: 0.03,
        delay: 2,
        heat: 2,
        qualityMin: 0.95,
        qualityMax: 1.12,
        style: "Premium hookup",
        tagline: "Premium hookup. Costs more than the others, but still beats street after coin fees."
      }
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
