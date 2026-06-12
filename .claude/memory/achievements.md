# Achievement & Badge Systems

Full blueprint for the three badge systems in TekOS — Boss Ready, Underdog, and Prize Bloodline.

## Shared Formula (Boss Ready + Underdog) — UPDATED 2026-05-16

`Base Stat + Mutation Levels + Domestic Levels = Total Points`

**Why:** Survivors enter the `mutations` field manually as the TOTAL mutation LEVELS for each stat (what their in-game UI already shows), not the count of mutation events. So there is NO ×2 multiplier — just simple addition.

Example: Rex with 70 base HP and 10 mutation levels = 80 HP total. (Not 70 + 20 = 90.)

The codebase (`src/lib/badges.ts → totalStat()`) reflects this — `base + mut` with no multiplier.

## Prize Bloodline Formula

`Badge Level = Math.min(Health, Stamina, Food, Weight, Melee)` — base stats ONLY, no mutations or domestic levels

---

## SYSTEM 1: Boss Ready Badge System

Rewards creatures bred to handle boss fights. Both Health AND Melee must meet thresholds unless noted.

### Standard Boss Badges

- Gamma Ready: Health ≥75 AND Melee ≥75
- Beta Ready: Health ≥100 AND Melee ≥100
- Alpha Ready: Health ≥125 AND Melee ≥125
- Titan Slayer: Health ≥150 AND Melee ≥150

### Specialized Role Badges

- Boss Tank: Health ≥175 (Health only)
- Boss DPS: Melee ≥175 (Melee only)
- Boss Runner: Health ≥100 AND Speed ≥150
- Boss Bruiser: Health ≥125 AND Weight ≥125

### Map-Specific Boss Achievements

**THE ISLAND:**
- Broodmother Lysrix Specialist: Alpha Ready + Megatherium bonus
- Megapithecus Specialist: Alpha Ready + High DPS
- Dragon Specialist: Alpha Ready + Herbivore advantage
- Overseer Challenger: Titan Slayer + All Island bosses defeated

**SCORCHED EARTH:**
- Manticore Specialist: Alpha Ready + Stamina ≥100

**ABERRATION:**
- Rockwell Specialist: Alpha Ready + Aberrant creatures

**EXTINCTION:**
- Desert Titan Slayer: Titan Slayer + Flyer or ranged capability
- Forest Titan Slayer: Titan Slayer + Weight ≥100
- Ice Titan Slayer: Titan Slayer + Stamina ≥125
- King Titan Slayer: Titan Slayer + All Extinction titans defeated
- Extinction Veteran: All four Titan badges on same creature

**GENESIS PART 1:**
- Moeder, Master of the Ocean: Alpha Ready + Aquatic/Oxygen ≥100
- Master Controller: Titan Slayer ("Defeated the system")

**GENESIS PART 2:**
- Rockwell Prime: Titan Slayer + Stamina ≥125

**CRYSTAL ISLES:**
- Crystal Wyvern Queen: Alpha Ready

**LOST ISLAND:**
- Dinopithecus King: Alpha Ready

**FJORDUR:**
- Fenrir: Boss reward creature — defeat all mini-bosses first
- World Bosses (Beyla, Steinbjorn, Hati & Sköll): Alpha Ready for each

**RAGNAROK (ASA):**
- Nunatak Slayer: Alpha Ready + Cold resistance — boss is Colossal Ice Wyvern
- Frostbite Champion: Titan Slayer for Nunatak
- Ragnarok Ascended: Defeat Nunatak with non-cold-resistant creatures

**SPECIAL BOSSES:**
- Lava Golem: Alpha Ready + Heat resistance
- Ice Worm Queen: Alpha Ready + Cold resistance
- DodoRex (Event): Alpha Ready — Halloween only

### Ultimate Achievements (Multi-Boss)

- Ascension Master: All story map bosses (Island, Scorched, Aberration, Extinction, Genesis)
- World Conqueror: All bosses across all maps
- Perfect Breeder: Titan Slayer tier on 10+ different species

### Badge Display Features

- Badge icons on Tame Cards
- Progress bars toward next tier
- Multi-badge creatures get special card borders
- Leaderboards per badge category
- "Creature of the Week" highlight
- Badge status affects trade value
- Badge requirements visible in trade listings

---

## SYSTEM 2: Boss Underdog Badge System

