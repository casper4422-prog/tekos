/**
 * SNTO topic tree — what the resident guide drone knows about TekOS.
 *
 * The whole tree is data, not LLM-generated. Every `answer` is written in
 * SNTO's gruff-mentor voice (short, dry, direct, "survivor" used sparingly).
 * Add leaves over time as the site grows; the SNTO.svelte component renders
 * whatever tree it's given.
 */

export type SntoTopic = {
    id: string;
    label: string;         // shown on the chip
    answer?: string;       // shown when picked (leaf)
    children?: SntoTopic[]; // sub-chips revealed after pick / instead of answer
};

export const SNTO_ROOT: SntoTopic[] = [
    {
        id: 'specimens',
        label: 'Specimens & breeding',
        children: [
            {
                id: 'specimens.log',
                label: 'How do I log a tame?',
                answer: 'Vault → Log Specimen. Three ways in: type the stats yourself, drop a Tek Binoculars screenshot for OCR, or import from a single-player save. Manual is fastest.'
            },
            {
                id: 'specimens.mutations',
                label: 'How do I track mutations?',
                answer: 'On the specimen page, the Mutation column under Base Stats is where you put the total mutation level for that stat — what your in-game UI shows. Bump it from the Dossier project counter when you hatch a new baby with a fresh mutation.'
            },
            {
                id: 'specimens.founders',
                label: 'What are Founders?',
                answer: 'The wild tames a bloodline came from. Mark them as founders on the specimen page — Ancestry section. Then on descendants you can pick which founder each stat came from in Stat Origins. Keeps the lineage honest.'
            },
            {
                id: 'specimens.project',
                label: 'Pinning a breeding project',
                answer: 'Open the specimen, hit Pin Project. Pick the focus stat and a target mutation count. It shows up on your Dossier with the bump counter — clicking + or − writes the new total back to that creature.'
            },
            {
                id: 'specimens.availability',
                label: 'Sharing for breeding or trade',
                answer: 'On the specimen page, flip the Availability toggles. Survivors browsing your dossier or the Marketplace can filter for tames marked Breeding or Trade. Filtering is sharp — only flip the ones you actually want strangers asking about.'
            }
        ]
    },
    {
        id: 'badges',
        label: 'Badges & ranks',
        children: [
            {
                id: 'badges.how',
                label: 'How are badges earned?',
                answer: 'They auto-compute from your vault. No claim button. The Badges page walks every system and shows which specimens are close to the next tier.'
            },
            {
                id: 'badges.boss',
                label: 'Boss Ready badge',
                answer: 'HP AND Melee both at or above the tier threshold: Gamma 75, Beta 100, Alpha 125, Titan 150. Total = base + mutation levels. Per species — your best in that species sets your tier.'
            },
            {
                id: 'badges.bloodline',
                label: 'Prize Bloodline badge',
                answer: 'All five core stats (HP, Stamina, Food, Weight, Melee) at base ≥ the tier threshold. Bronze 45, Silver 50, Gold 55, Diamond 60. Mutations and domestic levels do not count — base only. This one rewards clean genetics, not stacking.'
            },
            {
                id: 'badges.roles',
                label: 'Specialist Roles',
                answer: 'Six roles — Tank, DPS, Bruiser, Vanguard, Packmaster, Endurance — each with four tiers (Standard → Elite → Apex → Legendary). Each role checks 1–2 ASA stats. No Speed since that does not level on tames.'
            },
            {
                id: 'badges.underdog',
                label: 'Underdog badge',
                answer: 'Same math as Boss Ready, but only non-meta species qualify. Rex, Giga, Theri, Yuty — out. Carno, Sabertooth, Direwolf — eligible. The point is to reward survivors who built the unexpected pick into a boss-killer.'
            },
            {
                id: 'badges.rank',
                label: 'Breeder rank ladder',
                answer: 'Eight ranks tied to Prize Bloodline. Beach Bob → Primitive Tamer → Vault Keeper → Mutation Hunter → Alpha Line → Element Forged → Ascendant → Homo Deus. Each step is either "first of this tier" or "this tier on five species."'
            }
        ]
    },
    {
        id: 'overseer',
        label: 'Bosses & war rooms',
        children: [
            {
                id: 'overseer.cards',
                label: 'What is the boss roster?',
                answer: 'Every boss the wild remembers — Island, Scorched, Aberration, Extinction, Astraeos, Ragnarok, Valguero, Lost Colony. Each card has tier, description, tribute, META picks. Greyed cards are coming soon.'
            },
            {
                id: 'overseer.warroom',
                label: 'Starting a war room',
                answer: 'Tap a boss card, pick difficulty, Open War Room. Hand the join code to your tribe. The room has chat, a shared roster of committed tames, and a Log Fight button when it is done.'
            },
            {
                id: 'overseer.log',
                label: 'Logging a kill',
                answer: 'From the open war room, hit Log Fight when you win or wipe. The record stores the boss, tier, outcome, duration, your squad, and which tames you brought. It feeds the Boss Ready badge wall + your dossier history.'
            },
            {
                id: 'overseer.ready',
                label: 'Is my specimen boss-ready?',
                answer: 'Open the specimen. If the Boss Ready tier shows on its artifact card, you are at or above that threshold. The Badges page also lists your closest-to-earning candidates if you are not there yet.'
            }
        ]
    },
    {
        id: 'marketplace',
        label: 'Trading',
        children: [
            {
                id: 'marketplace.list',
                label: 'Listing a specimen',
                answer: 'Marketplace → + Listing. Pick the creature from your vault, set what you want (gear, dust, resources), add notes, post. Offers come in as notifications.'
            },
            {
                id: 'marketplace.buy',
                label: 'Buying / WTB listings',
                answer: 'Same form, flip the direction to Buy. Describe what you are looking for — species, gender, level, mutations. Sellers with matching stock will see it in the WTB column.'
            },
            {
                id: 'marketplace.offer',
                label: 'Sending an offer',
                answer: 'Open a listing, hit Make Offer. You can attach one of your own tames as the trade-up. The seller sees it in the Offers tab of their Dossier and on Marketplace → Offers.'
            },
            {
                id: 'marketplace.rep',
                label: 'Trade reputation',
                answer: 'After a trade closes, both sides leave a star rating. Your Trade Rep shows on your Dossier and next to every listing. Build it slow — one burned trade tanks it fast.'
            }
        ]
    },
    {
        id: 'tribe',
        label: 'Tribes',
        children: [
            {
                id: 'tribe.create',
                label: 'Creating a tribe',
                answer: 'Tribe page → Forge Tribe. Pick a name, main map, motto, recruitment policy. You start as Alpha. Invite others from Discovery or accept join requests if you set recruitment open.'
            },
            {
                id: 'tribe.join',
                label: 'Joining an existing tribe',
                answer: 'Tribe page → Browse. Open one whose tag fits and send a join request with a short message. Owners and admins see it under Pending.'
            },
            {
                id: 'tribe.roles',
                label: 'Roles and permissions',
                answer: 'Alpha owns the tribe. Officers can invite, kick, announce. Survivors are full members but cannot change tribe identity. Promote from the Members tab.'
            },
            {
                id: 'tribe.warroom',
                label: 'War rooms with the tribe',
                answer: 'Schedule from the Tribe page or Overseer. Members get notified. The war room chat lives inside Overseer; it also surfaces in Network → Messages while it is open.'
            },
            {
                id: 'tribe.alliance',
                label: 'Alliances & threats',
                answer: 'Propose Alliance from the Diplomacy card. The target tribe gets a notification and can accept or pass. Flag Threat marks a tribe or player as hostile in your blacklist — visible only to your tribe.'
            }
        ]
    },
    {
        id: 'network',
        label: 'Friends & messages',
        children: [
            {
                id: 'network.find',
                label: 'Finding survivors',
                answer: 'Network → Survivors. Browse by callsign or scroll the recently-active list. Hit Add Friend on anyone — they see a pending request.'
            },
            {
                id: 'network.dm',
                label: 'Sending a DM',
                answer: 'From a survivor profile or your Network tab, click Message. The thread lives in Network → Messages. It polls every six seconds so replies show up without a refresh.'
            },
            {
                id: 'network.warroom',
                label: 'Why are war rooms in my Messages?',
                answer: 'Any open war room you joined shows up at the top of your conversation list. Same chat, same place — you do not have to bounce back to Overseer to keep up.'
            }
        ]
    },
    {
        id: 'dex',
        label: 'Species Dex',
        children: [
            {
                id: 'dex.what',
                label: 'What is the Dex for?',
                answer: 'The reference. Every ARK species TekOS knows about — stats, spawn maps, taming method, diet, dossier text. Filter by map, badge state, ownership, variant prefix.'
            },
            {
                id: 'dex.wishlist',
                label: 'Wishlist a species',
                answer: 'On a species page, hit ♡ Wishlist. Other survivors with that species marked Available for Trade will see your wishlist in their Marketplace network feed.'
            },
            {
                id: 'dex.add',
                label: 'Add to vault from Dex',
                answer: 'Each species page has a "+ Add to Vault" button. It opens the Log Specimen form with the species already filled in.'
            }
        ]
    },
    {
        id: 'settings',
        label: 'Account & settings',
        children: [
            {
                id: 'settings.profile',
                label: 'Edit your profile',
                answer: 'Settings → Account. Nickname, bio, what you are looking for, banner, avatar. Discord linking lives here too — links your Discord identity once and signs you in faster after.'
            },
            {
                id: 'settings.privacy',
                label: 'Privacy controls',
                answer: 'Settings → Privacy. Toggle whether your vault count, badges, online status, and breeding flags show on your public dossier. The viewer always sees their own stuff regardless.'
            },
            {
                id: 'settings.theme',
                label: 'Changing the theme',
                answer: 'Settings → Themes. Pick a map palette — each one swaps the cyan accents to that map\'s colors. Dark / Light mode is in the same panel. Light mode is best for daylight reading; dark is the canonical look.'
            },
            {
                id: 'settings.cluster',
                label: 'Adding your servers',
                answer: 'Settings → Cluster. Drop in the server name and optional password. TekOS uses these to label your specimens and feed activity. RCON credentials live in the same panel for when the live connector ships.'
            },
            {
                id: 'settings.delete',
                label: 'Deleting your account',
                answer: 'Settings → Data → Delete Account. Type your callsign to confirm and enter your password. Everything cascades — vault, badges, trades, messages, friendships, notifications. No recovery, survivor.'
            }
        ]
    }
];
