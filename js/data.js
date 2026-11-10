// Content for the 3D explorer. Items marked `placeholder: true` are still being
// finalized by the team and are labeled as such in the UI.

// Headline statistics, each with its source and date. Update here, not in copy.
export const STATS = {
  foodInsecure: { value: '78%', label: 'of people in Sierra Leone are food insecure', source: 'World Food Programme, Sierra Leone country page', url: 'https://www.wfp.org/countries/sierra-leone', year: '2025' },
  stunting: { value: '1 in 4', label: 'children under five are stunted (26%)', source: 'UNICEF data', url: 'https://data.unicef.org/sdgs/country/sle/', year: '2022' },
  ruralPoverty: { value: '72%', label: 'of rural people live below the national poverty line', source: 'World Bank, Sierra Leone Integrated Household Survey', url: 'https://www.worldbank.org/en/country/sierraleone', year: '2018' },
  trend: { value: '28% → 13%', label: 'of households severely food insecure, 2023 to 2025. Improving, still fragile.', source: 'WFP Country Brief', url: 'https://docs.wfp.org/api/documents/WFP-0000176503/download', year: '2025' },
  updated: '2026-11',
};

export const HOTSPOTS = [
  {
    id: 'school',
    title: 'The School',
    kicker: 'Isra Ihsan Sadreddin Academy',
    pos: [0, 7.6, -8],
    view: { cam: [-6, 9, 18], target: [0, 2.5, -6] },
    summary:
      'A completed vision of the school now under construction. The classrooms, the courtyard and the land around them become one learning environment, where the orchard is part of the school day.',
    sections: [
      { h: 'What it is', items: [
        'Classroom block with a shaded veranda, plus an admin and library block',
        'A laterite courtyard for assembly, drying produce and market days',
        'The surrounding land planned as a teaching orchard (size to be confirmed)',
      ]},
      { h: 'Why here', items: [
        'Students already gather here every day, so training needs no extra travel',
        'Families are connected through the school, so knowledge travels home',
        'The orchard feeds the school kitchen. School meals are what the evidence links to attendance, so the orchard supplies them',
      ]},
    ],
  },
  {
    id: 'classroom',
    title: 'Outdoor Classroom',
    kicker: 'Education · The core of the solution',
    pos: [10, 3.6, 13],
    view: { cam: [17, 4.2, 23], target: [9, 1.3, 12] },
    summary:
      'A teacher leads a lesson in the shade at the edge of the orchard. Theory on the chalkboard, practice ten steps away in the rows.',
    sections: [
      { h: 'Hands-on curriculum (draft)', placeholder: true, items: [
        'Term 1: Soil and seeds. Testing soil, making compost, raising seedlings in the nursery',
        'Term 2: Growing. Planting, mulching, drip irrigation, pruning, pest scouting',
        'Term 3: Harvest and preserve. Picking, grading, solar drying, juicing, storage',
        'Term 4: Business. Record keeping, pricing, selling at market, saving',
      ]},
      { h: 'Values woven through', items: [
        'Khalifa: stewardship of the earth as a trust',
        'Gratitude and sharing: zakah and sadaqah from the harvest',
      ]},
    ],
  },
  {
    id: 'mango',
    title: 'Mango & Cashew Block',
    kicker: 'What is grown · Long-term trees',
    pos: [30, 6.8, -19],
    view: { cam: [44, 10, -2], target: [29, 2, -18] },
    summary:
      'The backbone of the orchard: hardy, deep-rooted trees that suit Sierra Leone’s long dry season and produce for decades. This is the endowment (waqf) that keeps giving.',
    sections: [
      { h: 'Crops', items: [
        'Grafted mango: first fruit in 3 to 5 years, then decades of harvest',
        'Cashew, a high-value export crop that tolerates poor soils',
        'Avocado and soursop as companion trees',
      ]},
      { h: 'Layout', items: [
        'Wide spacing in straight rows for sunlight and easy harvest (exact spacing to be confirmed)',
        'Mulch rings around every trunk to hold moisture',
      ]},
    ],
  },
  {
    id: 'citrus',
    title: 'Citrus Block',
    kicker: 'What is grown · Mid-term trees',
    pos: [30, 4.6, -3],
    view: { cam: [42, 6, 6], target: [29, 1.5, -3] },
    summary:
      'Oranges, limes and grapefruit: daily vitamin C for students and a steady market crop that fruits sooner than mango.',
    sections: [
      { h: 'Crops', items: [
        'Sweet orange, lime, grapefruit',
        'Harvest windows staggered so fruit comes in across the year',
      ]},
    ],
  },
  {
    id: 'banana',
    title: 'Banana, Plantain & Papaya',
    kicker: 'What is grown · Quick returns',
    pos: [30, 5.2, 11],
    view: { cam: [40, 5, 22], target: [29, 1.8, 11] },
    summary:
      'Fast crops that produce in the first year, so the orchard feeds students and earns income while the long-term trees mature.',
    sections: [
      { h: 'Crops', items: [
        'Banana and plantain: food staple, fruit in about 12 months',
        'Papaya: fruit in 1 to 2 years, rich in vitamin A',
        'Pineapple, cassava and groundnut between the young trees, as every Sierra Leone orchard does to bridge the slow years',
      ]},
    ],
  },
  {
    id: 'irrigation',
    title: 'Water & Irrigation',
    kicker: 'Sustainable systems',
    pos: [12, 10.5, -24],
    view: { cam: [26, 9, -36], target: [12, 4, -24] },
    summary:
      'Rainwater from the school roofs and a borehole fill an elevated tank. Gravity-fed drip lines carry water to every tree through the dry season.',
    sections: [
      { h: 'How it works', items: [
        'Roof gutters capture rainy-season water',
        'Solar pump lifts borehole water when the tank runs low',
        'Drip lines put water right at the roots, using far less water than flooding',
        'Students run the daily checks: valves, leaks, tank level',
      ]},
      { h: 'What goes wrong, and the fix', items: [
        'A young tree that is not watered through the dry season dies. Every tree has a named student caretaker and a watering day',
        'Orchards fail on short-term enthusiasm. The orchard sits inside the timetable, with the Agriculture syllabus, not after school',
      ]},
    ],
  },
  {
    id: 'compost',
    title: 'Compost Station',
    kicker: 'Sustainable systems',
    pos: [46, 3.2, -14],
    view: { cam: [52, 4.5, -6], target: [46, 1, -14] },
    summary:
      'A three-bay compost system turns kitchen scraps, fallen leaves and manure into free fertilizer, cutting costs and rebuilding the soil.',
    sections: [
      { h: 'The cycle', items: [
        'Bay 1: fresh inputs from the school kitchen and orchard',
        'Bay 2: turning and heating for several weeks',
        'Bay 3: finished compost, spread around the trees',
      ]},
    ],
  },
  {
    id: 'preserve',
    title: 'Preservation & Storage',
    kicker: 'How food is preserved',
    pos: [-27, 3.6, -18],
    view: { cam: [-18, 5, -8], target: [-27, 1.2, -18] },
    summary:
      'Fruit spoils fast in the heat. Solar dryers and a cool store let the school keep food for months, sell it when prices are higher, and waste less.',
    sections: [
      { h: 'Methods', items: [
        'Solar dryer: dried mango, banana chips, moringa powder',
        'Evaporative (clay-pot) cool store: no electricity needed',
        'Juice, jam and pulp made in small batches',
        'Clean, labeled crates for grading and storage',
      ]},
    ],
  },
  {
    id: 'nursery',
    title: 'Seedling Nursery',
    kicker: 'Growing the next orchard',
    pos: [-34, 3.6, 20],
    view: { cam: [-26, 4.5, 29], target: [-34, 1, 20] },
    summary:
      'Students raise and graft seedlings under shade netting. Some replant the school orchard; others go home with families to start their own waqf orchards.',
    sections: [
      { h: 'Why it matters', items: [
        'Cuts the cost of new orchards by growing trees locally',
        'Grafting is a valuable skill students can earn from',
        'Spreads orchards from the school into the community',
      ]},
    ],
  },
  {
    id: 'truck',
    title: 'Harvest to Market',
    kicker: 'Income · Supply chain',
    pos: [30, 4.8, 30],
    view: { cam: [20, 4.5, 40], target: [30, 1.4, 27] },
    summary:
      'Surplus produce is graded, crated and trucked to local markets and buyers. The income flows back to the school and the families who tend the orchard.',
    sections: [
      { h: 'Income plan (draft)', placeholder: true, items: [
        'Weekly market runs to nearby towns, with buyer partnerships to be confirmed',
        'Dried and processed goods sell year-round at higher value',
        'Revenue split: orchard upkeep · school fund · participating families',
        'Students keep the books as part of the business term',
      ]},
    ],
  },
  {
    id: 'dining',
    title: 'Community Tables',
    kicker: 'Food that stays in the community',
    pos: [-20, 4.4, 18],
    view: { cam: [-10, 4.5, 26], target: [-20, 1.2, 18] },
    summary:
      'Not everything is sold. A share of every harvest feeds students at lunch and goes home to families, so the orchard fights hunger right where it grows.',
    sections: [
      { h: 'Inside the community', items: [
        'Daily fruit with school meals',
        'Families of student stewards receive a share of the harvest',
        'Community harvest days with seedlings shared with neighbors',
      ]},
    ],
  },
];