Celebrates non-meta creatures bred to exceptional boss-viable levels.

### Meta Creatures (NOT Eligible — Already Boss Meta)

Rex, Giganotosaurus, Carcharodontosaurus, Therizinosaurus, Deinonychus, Megatherium, Yutyrannus, Daeodon, Woolly Rhino, Shadowmane, Reaper, Rock Drake, Megalosaurus, Spino, Allosaurus, Baryonyx, Velonasaur, Managarmr

### Underdog Categories

- **Heavy Hitters:** Carnotaurus, Sarco, Kapro, Direwolf, Sabertooth, Thylacoleo, Ravager, Raptor, Terror Bird, Megalania, Arthropluera, Mantis, Pachyrhinosaurus, Stegosaurus, Kentrosaurus
- **Tank Surprises:** Diplodocus, Brontosaurus, Paracer, Carbonemys, Doedicurus, Ankylosaurus, Pachycephalosaurus, Triceratops, Mammoth, Chalicotherium, Gigantopithecus, Dire Bear
- **Aerial Underdogs:** Argentavis, Pteranodon, Tapejara, Griffin, Snow Owl, Tropeognathus, Phoenix, Wyverns
- **Aquatic Warriors:** Dunkleosteus, Anglerfish, Electrophorus, Ichthyosaurus, Megalodon, Plesiosaur, Diplocaulus, Beelzebufo

### Underdog Badge Tiers (higher thresholds due to non-meta status)

- Underdog Champion (Gamma-level): Health ≥90 AND Melee ≥90
- Underdog Hero (Beta-level): Health ≥115 AND Melee ≥115
- Underdog Legend (Alpha-level): Health ≥140 AND Melee ≥140
- Underdog Titan (Special): Health ≥160 AND Melee ≥160

### Visual Design

- Champion: Bronze with paw print overlay
- Hero: Silver with wings spread
- Legend: Gold with crown design
- Titan: Diamond/Prismatic with lightning effects
- Progress indicator: "Your Carno needs 12 more health points for Underdog Champion!"
- "Underdog Master" profile title for players with 5+ underdog badges
- Special celebration animation on earning underdog badge

---

## SYSTEM 3: Prize Bloodline Badge System

Rewards perfectly consistent base stats across all five core stats. All-or-nothing — one weak stat = no badge.

### What Counts

- Health, Stamina, Food, Weight, Melee (base stats / wild stats at tame only)
- Oxygen NOT included
- Movement Speed NOT included
- Mutations NOT included
- Domestic levels NOT included

### Badge Tiers

- Bronze Bloodline: ALL 5 stats ≥45 — "Solid genetics across the board" — +25% trade value
- Silver Bloodline: ALL 5 stats ≥50 — "Impressive stat consistency" — +50% trade value
- Gold Bloodline: ALL 5 stats ≥55 — "Absolute breeding perfection" — +100% trade value
- Diamond Bloodline: ALL 5 stats ≥60 — "Genetic perfection beyond compare" — Priceless, Auction-only, server-wide announcement

### Breeder Ranks — UPDATED 2026-05-22 (8 ranks, uniform "X on 5 species" ladder)

| Rank | Name | Requirement |
|------|------|-------------|
| 1 | Beach Bob | 1 Bronze Bloodline |
| 2 | Primitive Tamer | Bronze on 5 species |
| 3 | Vault Keeper | 1 Silver Bloodline |
| 4 | Mutation Hunter | Silver on 5 species |
| 5 | Alpha Line | 1 Gold Bloodline |
| 6 | Element Forged | Gold on 5 species |
| 7 | Ascendant | 1 Diamond Bloodline |
| 8 | Homo Deus | Diamond on 5 species |

Every "X on 5 species" milestone is now uniform (old ladder mixed 5/3/2).

### Special Achievements

- Diversity Master: Badges on 10+ different species
- Speedrun Champion: Bronze to Gold in under 30 days
- Perfect Collection: All badges on single species
- Underdog Victory: Diamond badge on Dodo or Lystrosaurus
- Community Hero: Helped 10+ tribes achieve badges

### Community Recognition

- Bronze: "Dedicated Breeder" chat tag
- Silver: "Expert Breeder" + Hall of Fame
- Gold: "Master Breeder" + special Discord role
- Diamond: "Legendary Breeder" + permanent server monument
