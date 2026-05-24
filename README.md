# Make It Stretch — What Can I Afford To Eat?

Part of [Get Dealt In](https://getdealtin.com).

## What it does
- Takes budget, people, days, zip code
- Returns a shopping list ranked by calories per dollar using BLS price data
- Shows federal and state representatives and their votes on food/SNAP legislation

## Deploy to Render

1. Push this folder to a GitHub repo
2. Go to render.com → New Web Service → connect your repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variable:
   - `OPENSTATES_KEY` = your free key from open.pluralpolicy.com

## Data Sources
- **Food prices**: BLS Average Price Data (bls.gov)
- **Nutrition**: USDA FoodData Central
- **Federal votes**: Congress.gov official roll call data
- **State bills**: OpenStates / Plural Policy (v3.openstates.org)

## Local development
```
npm install
OPENSTATES_KEY=your_key_here node server.js
```
Then open http://localhost:3000