// Guided tour: short and focused on the key story beats.
export const TOUR = [
  {
    tag: 'The problem',
    title: '78% of Sierra Leone is food insecure',
    text: 'That is the World Food Programme figure. About 1 in 4 children under five are stunted, and 72% of rural people live below the poverty line. The trend is improving, slowly. How might we design an orchard that gives this community reliable food and income?',
    view: { cam: [-62, 42, 72], target: [6, 0, 0] },
  },
  {
    tag: 'The solution',
    title: 'The school becomes the training ground',
    text: 'A teacher leads hands-on lessons at the edge of the orchard. Students learn to grow, maintain, harvest and preserve food, and take those skills home.',
    view: { cam: [16, 5.2, 22], target: [9, 0.2, 11] },
    hotspot: 'classroom',
  },
  {
    tag: 'How it works',
    title: 'Plant, water, compost, repeat',
    text: 'Quick crops like banana and papaya feed students in year one while mango and cashew mature. Roof rainwater, drip irrigation and compost keep the system running with few outside inputs.',
    view: { cam: [52, 22, 26], target: [28, 0, -6] },
    hotspot: 'mango',
  },
  {
    tag: 'Income',
    title: 'A truck full of harvest',
    text: 'Surplus is graded, crated and sold at market. A simple supply chain turns fruit into income for the school and families.',
    view: { cam: [20, 5.2, 40], target: [30, 0.1, 26] },
    hotspot: 'truck',
  },
  {
    tag: 'Community',
    title: 'Food that stays home, too',
    text: 'A share of every harvest feeds students at lunch and goes home to families, so the orchard fights hunger where it grows.',
    view: { cam: [-11, 4.4, 27], target: [-20, 0.0, 16.5] },
    hotspot: 'dining',
  },
  {
    tag: 'Impact',
    title: 'An endowment that keeps giving',
    text: 'Set up as waqf, an enduring charity rather than aid, the orchard feeds, earns and teaches for generations. Explore freely, or read the full project.',
    view: { cam: [-40, 26, 46], target: [8, 0, -2] },
    cta: true,
  },
];

