# ARK: Survival Ascended — Game Knowledge Base

Comprehensive ASA knowledge for use building TekOS features.

## What ASA Is

ARK: Survival Ascended is a full Unreal Engine 5 remaster of ARK: Survival Evolved (ASE). ASE is defunct. ASA launched October 2023 on Steam. Key UE5 features: Nanite, Lumen, RTXDI, FluidNinja dynamic water, threaded networking.

## Creature Count (as of May 2026)

- 245 unique species
- 482 variants (Aberrant, Alpha, Brute, Corrupted, X-, R-, Tek, etc.)
- 727 total creatures

## Creature Classifications

- **By biology:** Dinosaurs, Mammals, Birds, Reptiles, Fish, Amphibians, Invertebrates, Synapsids, Fantasy Creatures
- **By habitat:** Terrestrial, Aerial, Aquatic
- **By diet:** Carnivore, Herbivore, Omnivore, Piscivore, Sanguinivore, Bottom Feeder, Carrion-Feeder, Coprophagic, Flame Eater, Sweet Tooth
- **Variant types:** Aberrant, Alpha, Brute, Corrupted, Enraged, Event, Fantasy, Mechanical, Tek, Titan, VR, X-Creature, R-Creature

## Stat System — Core Formula

```
V = (B × (1 + Lw × Iw × IwM) × TBHM × (1 + IB × 0.2 × IBM) + Ta × TaM) × (1 + TE × Tm × TmM) × (1 + Ld × Id × IdM)
```

Variables per species per stat:
- B = Base value
- Iw = Increase per wild level (% of B)
- Id = Increase per domesticated level (% of post-tame value)
- Ta = Additive taming bonus
- Tm = Multiplicative taming bonus
- TE = Taming Effectiveness %
- IB = Imprinting bonus (bred creatures only)
- TBHM = Tamed Base Health Multiplier (usually 1.0, some species 0.85–0.96)

Global server health multipliers: TaM=0.14, TmM=0.44, IdM=0.2
Global server melee multipliers: TaM=0.14, TmM=0.44, IdM=0.17, IwM=1.0

Key notes:
- Imprinting affects all stats EXCEPT stamina and oxygen (does affect torpor)
- Movement Speed stat removed from official ASA servers
- Giganotosaurus has unusual Ta of -63,000 (health debuff mechanic)

## Mutations (ASA-Specific Changes from ASE)

- Each mutation adds 2 MUTATED levels to a stat (not wild levels like ASE)
- Mutations now tracked separately from base stat points — can be inherited independently
- Mutation counter cap: combined M+P counter ≥ 20 on source parent = 0% mutation chance
- Mutation cap in ASA: 255 MUTATED levels (vs. 255 wild levels in ASE)
- Official server level cap: 450 (500 for X- and R-variants)

Mutation probability:
- Both parents <20 mutations: 7.31% chance
- Higher-stat parent ≥20: 3.337% (55% reduction)
- Lower-stat parent ≥20: 4.07% (45% reduction)
- Both ≥20: 0% chance

Three mutation rolls per offspring, each at 2.5% individually.
Color change accompanies every mutation (random region). ~10% chance of dye color (ID >100).
Mutations CANNOT be transferred between creatures.

Matrilineal/Patrilineal counters do NOT show mutations ON the creature — they track ancestry lineage.

## Traits System (NEW to ASA — Does Not Exist in ASE)

Traits are passive modifiers on creatures — can be positive or negative.
- Wild creatures spawn with exactly 1 randomized trait
- 3 tiers of rarity: Tier 1 (74%), Tier 2 (22.2%), Tier 3 (3.7%)
- A creature can hold up to 5 traits total
- Traits are NOT inherited through breeding — must use Gene Scanner + Gene Storage tools to extract and apply to offspring
- Gene Scanner/Gene Storage are DLC-restricted tools

Trait categories (40+ total):
- **Combat:** Aggressive, Giantslaying, Kingslaying, Heavy-Hitting, Quick-Hitting
- **Survival:** Athletic, Tenacious, Cold, Warm, Protective
- **Resource:** Bearing/Carrier (weight reduction for item types), Slow Metabolism
- **Movement:** Aquatic/Swimmer, Sprinter, Carefree, Cowardly
- **Breeding:** Robust (better stat inheritance +1.5–3% per tier), Frail (worse inheritance), Mutable (boosts mutation chance +1–2% per tier)
- **Special:** Fast Learner (XP gain), Vampiric, Numb, Frenetic

