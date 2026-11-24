<div align="center">
<img src="https://global-uploads.webflow.com/62e7004a0f9b3a63b980ac3c/62e70c84dd3aac06fb2ac2b6_topia-logo-blue-2x.png" style="width: 120px; margin-bottom: 20px" alt="Topia logo">
</div>

# Toycoon

## Introduction / Summary

Toycoon is a toy-making tycoon game that runs inside a Topia world. Each player claims their own **display** (a booth scene in the world), gathers materials, crafts toys, and sells them for **coins**. They spend those coins on **boosters** that speed up play and **decorations** that show up on their display for everyone in the world to see. Every action earns XP, and leveling up unlocks new materials, toys, and decorations. Badges and a world leaderboard give players long-term goals, and visiting classmates' displays is part of the game.

The game is built for classrooms. Timers, material caps, and shelf caps set the pace of play, so progress comes from planning (what to gather, what to craft, when to sell), not from clicking fast.

## Table of Contents

- [How to Play](#how-to-play)
- [Key Features](#key-features)
- [Game Economy](#game-economy)
- [Badges](#badges)
- [World Setup](#world-setup)
- [Ecosystem Items](#ecosystem-items)
- [Technical Architecture](#technical-architecture)
- [API Endpoints](#api-endpoints)
- [Analytics](#analytics)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Testing](#testing)
- [Deployment](#deployment)
- [For Developers](#for-developers)

---

## How to Play

1. **Claim a display:** Walk up to an open display, whose sign reads **"Claim Me!"**, and claim it. The sign changes to **"<Your Name>'s Display"**. Each player can own one display per world.
2. **Gather materials:** At the **Materials Box**, start a material's timer. When it finishes, press **Collect**. **Collect All** grabs everything that's ready at once.
3. **Craft toys:** At **Toy Assembly**, spend materials to craft a toy. Crafting goes Craft → Work in Progress → Collect. Only one of each toy can be crafting at a time.
4. **Sell toys:** At the **Cashier**, sell toys for coins and XP. Players can pick a quantity or use **Sell all**.
5. **Level up:** XP unlocks new materials, toys, and decorations, and each level-up pays a one-time coin bonus, with confetti.
6. **Spend coins:** Buy **boosters** to speed up the loop, or **decorations** (rugs, awnings, lights, and decoration toys) to customize the display.
7. **Explore and compete:** Visit classmates' displays to see their stats, earn badges, and climb the world leaderboard on the **Trophy** page.

The **Start Here** screen in the Main Scene walks new players through these steps. Each step has a **Go to…** button that teleports display owners to that station.

---

## Key Features

### Canvas elements & interactions

- **Start Here sign (`toycoon_start`):** opens the Start Here screen with step-by-step instructions and teleport buttons. Teleports back to the Main Scene land here. Its data object also stores the world leaderboard, which players see on the Trophy page.
- **Stations:** the Materials Box, Toy Assembly, Cashier, and Decorations shop. Clicking one opens its page in the drawer.
- **Displays (booth scenes):** each display has a key asset (`toycoon_booth`) that stores who owns it, a sign (`toycoon_sign`), and six decoration spots. Clicking an open display offers to claim it. Clicking your own display opens the decorating view, and clicking someone else's shows the owner's stats.

### Drawer pages

| Page | Route | What it does |
| --- | --- | --- |
| Start Here / Display | `/` | Start Here steps in the Main Scene. In a display, it shows the claim prompt, the owner's decorating view, or another player's stats |
| Materials Box | `/materials` | Start and collect material timers, plus Collect All |
| Toy Assembly | `/workshop` | Craft toys and collect finished ones |
| Cashier | `/sell` | Sell toys by quantity or all at once |
| Decorations | `/decorations` | Buy rugs, awnings, lights, and decoration toys |
| Boosters | `/boosters` | Buy and activate boosters, with live countdowns |
| Trophy | `/trophy` | World leaderboard and all 25 badges |
| Teleport | `/teleport` | Handles teleport links |

### Player features

- **Instant feedback:** actions update the app right away, and the server's response confirms or corrects them.
- **Server-synced timers:** countdowns use the server's clock, so a player's wrong device clock can't speed up or break a timer.
- **Abandon my display:** a player can give up their display (with a confirmation). The display goes back to "Claim Me!", the decorations placed on it return to the player's inventory, and if they're standing in the display they're teleported back to the Main Scene. Materials, toys, coins, XP, and badges are kept, and the player can claim a display again.
- **Action alerts:** when an action fails (for example, a player tries to craft without enough Wood), a message explaining why is pinned to the bottom of the drawer until the player dismisses it, so a failed tap never looks like it did nothing.

### Admin features

- **Access:** world admins see an admin button in the drawer. Admin status always comes from Topia on the server, never from the client.
- **Timer speed:** pick a preset or type a custom multiplier (0.1× to 50×) to change how long every material and craft timer takes in this world:

  | Preset | Multiplier |
  | --- | --- |
  | Half time | 0.5× (twice as fast) |
  | Default | 1× |
  | Slow | 2× |
  | Very slow | 6× |
  | Super slow | 20× |

- **Clear a display:** release one display back to "Claim Me!" and reset its decorations.
- **Clear inactive displays:** release every display whose owner hasn't used it in **14 days**.
- **Reset world:** release every display in the world and clear the "all displays taken" alert. Players keep their coins, XP, levels, and decorations. The leaderboard is reset separately.
- **Reset leaderboard:** clear the world leaderboard.
- **"All displays taken" alert:** when players are turned away because every display is claimed, admins see how many were turned away and when.

---

## Game Economy

Every balancing number lives in code, so it's easy to find and change:

| What | Where |
| --- | --- |
| Material timers, caps, unlock levels, XP rates, boosters | [`shared/constants/economy.ts`](shared/constants/economy.ts) |
| Toy recipes, sell prices, craft times, shelf caps, level-up bonuses | [`shared/constants/recipes.ts`](shared/constants/recipes.ts) |
| Level XP thresholds | [`shared/levels.ts`](shared/levels.ts) |
| Decoration spots, unlock levels, default price | [`shared/constants/decor.ts`](shared/constants/decor.ts) |
| Timer speed presets | [`shared/constants/timerSpeed.ts`](shared/constants/timerSpeed.ts) |

An item's ecosystem metadata (see [Ecosystem Items](#ecosystem-items)) overrides these defaults.

### Levels

| Level | XP needed | Unlocks | Bonus |
| --- | --- | --- | --- |
| 1 | 0 | Rocking Horse, Wood, Fabric | — |
| 2 | 100 | Teddy Bear, Stuffing, Thread, rugs, boosters | +10 coins |
| 3 | 1,000 | Train, Wheels, Gears, Paint, awnings, lights | +30 coins |

Level 3 is the highest level for now.

### Materials

| Material | Timer | Max held | Unlocks at |
| --- | --- | --- | --- |
| Wood | 15s | 20 | Level 1 |
| Fabric | 30s | 10 | Level 1 |
| Stuffing | 50s | 10 | Level 2 |
| Thread | 75s | 10 | Level 2 |
| Wheels | 75s | 20 | Level 3 |
| Gears | 100s | 10 | Level 3 |
| Paint | 150s | 10 | Level 3 |

### Toys

| Toy | Recipe | Craft time | Sells for | Shelf cap |
| --- | --- | --- | --- | --- |
| Rocking Horse (L1) | 3 Wood, 1 Fabric | 30s | 3 coins, 10 XP | 10 |
| Brown Teddy Bear (L2) | 2 Stuffing, 1 Thread, 1 Fabric | 60s | 5 coins, 25 XP | 8 |
| Black Train (L3) | 5 Wood, 4 Wheels, 2 Gears, 1 Paint | 180s | 20 coins, 100 XP | 5 |

Crafting takes about two-thirds as long as gathering the materials for a toy, so players can gather the next batch while a toy is being made. A toy that's still crafting counts toward the shelf cap.

### XP

XP grows at each step: **collect < craft < sell**.

- **Collecting a material:** timer seconds × 0.05 (Wood = 1 XP, Paint = 8 XP).
- **Collecting a crafted toy:** craft seconds × 0.1 (Rocking Horse = 3 XP, Train = 18 XP).
- **Selling a toy:** the toy's sell XP (see the table above).
- Every collect or craft pays at least 1 XP.
- XP always uses the normal timer, so boosters and admin timer speed never change how much XP an action pays.

### Boosters

Boosters unlock at Level 2. A player buys one with coins, which adds it to their inventory, then activates it to start its timer. Different boosters can run at the same time, but a booster that's already running can't be activated again.

| Booster | Cost | Effect |
| --- | --- | --- |
| Speed-Up | 15 | Material timers started while it's active take half the time, for 5 minutes |
| Instant Craft | 20 | The next 10 crafts finish instantly, within 60 seconds |
| Auto-Collector | 25 | Material stations restart and collect on their own for 5 minutes, even while the player is away. The player gets the units the next time they open the app |

### Decorations

Each display has **six spots**:

| Spot unique name | Holds |
| --- | --- |
| `toycoon_awning` | One awning |
| `toycoon_lights` | One set of lights |
| `toycoon_rug` | One rug |
| `toycoon_slot1`, `toycoon_slot2`, `toycoon_slot3` | One decoration toy each |

- **Rugs** unlock at Level 2. **Awnings** and **lights** unlock at Level 3. **Decoration toys** (White Rocking Horse, Pink Teddy Bear, Blue Train) unlock with their toy.
- Decoration toys are separate from crafted toys: decoration toys can't be sold, and crafted toys can't be placed on a display.
- A player can own several copies of a decoration. Placing the same item on two spots requires owning two copies.
- Placing a decoration swaps the spot's picture in the world. Toys are scaled to fit an 80px box. An empty spot shows an "empty" picture for its kind of spot.
- Decorations without a `cost` in their metadata cost **10 coins** for now.

---

## Badges

There are 25 badges, grouped as short-term, medium-term, and long-term goals. They're shown on the Trophy page, and each one matches a Topia `BADGE` ecosystem item by name.

| Term | Badge | How to earn it |
| --- | --- | --- |
| Short | Stocked Up | Collect materials from the Materials Box |
| Short | First Creation | Finish your 1st toy at Toy Assembly |
| Short | First Sale | Sell a toy at the Cashier |
| Short | Finishing Touch | Place a decoration on your display |
| Short | Teddy Time | Reach Level 2 and unlock Teddy Bear |
| Short | Busy Hands | Craft 10 toys |
| Medium | All Aboard! | Reach Level 3 and unlock Train |
| Medium | Workshop Hero | Craft 100 toys |
| Medium | Full Set | Craft at least one Rocking Horse, Teddy Bear, and Train |
| Medium | Piggy Bank | Earn 500 coins |
| Medium | Supply Run | Collect 250 materials |
| Medium | Light It Up | Hang fairy lights on your display |
| Medium | Color Coordinated | Place a rug and an awning in the same color |
| Medium | Assembly Line | Craft 5 toys within 5 minutes |
| Medium | Regular | Play Toycoon on 3 different days |
| Medium | Window Shopper | Visit a classmate's display |
| Long | Toy Tycoon | Craft 500 toys |
| Long | Big Bank | Earn 5,000 coins |
| Long | Showstopper Shop | Decorate your display with every decoration you've unlocked, in every color |
| Long | Bear Hugs | Craft 50 Teddy Bears |
| Long | Giddy Up | Craft 50 Rocking Horses |
| Long | Conductor | Craft 50 Trains |
| Long | Loyal Toymaker | Play Toycoon on 10 different days |
| Long | Workshop Legend | Play Toycoon on 30 different days |
| Long | Shop Hop | Visit 5 different classmates' displays |

Badge rules live in [`shared/constants/badges.ts`](shared/constants/badges.ts).

---

## World Setup

### Required assets with unique names

World builders must place these assets by hand. The app finds them by unique name.

| Unique name | Where | Description |
| --- | --- | --- |
| `toycoon_start` | Main Scene | Start Here sign. Opens the Start Here screen, is where Main Scene teleports land, and stores the leaderboard data (shown on the Trophy page) |
| `toycoon_materials` | Main Scene | Materials Box station (opens `/materials`) |
| `toycoon_assembly` | Main Scene | Toy Assembly station (opens `/workshop`) |
| `toycoon_cashier` | Main Scene | Cashier station (opens `/sell`) |
| `toycoon_decorations` (or the older `toycoon_shop`) | Main Scene | Decorations shop (opens `/decorations`) |
| `toycoon_booth` | Each display scene | The display's key asset. Exactly one per display scene. Its data object stores who owns the display |
| `toycoon_sign` | Each display scene | Text sign: "Claim Me!" while open, "<Name>'s Display" once claimed |
| `toycoon_awning`, `toycoon_lights`, `toycoon_rug` | Each display scene | Web image assets for the awning, lights, and rug spots |
| `toycoon_slot1`, `toycoon_slot2`, `toycoon_slot3` | Each display scene | Web image assets for the three toy spots |

> **Note:** The spot assets must be **web image** assets. Placing a decoration swaps their picture, and Topia only accepts public `https` image links for this, so decoration pictures can't be served from `localhost`.

Teleports land 140px below the target asset so players don't appear on top of it.

### Decoration images

Rug, awning, and lights pictures are hosted on S3 at `https://sdk-toycoon.s3.us-east-1.amazonaws.com/`:

- `booth-<rug|awning|lights>-<color>.png`: awnings and rugs come in `blue`, `green`, and `pink`, and lights in `white` and `multicolor`. The color is matched from the item's name ("Rug Pink" → `booth-rug-pink.png`).
- `<awning|lights|rug|toy>-empty.png`: the picture an empty spot shows.

A decoration's `layerUrl` metadata overrides this. Decoration toys use their item image.

---

## Ecosystem Items

Materials, toys, decorations, boosters, badges, and currencies are Topia **ecosystem inventory items**. The app sorts them by their metadata `type`:

| `type` | Examples | Notes |
| --- | --- | --- |
| `material` | Wood, Fabric, Stuffing, Thread, Wheels, Gears, Paint | Names are matched loosely: "Wheel", "wheels", and "Wheels" all work |
| `toy` | Rocking Horse, Brown Teddy Bear, Black Train | Matched to a recipe by name. Only the crafted color can be crafted and sold |
| `decoration` | Rug Pink, Awning Blue, Lights Multicolor, Pink Teddy Bear | The spot comes from `slot` metadata, or from the name |
| `booster` | Speed-Up, Instant Craft, Auto-Collector | Matched by name. Price and level come from code, not metadata |
| `BADGE` (Topia item type) | Stocked Up, First Sale, … | Matched to a badge by name |
| Currency | Coins (the ecosystem item is named **Toy Tokens**), **Experience Points** | Matched by name |

Optional metadata fields that override the code defaults:

| Field | Applies to | Meaning |
| --- | --- | --- |
| `cost` | Decorations | Price in coins |
| `rewardTokens`, `rewardXP` | Toys, materials | Coins or XP paid |
| `unlockLevel` | Any | Level needed |
| `spawnIntervalSeconds` | Materials | Timer length |
| `slot` | Decorations | `rug`, `awning`, `lights`, `toy`, or a spot's unique name |
| `layerUrl` | Decorations | Picture to show on the display |

> **Note:** Decoration unlock levels are matched by the **start** of the item's name (for example, "Rug Pink" unlocks at Level 2). An item named "Pink Rug" would fall back to Level 1 unless it sets `unlockLevel`.

---

## Technical Architecture

### Data Objects

#### Visitor

Stores each player's progress. Defaults are in `DEFAULT_VISITOR_DATA` in [`server/constants.ts`](server/constants.ts). Materials, toys, decorations, boosters, coins, and XP are Topia inventory items, not data object fields.

```ts
{
  // Lifetime stats (badges, leaderboard, display stats)
  totalCoinsEarned: number;        // lifetime coins earned
  totalToysCrafted: number;
  totalToysSold: number;
  materialsCollected: number;
  toysCraftedByType: { [recipeId]: number };
  recentCraftTimes: number[];      // for the Assembly Line badge
  daysPlayed: { [day]: true };
  shopsVisited: { [ownerProfileId]: true };
  decorPlacedEver: { [itemId]: true };
  badges: string[];

  // Timers and locks
  materialGenerationStartedAt: { [materialName]: number };   // ms
  toyCraftStartedAt: { [recipeId]: number };                 // ms
  lockVersions: { [action]: number };                        // stops duplicate actions from double-clicks

  // Displays and decor
  boothIds: { [urlSlug]: sceneDropId };                      // the display owned in each world
  placedDecorations: { [spot]: { [urlSlug]: itemName | null } };
  decorToys: { [itemId]: number };

  // Boosters
  activeBoosters: { [boosterId]: { startedAt, endsAt, usesLeft?, cursors?, done? } };
}
```

#### Display key asset (`toycoon_booth`)

The source of truth for a display:

```ts
{
  sceneDropId: string;
  ownerId: string | null;            // profileId; null = open
  ownerDisplayName: string | null;
  claimDate: string | null;          // ISO date
  level: number;                     // owner's level, shown on the display
  badges: string[];
  lastInteractionTimestamp: number;  // ms; drives the 14-day inactivity check
  claimCount: number;                // goes up on every claim so two players can't claim the same display at once
}
```

#### Start Here key asset (`toycoon_start`)

Stores the world leaderboard data. Players see the leaderboard on the Trophy page; this asset is just where the data is saved, because every world is guaranteed to have one:

```ts
{
  leaderboard: {
    [profileId]: "displayName|totalXp|level|totalToysCrafted"
  }
}
```

#### World

Shared by every display in the world. Kept small:

```ts
{
  booths: { [sceneDropId]: { keyAssetId: string; ownerId: string | null } };  // index of every display
  boothsFullAlert: { lastTriggeredAt: number; turnedAwayCount: number } | null;
  timerSpeed: number;                                                         // admin timer multiplier
}
```

### How a request works

1. Topia opens the app in an iframe with interactive credentials in the URL.
2. The client sends those credentials on every request ([`client/backendAPI.ts`](client/backendAPI.ts)).
3. The server reads them with `getCredentials`, loads the visitor and world through the Topia SDK, and makes every game decision: timers, costs, caps, levels, and rewards. The client only shows the result.
4. `GET /game-state` returns everything a page needs in one response, including the server's current time so the client can correct for clock differences.

### Preventing duplicate actions

Each action (collect, craft, sell, buy, claim) takes a short lock using a version number stored in `lockVersions`. If two requests arrive at once, for example from a double-click, only the first one goes through. Locks left behind by a failed request are recovered automatically.

### Project layout

```
client/                 React + TypeScript + Vite app shown in the Topia drawer
  src/pages/            One page per station (Materials, Workshop, Sell, Decorations, Boosters, Trophy)
  src/components/       Shared UI (StartHere, BoothView, Leaderboard, BadgeCase, AdminView, ...)
  src/hooks/            useServerNow (server-synced clock) and other hooks
server/                 Node + Express API
  controllers/          One handler per route
  middleware/           requireAdmin
  utils/                Topia SDK helpers: inventory, displays, decor, boosters, badges, leaderboard, analytics
  tests/                Jest tests
shared/                 Code used by both client and server
  constants/            Economy, recipes, decor, badges, boosters, timer speed
  types/                Shared TypeScript types
```

---

## API Endpoints

All routes take the Topia interactive credentials as query parameters.

### Game state

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/game-state` | The player's data, inventory, ecosystem items, display info, admin status, timer speed, and server time |
| `GET` | `/leaderboard` | The world's top 25 players plus the viewer's own rank |
| `GET` | `/system/health` | App version and server status |

### Displays

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/claim-booth` | Claim the clicked display, or the next open one |
| `POST` | `/abandon-booth` | Give up the player's display |

### Gameplay

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/start-material` | Start a material's timer |
| `POST` | `/collect-material` | Collect one finished material |
| `POST` | `/collect-all-materials` | Collect every finished material |
| `POST` | `/craft-toy` | Spend materials and start crafting a toy |
| `POST` | `/collect-toy` | Collect a finished toy |
| `POST` | `/sell-toy` | Sell toys for coins and XP |

### Shop and decor

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/purchase-decoration` | Buy a decoration or decoration toy |
| `POST` | `/place-decoration` | Put a decoration on a spot in the player's display |
| `POST` | `/remove-decoration` | Clear a spot |
| `POST` | `/purchase-booster` | Buy a booster |
| `POST` | `/activate-booster` | Start a booster's timer |

### Teleports

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/teleport/my-booth` | Teleport to the player's display |
| `POST` | `/teleport/main-scene` | Teleport to the Start Here sign |
| `POST` | `/teleport/:station` | Teleport to `materials`, `assembly`, `cashier`, or `shop` and open its page |

### Analytics

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/track-event` | Record a client-side analytics event |

### Admin (world admins only)

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/admin/clear-booth` | Release one display |
| `POST` | `/admin/clear-inactive-booths` | Release every display inactive for 14+ days |
| `POST` | `/admin/reset-world` | Release every display in the world (players keep their progress) |
| `POST` | `/admin/reset-leaderboard` | Clear the leaderboard |
| `POST` | `/admin/timer-speed` | Set the world's timer multiplier |

---

## Analytics

Events are sent to Topia analytics with each action.

| Area | Events |
| --- | --- |
| Opens and returns | `appOpens`, `firstDayPlays`, `returnDayPlays`, `nextDayReturns`, `weekReturns-1`, `weekReturns-2`, `weekReturns-3` |
| Page views | `pageViews-startHere`, `displayViews-open`, `trophyTabViews-leaderboard` |
| Displays | `boothsClaimed`, `boothClaimsTurnedAway`, `boothsAbandoned`, `boothsCleared` |
| Materials | `materialStarts`, `materialCollects`, `collectAllUses` |
| Crafting and selling | `craftStarts-<toy>`, `toysCrafted-<toy>`, `toysSold-<toy>`, `toycoon_toy_crafted`, `toycoon_bear_crafted`, `toycoon_toy_sold` |
| Progress | `levelUps-<level>`, `toycoon_level_up`, `badgeEarns`, `badgeEarns-<badge>`, `toycoon_badge_unlocked` |
| Decor | `decorPurchases-<spot type>`, `decorPlacements-<spot type>`, `decorRemovals`, `toycoon_decor_purchased`, `toycoon_decor_placed` |
| Boosters | `toycoon_booster_purchased`, `toycoon_booster_activated` |
| Teleports | `teleport-myBooth`, `teleport-mainScene`, `teleport-<station>` |
| Admin | `timerSpeedChanges-<preset>`, `leaderboardResets` |

---

## Environment Variables

Create a `.env` file in the root directory. See `.env-example` for a template.

| Variable | Description | Required |
| --- | --- | --- |
| `INTERACTIVE_KEY` | Topia interactive app key | Yes |
| `INTERACTIVE_SECRET` | Topia interactive app secret | Yes |
| `INSTANCE_DOMAIN` | Topia API domain (`api.topia.io` for production, `api-stage.topia.io` for staging) | Yes |
| `INSTANCE_PROTOCOL` | `https` for production/staging, `http` only for local. Defaults to `https` | No |
| `NODE_ENV` | Node environment | No |
| `PORT` | Server port (defaults to `3000`) | No |
| `EMPTY_SPOT_IMAGE_URL` | Overrides the picture shown on an empty decoration spot | No |

### Where to find `INTERACTIVE_KEY` and `INTERACTIVE_SECRET`

- [Topia Production Account Dashboard](https://topia.io/t/dashboard/integrations)

> **Note:** The dev, staging, and production keys are different, and each key's ecosystem needs its own items: materials, toys, decorations, boosters, badges, coins (the **Toy Tokens** item), and Experience Points.

---

## Getting Started

```bash
# from the app root
npm install

# create a .env at the app root (see Environment Variables above)
cp .env-example .env

# run the client and the server together
npm run dev
```

Then open the app from a key asset in a Topia world that has the [required assets](#required-assets-with-unique-names).

---

## Testing

The server has Jest tests in [`server/tests`](server/tests).

```bash
cd server
npm test
```

Type-check the server:

```bash
cd server
npm run ts-check
```

To test faster in a world, set the timer speed to **Half time** from the admin screen.

---

## Deployment

Deploys run through GitHub Actions in [`.github/workflows`](.github/workflows):

| Workflow | Runs when | Does |
| --- | --- | --- |
| `aws_dev_release_gitops.yml` | A push to `dev` | Builds and deploys to the dev environment |
| `aws_auto_release.yml` | A pull request into `main` is merged | Creates a release |
| `aws_prod_release.yml` | A release is published | Builds and deploys to production |

---

## For Developers

### Built With

#### Client

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

#### Server

![Node.js](https://img.shields.io/badge/node.js-%2343853D.svg?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express-%23000000.svg?style=for-the-badge&logo=express&logoColor=white)

The server uses the [Topia JavaScript SDK](https://metaversecloud-com.github.io/mc-sdk-js/index.html) (`@rtsdk/topia`).

### Project rules

Read these before making changes:

- [`.ai/rules.md`](.ai/rules.md): architecture, SDK usage, data objects, workflow, and definition of done
- [`.ai/sdk-fundamentals.md`](.ai/sdk-fundamentals.md): how interactive keys, credentials, and dropped assets work
- [`.ai/style-guide.md`](.ai/style-guide.md): SDK CSS classes and the Tailwind cascade-layer setup
- [`.ai/accessibility.md`](.ai/accessibility.md): WCAG 2.1 AA patterns required for every UI change

These files are protected and shouldn't be changed without permission: `client/App.tsx`, `client/src/components/PageContainer.tsx`, `client/backendAPI.ts`, `client/setErrorMessage.ts`, `server/getCredentials.ts`.

### Changing the game

- **Rebalance:** edit the numbers in [`shared/constants/economy.ts`](shared/constants/economy.ts) and [`shared/constants/recipes.ts`](shared/constants/recipes.ts). Each number has a comment explaining what it controls.
- **Add a material:** add one line to `MATERIALS` in `economy.ts`, then add a matching `material` item to the ecosystem.
- **Add a badge:** add an entry to `BADGES` in [`shared/constants/badges.ts`](shared/constants/badges.ts), then add a `BADGE` item with the same name to the ecosystem.
- **Add a decoration:** add a `decoration` item to the ecosystem. Upload its picture to S3 (or set `layerUrl`) and set its `cost`.

### Helpful links

- [SDK Developer docs](https://metaversecloud-com.github.io/mc-sdk-js/index.html)
- [Boilerplate repository](https://github.com/metaversecloud-com/sdk-ai-boilerplate)