// Info for things you can inspect inside the buildings in walk mode.
export const INFO = {
  classA: {
    title: 'Orchard Science Classroom', kicker: 'Inside the school · Term 1 lesson',
    summary: 'Today’s lesson is Soil & Seeds. Students test soil, mix compost and sow seeds, then walk out to the nursery to do it for real.',
    sections: [
      { h: 'Lesson flow (draft)', placeholder: true, items: ['Warm-up: what makes soil healthy?', 'Demo at the board, then small-group soil tests', 'Sow seeds in nursery trays; each group labels its tray', 'Reflection: stewardship (khalifa) of the land we were given'] },
      { h: 'What students take home', items: ['How to test and improve soil at home', 'A seedling to plant with their family'] },
    ],
  },
  classB: {
    title: 'Harvest & Preserve Lab', kicker: 'Inside the school · Term 3 lesson',
    summary: 'Hands-on preserving: students slice, dry and jar fruit so the harvest lasts for months and sells for more.',
    sections: [
      { h: 'At the tables', items: ['Seedling trays for the next planting', 'Fresh mango sliced thin for the solar dryer', 'Dried mango packed in clean, dated jars'] },
      { h: 'Lesson plan', placeholder: true, items: ['Food safety and hygiene steps', 'Drying times and quality checks', 'Assessment rubric'] },
    ],
  },
  seedBank: {
    title: 'Seed Bank', kicker: 'Classroom shelf',
    summary: 'Students save seeds from the best trees each season, so the orchard improves over time and seeds cost nothing.',
    sections: [{ h: 'On the shelf', items: ['Mango, papaya and citrus seeds, dried and labeled', 'Notes on which tree each seed came from', 'Species list to be confirmed with local experts'] }],
  },
  term1: { title: 'Term 1 · Soil & seeds', kicker: 'Curriculum poster', summary: 'The year starts underground: healthy soil and strong seedlings.', sections: [{ h: 'Topics (draft)', placeholder: true, items: ['Soil testing and compost making', 'Raising seedlings in the nursery', '[Lesson plans TBD]'] }] },
  term2: { title: 'Term 2 · Growing', kicker: 'Curriculum poster', summary: 'Keeping young trees alive through the dry season.', sections: [{ h: 'Topics (draft)', placeholder: true, items: ['Planting, mulching and drip irrigation', 'Pruning, grafting and pest scouting', '[Lesson plans TBD]'] }] },
  term3: { title: 'Term 3 · Harvest & preserve', kicker: 'Curriculum poster', summary: 'Picking at the right time and making food last.', sections: [{ h: 'Topics (draft)', placeholder: true, items: ['Picking and grading', 'Solar drying, juicing and storage', '[Lesson plans TBD]'] }] },
  term4: { title: 'Term 4 · Orchard business', kicker: 'Curriculum poster', summary: 'Turning surplus into income the community controls.', sections: [{ h: 'Topics (draft)', placeholder: true, items: ['Record keeping and pricing', 'Selling at market and saving', '[Lesson plans TBD]'] }] },
  values: {
    title: 'Khalifa: Stewards of the Earth', kicker: 'Values poster',
    summary: 'The orchard is a trust. Caring for it, and sharing what it gives, is part of faith as well as farming.',
    sections: [{ h: 'Woven through every term', items: ['Stewardship (khalifa) of land, water and trees', 'Gratitude and sharing: zakah and sadaqah from the harvest', 'Waqf: an endowment that keeps giving across generations'] }],
  },
  orchardMap: {
    title: 'Our Orchard', kicker: 'Map poster',
    summary: 'Three blocks timed so the orchard feeds and earns from year one while the long-term trees mature.',
    sections: [{ h: 'Blocks', items: ['Mango & cashew: long-term backbone', 'Citrus: mid-term, steady market crop', 'Banana, plantain & papaya: quick returns in year one', 'Exact layout and spacing to be confirmed'] }],
  },
  library: {
    title: 'Library', kicker: 'Admin block',
    summary: 'A quiet room for reading, homework and farming references that students and families can borrow.',
    sections: [{ h: 'On the shelves (to be stocked)', placeholder: true, items: ['Practical farming and orchard handbooks', 'Quran and Islamic studies', 'Stories, science and maths readers'] }],
  },
  ledger: {
    title: 'Orchard Accounts', kicker: 'Records office · Income plan',
    summary: 'Every crate sold is written down. Students keep the books as part of the business term, so the income stays transparent.',
    sections: [
      { h: 'Income plan (draft)', placeholder: true, items: ['Revenue split: orchard upkeep · school fund · participating families', 'Prices and volumes to be confirmed with local buyers', 'Monthly report shared with families and the Ihsan team'] },
    ],
  },
  coolStore: {
    title: 'Cool Store', kicker: 'How food is preserved',
    summary: 'A shaded store with no electricity. Zeer pots (a clay pot inside a larger one, with wet sand between) keep produce cool as the water evaporates.',
    sections: [{ h: 'What’s stored here', items: ['Fresh fruit in zeer pots for the next market run', 'Jars of dried mango and banana chips', 'Graded crates waiting for the truck', 'Storage times to be tested on site'] }],
  },
};

