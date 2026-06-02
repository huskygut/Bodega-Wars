Bodega Wars

Version 0.1.9 gameplay note
Bodega Wars v0.1.9 fixes save/import guardrails, closes a fractional fake-coin exploit, prevents same-day street resale loops, reserves Safe House space for pending Dark Terminals orders, and aligns the bodega purchase button with the pocket-cash purchase rule.

Earlier Version 0.1.5 gameplay note
Dark Terminals now uses three fictional hookup people instead of a generic vendor market. Their prices are intentionally below street price, but each hookup has different quality, heat, delay, ghost, and bunk-good risk.


A greasy street-market empire simulator where every profit has a problem.

By Huskygut Studios

Version
0.1.9 playable web app prototype

What this is
Bodega Wars is a fictional parody browser game. All markets, currencies, goods, vendors, characters, and events are made up for entertainment.

There are no real dark web instructions, no real crypto wallet steps, no real illegal marketplace names, and no real-world buying guidance. Dark Terminals, FraggleCoin, OnionCoin, DevilCoin, and all goods/vendors are fake game systems.

Fast local test
Open index.html in a browser.

Recommended browsers
Chrome
Edge
Firefox

Public website goal
https://www.bodegawars.com

Included setup file
Read HOSTING_INSTRUCTIONS.txt for step-by-step GitHub Pages and www HTTPS setup.

Important GitHub Pages files
index.html
CNAME
.nojekyll

CNAME should contain:
www.bodegawars.com

Basic GitHub Pages setup
Create a public GitHub repo named:
bodega-wars

Copy all project files into the repo root.

Commit and push to main.

In GitHub, go to:
Settings
Pages
Deploy from a branch
Branch: main
Folder: /root
Save

Custom domain
In GitHub Pages custom domain, use:
www.bodegawars.com

DNS record for www
Type:
CNAME

Name:
www

Target:
huskygut.github.io

Then enable:
Enforce HTTPS

Included files
index.html
README.txt
HOSTING_INSTRUCTIONS.txt
CODEX_TASK.txt
CNAME
.nojekyll
css/styles.css
js/data.js
js/app.part1.js through js/app.part8.js
assets/images/main-street-bodega.png
assets/images/dark-terminals.png
assets/images/crypto-carl.png
assets/images/your-bodega.png
assets/images/loan-shark-larry.png
assets/images/coupon-cartel.png
assets/images/heat-warning.png
assets/images/safe-house.png
assets/images/city-map.png
assets/images/item-sheet.png
assets/images/coin-sheet.png

Current features
Title screen
New game
Continue game
Local save system
Export save
Import save
Reset save
Buy and sell fake goods
Rename goods
Random city market prices
Travel between cities
Street Cash
Hot Cash
Register Cash
Safe Cash
Carried inventory
Safe House inventory
Debt system with Loan Shark Larry
Heat meter
Turf Pressure per city
Suspicion meter
Random daily events
Crypto Carl fake coin exchange
FraggleCoin
OnionCoin
DevilCoin
Cash to FraggleCoin to OnionCoin to DevilCoin conversion chain
Dark Terminals with made-up vendors only
Delayed fake terminal orders
Basic bodega ownership
Bodega upgrades
Security upgrades
Basic endings after day 30
Mobile-friendly layout
How to Play tutorial screen
How to Play button in Settings
New games open the quick tutorial first

Known limitations
This is a first playable prototype, not the finished game.

The market balance will need testing.

The random events are simple.

The bodega system is basic.

The rival system is basic.

The art is used as large screen art, not cut into individual transparent icons yet.

No sound effects yet.

No PWA install support yet.

No desktop wrapper yet.

Good next steps
Test the full 30-day loop.

Balance prices, debt, Heat, Turf Pressure, and Suspicion.

Add more event cards.

Add smaller item icons.

Add more bodega upgrades.

Add more endings.

Add sound effects with a mute button.

Add PWA support.
Keep the How to Play screen updated when new systems are added.

Credit
Bodega Wars is an original fictional parody browser game by Huskygut Studios.

Copyright
© 2026 Huskygut Studios. All rights reserved.

Privacy-friendly city list

This build uses large fictionalized market cities only. Do not add real personal hometowns, small towns, addresses, or locations tied to the creator. Public project content should stay generic.

Version 0.1.4 mobile layout note

This version adds a mobile-first quick action bar so End Day is easy to find on every active game screen. Mobile navigation is now a visible horizontal row instead of being hidden behind a menu.


Version 0.1.7 notes

Improved the money system, made Dark Terminals more useful than street dealers with wholesale pricing and bulk discounts, and added a Daily Crypto Report to the Crypto Carl screen.


Version 0.1.7 notes

Street Hookups were added to the market screen:

Cheder Bob
Cheap street hookup. Lowest buy prices, higher bunk chance.

Crazy Eyes
Wild-margin street hookup. Better sell payouts, but more heat and turf pressure.

Walter Whiteboard
Cleaner street hookup. Higher buy prices, lower bunk chance, lower drama.

The street side is instant, but prices and quality vary by hookup.
Dark Terminals keeps its advantage through wholesale pricing, bulk discounts, safer delivery to the Safe House, and lower heat on better coin paths.


Version 0.1.9 notes

Fixed fractional cash-to-coin conversion so fake coins cannot be minted from rounded-down cash.
Added same-day resale protection for newly purchased street goods.
Added save/import cleanup for money, meters, inventory, coin prices, pending terminal orders, and custom item names.
Dark Terminals orders now reserve Safe House space before payment.
The bodega purchase button now matches the actual pocket-cash purchase rule.
Removed stale hidden mobile menu wiring because mobile navigation is now a visible horizontal row.