## Breedable Species (Notable ASA Changes)

New in ASA: Basilisk, Griffin, Karkinos now breedable
Phoenix now breedable with expanded color variants (orange, red, blue, green, pink)

## New Creatures Added to ASA (not in ASE)

Free additions: Acrocanthosaurus, Bison, Ceratosaurus, Cryolophosaurus, Deinosuchus, Dreadnoughtus, Gigantoraptor, Megaraptor, Yi Ling, Shastasaurus, Pyromane, Cosmo, Armadoggo, Oasisaur, Fasolasuchus, Drakeling, Elderclaw

Paid creatures: Armadoggo, Burrowbuck, Cosmo, Drakeling, Dreadmare, Elderclaw, Oasisaur, Pyromane, Sir-5rM8, Tidepup

Wild babies: Can now spawn alongside parents and be claimed in the wild.

## Maps Released in ASA (Timeline)

- The Island — Oct 2023
- Scorched Earth — Apr 2024 (Oasisaur, Fasolasuchus)
- The Center — Jun 2024 (Shastasaurus, Pyromane)
- Aberration — Sep 2024 (Yi Ling, Cosmo)
- Extinction — Dec 2024 (Dreadnoughtus, Armadoggo)
- Astraeos — Feb 2025 (premium partner map, Gloon)
- Ragnarok — Jun 2025 (Bison, Drakeling)
- Valguero — Oct 2025 (Megaraptor, Elderclaw)
- Lost Colony — Dec 2025 (paid DLC, Cryolophosaurus + 13+ Necrocene-period creatures, Ossidon, Aureliax, Gigadesmodus, Gloon)

## Upcoming 2026 Roadmap

- UE 5.7 Upgrade (Late Mar/Apr 2026): ~33% CPU/GPU performance gain + Nintendo Switch 2 port
- Genesis Part 1 Ascended (June 2026): FREE — includes Tidepup (axolotl-like companion), Palaeoctopus (community-voted), Bob's True Tales: Tides of Fortune
- Bob's True Tales: Tides of Fortune (June 2026): Pirate-themed paid expansion, ships/cannons/ocean gameplay
- ARK: World Creator (Q3 2026): In-game creation tools (console + PC)
- ARK: Dragontopia (December 2026): Paid, Pandora-inspired biomes, independent dragon companions
- Fantastic Tames Season 1: Burrowbuck (rideable horned hare), 2 more creatures TBD — $9.99 pack

## Upcoming 2027 Roadmap

- ARK: Atlantis (Q1 2027): Paid aquatic expansion
- Bob's True Tales: Galaxy Wars (Q2 2027): Paid space combat
- Genesis Part 2 Ascended (Q2 2027): FREE
- ARK: Legacy of Santiago Part 1 (Q4 2027): Story prequel to ARK 2, Souls-like combat
- TBD: Fjordur, Crystal Isles, Lost Island (all free, deprioritized)

## TLC Updates Planned (2026–2027)

Araneo, Quetzal, Giga (Giganotosaurus), Theri (Therizinosaurus), Megalo (Megalosaurus)

Araneo TLC (revealed CC 499, first TLC release):
- Now rideable with compact saddle
- Traverses terrain via web-lines (rappels down, ambushes from above)
- Webbing immobilizes prey completely
- Venomous bite tranquilizes for taming
- New resource: Araneo Silk (crafting material for insulation in warm-weather clothing)

## ASA Quality of Life vs ASE

- Movement Speed stat removed from official servers
- GPS, Compass, Transponder Nodes replaced by enhanced map/tracking
- Mutations track independently from base stats
- Wireless electricity, wireless irrigation (reservoir-expandable)
- Wild baby claiming mechanic
- Overhauled minimap with zoom/pan
- Ping system
- Improved dino tracking UI
- New creature-specific items: Bison Milk, Algae Sushi, Cianberry, Magenberry, Verdberry, Hemogoblin Cocktail

## Genesis Part 1 Biomes & Creatures (for reference when it releases June 2026)

5 simulation biomes: Bog, Arctic, Ocean, Volcanic, Lunar
Creatures: Magmasaur, Ferox, Megachelon, Astrocetus, Bloodstalker
Plus X-Creature variants across all biomes
Mission system: Alpha/Beta/Gamma difficulty, rewards Hexagons + XP