// Interior info entries carry their key as an id so role notes can attach to them.
for (const [k, v] of Object.entries(INFO)) v.id = k;

// ---------------------------------------------------------------------------
// Cinematic intro (about 25 seconds, skippable). Each beat travels to a pose,
// then holds while a caption reads. `ramp` sets the speed ramp of the travel;
// `via` adds waypoints to the camera path; `orbit` turns around the target
// during the hold; `drift` eases to a second pose during the hold.
// ---------------------------------------------------------------------------
export const TUTORIAL = [
  {
    tag: 'Welcome', title: 'A school that grows its own future',
    text: 'Sierra Leone. A school orchard that feeds students, teaches them and earns for their families.',
    cam: [-96, 66, 112], target: [6, 0, 0], drift: { cam: [-66, 44, 76], target: [6, 0, 0] },
    travel: 0, hold: 2.1,
  },
  {
    tag: 'Learn', title: 'Numbered dots tell the story',
    text: 'Click any dot to open that part of the school: what it is, why it is here and what it costs.',
    cam: [-6, 9, 18], target: [0, 2.5, -6], drift: { cam: [-3, 8.4, 16.5], target: [0, 2.5, -6] },
    travel: 1.5, hold: 2.1, ramp: 'whip', ui: 'hotspots',
  },
  {
    tag: 'Move', title: 'Three ways to look around',
    text: 'Take the guided tour, fly freely, or walk in first person through the rows.',
    via: [[8, 5.5, 21], [30, 2.1, 28], [30, 2.0, 14]], look: 'ahead',
    cam: [30, 8.5, -4], target: [30, 1, -24], drift: { cam: [30, 12, -9], target: [30, 1, -26] },
    travel: 2.5, hold: 1.8, ramp: 'glide', ui: 'modebar',
  },
  {
    tag: 'Give', title: 'Every tree can carry a name',
    text: 'Click a tree to sponsor it as waqf. It feeds a family for forty years and keeps your name.',
    cam: [38, 10, -6], target: [25, 2.4, -19], orbit: -75,
    travel: 1.4, hold: 2.5, ramp: 'whip', ui: 'tree', tree: 'mango-1-1',
  },
  {
    tag: 'Play', title: 'Go inside and get your hands dirty',
    text: 'Open doors, read the lessons, pick fruit and load the truck for market.',
    cam: [17, 4.2, 23], target: [9, 1.3, 12], drift: { cam: [14.5, 3.7, 21.5], target: [9, 1.3, 12] },
    travel: 1.5, hold: 1.9, ramp: 'whip',
  },
  {
    tag: 'Begin', title: 'Choose how you want to play',
    text: 'Student, volunteer or teacher. Each one sees the orchard through different eyes.',
    cam: [8, 7, 44], target: [4, 1.5, 12], drift: { cam: [7, 6.2, 40], target: [4, 1.5, 12] },
    travel: 2.0, hold: 1.9, ramp: 'out',
  },
];

// ---------------------------------------------------------------------------
// Roles. Each role changes the menu, adds notes to every info panel and sets a
// short path of objectives. Steps marked `kb` need a keyboard (walk mode) and
// are hidden on touch devices.
// ---------------------------------------------------------------------------
export const ROLES = {
  volunteer: {
    name: 'Volunteer', article: 'a volunteer', icon: 'hands', color: '#b5643a',
    tagline: 'Lend your hands, your skills or a tree.',
    blurb: 'See where help is needed most, from the nursery to market day, and sponsor a tree in your name.',
    does: ['Find where hands and skills are needed', 'Load a harvest for market', 'Sponsor a tree as waqf'],
    recommend: 'walk',
    lede: 'You are looking at the orchard as a volunteer. Every panel ends with ways you can help, and any tree can be sponsored in your name.',
    noteTitle: 'How you can help',
    mission: {
      title: 'Volunteer path',
      steps: [
        { id: 'arrive', label: 'Arrive at the school', event: 'arrive', welcome: true },
        { id: 'nursery', label: 'Visit the seedling nursery', event: 'hotspot', match: ['nursery'], at: [-34, 1, 20], r: 5, title: 'Where every orchard starts', text: 'Students raise and graft seedlings under this shade net. Some replant the school orchard, others go home with families.', do: 'Press E at the benches to read about the nursery' },
        { id: 'compost', label: 'See the compost station', event: 'hotspot', match: ['compost'], at: [46, 1, -14], r: 5, title: 'Free fertilizer', text: 'Three bays turn kitchen scraps and leaves into compost. Volunteers turn it with students on Thursdays.', do: 'Press E at the bays' },
        { id: 'walk', label: 'Walk the orchard in first person', event: 'arrive', at: [30, 1, -5], r: 6, kb: true, title: 'The citrus rows', text: 'Oranges, limes and grapefruit, fruiting within two years. Pruning walks happen here every dry season.', do: 'Look around, then follow the light' },
        { id: 'truck', label: 'Load a harvest onto the truck', event: 'truck', at: [30, 1.4, 27], r: 5, kb: true, title: 'Market day', text: 'Surplus is graded, crated and trucked to town. Pick a mango on the way if your basket is empty.', do: 'Press E at the truck with fruit in your basket' },
        { id: 'sponsor', label: 'Sponsor a tree', event: 'sponsor', at: 'tree', r: 5, title: 'Put a name on a tree', text: 'Every long-term tree can be sponsored as an endowment and carries its sponsor’s name on a plaque.', do: 'Press E at the tree, or click it' },
        { id: 'fund', label: 'Help build the water tank', event: 'fund', match: ['tank'], at: [12, 2, -24], r: 6, title: 'The tank that keeps the trees alive', text: 'Without this tank the young trees die in the first dry season. The bar above it shows how close the community is.', do: 'Click the progress bar above the tank' },
      ],
      done: { title: 'You know where to help', text: 'The orchard needs hands at planting, grafting and market days, and sponsors for its long-term trees.', cta: { label: 'Sponsor a tree', action: 'sponsor' } },
    },
    notes: {
      school: ['Join a build weekend: block walls and veranda columns are going up now', 'Equip a classroom with orchard tools: hoes, watering cans, pruning saws', 'Skills to share: construction, carpentry, electrical'],
      classroom: ['Co-teach one afternoon a term with the orchard teacher', 'Share a skill: budgeting, photography, first aid', 'Translate the curriculum posters into Krio'],
      mango: ['Sponsor a tree: click any tree in this block to put your name on it', 'Grafting-day volunteers are needed every rainy season', 'Mulch rings need rebuilding before each dry season'],
      citrus: ['Pruning and pest-scouting walks: learn in a morning, help for years', 'Sponsor a row: seven trees that fruit within two years'],
      banana: ['Planting days: bananas and papaya go in before the rains', 'Weed and mulch between young rows'],
      irrigation: ['Plumbers and solar installers: help commission the pump and drip lines', 'Fund a filter and spare drip tape for the first dry season', 'Join the weekly tank check with the student water team'],
      compost: ['Turn compost with students on Thursdays', 'Bring kitchen scraps and manure from nearby farms', 'Build the third bay: timber and a morning of labour'],
      preserve: ['Run a food-safety session for the preserving lab', 'Fund a second solar dryer', 'Design labels and packaging for market'],
      nursery: ['Sponsor seedlings: a family orchard starts with twenty trees', 'Help pot, label and graft seedlings', 'Donate shade netting and seedling trays'],
      truck: ['Connect the school with buyers in Freetown and Bo', 'Help students set up simple bookkeeping', 'Drive a market run'],
      dining: ['Cook on community harvest days', 'Sponsor a term of school lunches'],
      classA: ['Volunteer as a lab assistant for the soil tests'],
      classB: ['Bring jars, labels and a food thermometer'],
      ledger: ['Mentor the student bookkeepers once a month'],
      coolStore: ['Help build a second zeer-pot rack'],
      seedBank: ['Donate labelled seed from your own fruit trees'],
      library: ['Donate practical farming handbooks'],
    },
  },
  student: {
    name: 'Student', article: 'a student', icon: 'leaf', color: '#2f5d45',
    tagline: 'Learn how the orchard works, from seed to market.',
    blurb: 'Follow the water, the compost and the fruit. Pick, share and sell, and find out why each crop is where it is.',
    does: ['Learn what grows where, and why', 'Score points on a quick check at every stop', 'Earn the Orchard Scholar certificate'],
    recommend: 'explore',
    lede: 'You are looking at the orchard as a student. Every panel ends with a key idea, something to try, and a quick check worth 10 points.',
    noteTitle: 'Key idea · try this',
    mission: {
      title: 'A day at the orchard',
      steps: [
        { id: 'arrive', label: 'Arrive at the school gate', event: 'arrive', welcome: true },
        { id: 'grown', label: 'Morning lesson at the chalkboard', event: 'hotspot', match: ['classroom'], at: [10, 1, 10.5], r: 5, title: 'Morning lesson', text: 'The board shows the orchard cycle: seed, grow, harvest, preserve, sell. Everything you do today follows it.', do: 'Press E at the chalkboard to read the lesson' },
        { id: 'water', label: 'Follow the water to the tank', event: 'hotspot', match: ['irrigation'], at: [12, 2, -24], r: 5, title: 'Where the water comes from', text: 'Roof gutters and a solar pump fill this tank. Gravity carries the water down the blue pipe to every tree.', do: 'Press E at the tank' },
        { id: 'compost', label: 'Check the compost bays', event: 'hotspot', match: ['compost'], at: [46, 1, -14], r: 5, title: 'Food for the soil', text: 'Bay 1 is fresh scraps, bay 2 is cooking, bay 3 is ready to spread.', do: 'Press E at the bays' },
        { id: 'pick', label: 'Pick three mangoes', event: 'pick', count: 3, kb: true, at: [31, 1.9, -19], r: 7, title: 'Harvest', text: 'A grafted mango gives its first fruit after 3 to 5 years, then keeps producing for decades. This block is shown in a bearing year. Fill your basket.', do: 'Press P at three trees' },
        { id: 'share', label: 'Share fruit at the community tables', event: 'share', kb: true, at: [-20, 1, 16.5], r: 5, title: 'Lunch first', text: 'A share of every harvest stays at school. Students eat first, then the surplus goes to market.', do: 'Press E at the tables' },
        { id: 'pick2', label: 'Pick two oranges for market', event: 'pick', count: 2, kb: true, at: [30, 1.6, -3], r: 7, title: 'The citrus rows', text: 'Citrus fruits sooner than mango, so it earns steady income while the big trees grow.', do: 'Press P at two citrus trees' },
        { id: 'truck', label: 'Load the truck', event: 'truck', kb: true, at: [30, 1.4, 27], r: 5, title: 'Market day', text: 'Graded, crated and written down. The truck takes the surplus to buyers in town.', do: 'Press E at the truck' },
        { id: 'ledger', label: 'Read the orchard accounts', event: 'info', match: ['ledger'], kb: true, at: { interact: 'Read the orchard accounts' }, r: 3, title: 'Where the money goes', text: 'Every crate is recorded. The split between upkeep, the school fund and families is written on the wall.', do: 'Open the door of the admin block and press E at the ledger' },
        { id: 'quiz', label: 'Answer 5 quick checks', event: 'quiz', count: 5, title: 'Test what you learned', text: 'Every numbered dot ends with a quick check worth 10 points. Answer five to finish the day.', do: 'Open any numbered dot and answer the question at the bottom' },
      ],
      done: { title: 'You know how the orchard works', text: 'Quick crops pay for slow ones, water goes to the roots, and a share of every harvest stays at school. Answer every quick check to earn the certificate.', cta: { label: 'See my score', action: 'quiz' } },
    },
    notes: {
      school: ['Key idea: the orchard is part of every school day, not an after-school club', 'Try: walk around the school and count the gutters that feed the tank'],
      classroom: ['Key idea: theory on the board, practice ten steps away in the rows', 'Try: read the chalkboard, then find the compost it talks about'],
      mango: ['Key idea: a grafted mango fruits in 3 to 5 years and can produce for 40. That is why it is the endowment tree', 'Try: pick a mango in Walk mode (press P at a tree) and load it onto the truck'],
      citrus: ['Key idea: grafted citrus fruits in 1 to 2 years, long before mango, so it gives steady vitamin C and steady income', 'Try: count the rows. How many trees would give your class one orange a day?'],
      banana: ['Key idea: quick crops pay for the slow ones. Bananas fruit in about a year, mango takes 3 to 5', 'Try: find the aisle through the banana block and walk up it to the citrus'],
      irrigation: ['Key idea: drip lines put water at the roots, using a fraction of the water of flooding', 'Try: follow the blue pipe from the tank to the first drip line'],
      compost: ['Key idea: compost is free fertilizer made from what we throw away', 'Try: find all three bays. Which heap is the oldest?'],
      preserve: ['Key idea: dried mango keeps for months and sells for several times the fresh price', 'Try: look inside the cool store and the zeer pot'],
      nursery: ['Key idea: every seedling here can become a family orchard at home', 'Try: count the seedling trays under the shade net'],
      truck: ['Key idea: surplus becomes income only if it is graded, packed and written down', 'Try: load your basket onto the truck, then read the accounts in the office'],
      dining: ['Key idea: a share of every harvest stays here. Lunch first, then market', 'Try: share fruit at the tables after picking'],
      classA: ['Try: find the seed bank on the shelf and read where each seed came from'],
      classB: ['Try: how many jars of dried mango are on the table?'],
      ledger: ['Try: if a crate sells for 60,000 leones and a third goes to families, how much is that?'],
      coolStore: ['Key idea: evaporating water pulls heat out of the inner pot. No electricity needed'],
      seedBank: ['Key idea: saving seed from the best trees makes next year’s orchard better and free'],
      library: ['Try: which book would you borrow first to start an orchard at home?'],
    },
  },
  teacher: {
    name: 'Teacher', article: 'a teacher', icon: 'book', color: '#1f4a3a',
    tagline: 'Turn the orchard into lessons your students can do.',
    blurb: 'Discussion questions, twenty-minute activities and assessments for every part of the site, term by term.',
    does: ['Get a discussion question for every stop', 'Run a hands-on activity in the rows', 'Follow the four-term curriculum outline'],
    recommend: 'tour',
    lede: 'You are looking at the orchard as a teacher. Every panel ends with a discussion question, an activity and a way to assess it.',
    noteTitle: 'Teaching notes',
    mission: {
      title: 'Teacher path',
      steps: [
        { id: 'arrive', label: 'Arrive at the school', event: 'arrive', welcome: true },
        { id: 'classroom', label: 'Open the outdoor classroom', event: 'hotspot', match: ['classroom'], at: [10, 1, 10.5], r: 5, title: 'Teach at the edge of the rows', text: 'Theory on the board, practice ten steps away. Every lesson in the model ends with a discussion question, an activity and an assessment.', do: 'Press E at the chalkboard' },
        { id: 'door', label: 'Walk into the Orchard Science classroom', event: 'door', match: ['Orchard Science classroom'], kb: true, at: { interact: 'door · Orchard Science classroom' }, r: 3.5, title: 'Inside the school', text: 'The classroom block is hollow and walkable. Doors open with E.', do: 'Press E on the door' },
        { id: 'lesson', label: 'Read a lesson plan', event: 'info', match: ['classA', 'classB'], kb: true, at: { interact: 'Read the lesson', near: [-12, 2, -9] }, r: 4, title: 'Term 1: Soil and seeds', text: 'The board carries the lesson flow: warm-up, demo, group soil test, sowing, reflection.', do: 'Press E at the board' },
        { id: 'accounts', label: 'Review the orchard accounts', event: 'info', match: ['truck', 'ledger'], at: { interact: 'Read the orchard accounts' }, r: 3, title: 'The business term', text: 'Students keep these books in term 4. One week of entries per group makes a good assessment.', do: 'Press E at the ledger in the admin block' },
        { id: 'tour', label: 'Take the guided tour', event: 'tour', title: 'See the whole story', text: 'Six stops, two minutes: the problem, the solution and the impact, ready to project for a class.', do: 'Press Tour in the bottom bar' },
        { id: 'fund', label: 'Help build the water tank', event: 'fund', match: ['tank'], at: [12, 2, -24], r: 6, title: 'A class project with a number on it', text: 'The bar above the tank shows the estimate and what has been raised. A class can watch it climb through the term.', do: 'Click the progress bar above the tank' },
      ],
      done: { title: 'You have a term of lessons', text: 'Every stop in the model now carries a question, an activity and an assessment you can run with a class.', cta: { label: 'Open the curriculum outline', href: 'project.html#curriculum' } },
    },
    notes: {
      school: ['Discuss: why put an orchard at a school instead of on a farm?', 'Activity: students map the site and mark sun, water and wind', 'Assess: a labelled site map with one reason for each placement'],
      classroom: ['Discuss: what can we learn outside that we cannot learn at a desk?', 'Activity (20 min): soil jar test with water from the tank', 'Assess: students label the orchard cycle on the board from memory'],
      mango: ['Discuss: what does it mean that a tree is waqf?', 'Activity: measure spacing between trunks and calculate trees per hectare', 'Assess: a timeline of when each crop first pays back'],
      citrus: ['Discuss: why stagger the harvest across the year?', 'Activity: build a harvest-window calendar for the three citrus crops'],
      banana: ['Discuss: why plant quick crops between slow ones?', 'Activity: growth journal, measuring one banana plant every week'],
      irrigation: ['Discuss: what happens to the tank in the dry season?', 'Activity: measure litres per hour from one dripper and scale it to the block', 'Assess: a water budget for one week'],
      compost: ['Discuss: where does the heat in a compost heap come from?', 'Activity: a thermometer in each bay, graphed daily'],
      preserve: ['Discuss: why does drying stop fruit from spoiling?', 'Activity: weigh fruit before and after drying and calculate the water lost', 'Assess: a food-safety checklist for the lab'],
      nursery: ['Discuss: which trees should we take seed from, and why?', 'Activity: graft a seedling, first as a demo, then in pairs'],
      truck: ['Discuss: who should decide the price of a crate?', 'Activity: mock market, grading, pricing and recording one crate', 'Assess: balance a one-week ledger'],
      dining: ['Discuss: how should a harvest be split between lunch, families and market?', 'Activity: plan a harvest-day menu from what is in season'],
      classA: ['Lesson flow is on the board: warm-up, demo, group soil test, sowing, reflection', 'Differentiate: strong groups test two soils and compare'],
      classB: ['Safety first: hands, knives, clean jars', 'Extension: calculate drying time from the first batch'],
      ledger: ['Use the real ledger in the business term: one week of entries per group'],
      coolStore: ['Demonstrate evaporation with a wet cloth on a thermometer'],
      seedBank: ['Have each group label a seed packet with source tree and date'],
      library: ['Set a reading corner for the farming handbooks during the business term'],
    },
  },
};

// ---------------------------------------------------------------------------
// Tree sponsorship (waqf). Prices are prototype estimates for the presentation
// and are labelled as such in the UI. Set `url` to the organisation's donation
// page to send sponsors there after they pledge; left empty, pledges are
// recorded and the team follows up.
// ---------------------------------------------------------------------------
export const SPONSOR = {
  org: 'Ihsan Foundation for West Africa',
  url: '',
  currency: '$',
  // Itemised cost per tree. Prototype estimates pending local quotes; a seed-grown
  // tree in a comparable Sierra Leone program (Sherbro Foundation) is about $35.
  // This price buys grafted stock and watering through the dry seasons.
  kinds: {
    mango: { label: 'Mango tree', price: 120, years: '3 to 5 years to first fruit · 40+ years of harvest', why: 'A grafted mango is the backbone of the orchard: it feeds a family and the school kitchen for decades.',
      cost: [['Grafted seedling', 8], ['Planting, stake and fence share', 22], ['Water through 3 dry seasons', 45], ['Compost, mulch and pest care', 15], ['Student caretaker training', 20], ['Photo updates and reporting', 10]] },
    cashew: { label: 'Cashew tree', price: 100, years: '3 to 5 years to first nuts · 30+ years of harvest', why: 'Cashew tolerates poor soils and sells as a high-value crop.',
      cost: [['Seedling', 5], ['Planting, stake and fence share', 20], ['Water through 3 dry seasons', 40], ['Compost, mulch and pest care', 10], ['Student caretaker training', 15], ['Photo updates and reporting', 10]] },
    citrus: { label: 'Citrus tree', price: 80, years: '1 to 2 years to first fruit (grafted) · 25+ years of harvest', why: 'Orange, lime and grapefruit: vitamin C every day and a steady market crop.',
      cost: [['Grafted seedling', 6], ['Planting, stake and fence share', 16], ['Water through 2 dry seasons', 30], ['Compost, mulch and pest care', 10], ['Student caretaker training', 10], ['Photo updates and reporting', 8]] },
  },
  comparable: 'A seed-grown tree in a comparable Sierra Leone orchard program costs about $35. This price buys grafted stock, which fruits years sooner, and watering through the dry seasons that kill most young trees.',
  // Tiers. The whole tree is the default; there is no tiny tier.
  tiers: [{ id: 'half', label: 'Half a tree', share: 0.5 }, { id: 'whole', label: 'One tree', share: 1, default: true }, { id: 'row', label: 'A row of 5', share: 1, trees: 5 }],
  // What a sponsor receives. The Foundation confirms the cadence before launch.
  receives: ['A certificate with your name within 24 hours', 'A photo of your tree at planting, with its spot on the map', 'A short update each year when the orchard fruits'],
  jariyah: 'A fruit tree that keeps giving is ongoing charity (sadaqah jariyah): the reward continues as long as the tree feeds people.',
};

// ---------------------------------------------------------------------------
// Quick checks: one question per place in the model, drawn from its own panel.
// `a` is the index of the correct option. First try scores 10, second 5.
// ---------------------------------------------------------------------------
export const QUIZ = {
  school: { q: 'Why build the orchard at the school instead of on a separate farm?', o: ['School land is the only flat land nearby', 'Students are already there every day, so training needs no extra travel', 'Farms are not allowed to sell fruit'], a: 1, why: 'Families are connected through the school, so what students learn travels home.' },
  classroom: { q: 'After a lesson on the chalkboard, where does the practice happen?', o: ['In the rows, ten steps away', 'At home the following week', 'In the library'], a: 0, why: 'Theory on the board, hands in the soil the same afternoon.' },
  mango: { q: 'Why are mango and cashew called the backbone of the orchard?', o: ['They fruit within the first year', 'They need the most water', 'They are hardy, deep-rooted and produce for decades'], a: 2, why: 'They take 3 to 5 years to bear, then keep giving for decades. That is the endowment.' },
  citrus: { q: 'What does citrus give in the early years that mango cannot?', o: ['Fruit sooner, with daily vitamin C and steady income', 'Shade for the classroom', 'Timber for the roof'], a: 0, why: 'Oranges and limes bridge the years while mango matures.' },
  banana: { q: 'How long does a banana plant take to fruit?', o: ['About ten years', 'About twelve months', 'Three to five years'], a: 1, why: 'Quick crops feed students and earn income while the long-term trees grow.' },
  irrigation: { q: 'Why drip lines instead of flooding the rows?', o: ['Flooding is not allowed in Sierra Leone', 'Drip lines are cheaper than buckets', 'Water goes straight to the roots, using far less'], a: 2, why: 'Students run the daily checks: valves, leaks and tank level.' },
  compost: { q: 'What happens in bay 2 of the compost station?', o: ['Fresh kitchen scraps go in', 'Turning and heating for several weeks', 'Finished compost is spread around the trees'], a: 1, why: 'Bay 1 is fresh, bay 2 is cooking, bay 3 is ready.' },
  preserve: { q: 'Why dry mango in a solar dryer?', o: ['It keeps for months and sells when prices are higher', 'Dried mango is heavier to sell', 'Fresh mango cannot be eaten'], a: 0, why: 'Fruit spoils fast in the heat. Drying turns a glut into income.' },
  nursery: { q: 'Besides the school orchard, where do the seedlings go?', o: ['Nowhere, the nursery only serves the school', 'To the kitchen as firewood', 'Home with families to start their own waqf orchards'], a: 2, why: 'Grafting is a skill students can earn from, and it spreads orchards into the community.' },
  truck: { q: 'Who keeps the books for the market sales?', o: ['Students, as part of the business term', 'The truck driver', 'The buyers in town'], a: 0, why: 'Record keeping and pricing are the fourth term of the curriculum.' },
  dining: { q: 'What happens to the share of the harvest that is not sold?', o: ['It goes on the compost', 'It feeds students at lunch and goes home to families', 'It is stored until next year'], a: 1, why: 'The orchard fights hunger right where it grows.' },
  coolStore: { q: 'How does a zeer pot keep produce cool without electricity?', o: ['Ice is delivered from town each morning', 'A small fan blows air through it', 'Water evaporating from wet sand between two pots pulls heat out'], a: 2, why: 'Evaporation takes heat with it, the same way sweat cools skin.' },
  ledger: { q: 'Where does the money from a sold crate go?', o: ['All of it to the truck owner', 'It is kept by the buyer', 'Split between orchard upkeep, the school fund and families'], a: 2, why: 'The split is written down so the income stays transparent.' },
};

// ---------------------------------------------------------------------------
// Fundable systems. Each has a goal, an itemised estimate (prototype figures
// pending local quotes), and a progress bar that floats above it in the model.
// ---------------------------------------------------------------------------
export const PROJECTS = {
  tank: {
    id: 'tank', title: 'Water storage tank', short: 'Water tank',
    pos: [12, 9.9, -24],
    goal: 4800,
    why: 'Young trees die in the dry season without water. This elevated 10,000-litre tank, filled by the roof gutters and a solar pump, feeds every drip line by gravity for the whole orchard.',
    cost: [['10,000-litre tank', 1200], ['Steel tower and base', 1400], ['Solar pump and panels', 1100], ['Gutters, header pipe and drip lines', 700], ['Borehole connection and fittings', 400]],
    tiers: [25, 60, 120, 250],
    defaultTier: 60,
    receives: ['Your name on the tank sign in the model and on site', 'A photo when the tank is lifted onto its tower', 'A note from the student water team after the first dry season'],
    note: 'Estimate pending local quotes from Freetown suppliers. Every pledge is recorded and the Foundation follows up.',
  },
};
