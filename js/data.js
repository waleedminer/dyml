// Content for the 3D explorer. Items marked `placeholder: true` are still being
// finalized by the team and are labeled as such in the UI.

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
        'Grafted mango, bearing within a few years',
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
        'Banana and plantain: food staple, fruit in 9–12 months',
        'Papaya: fruit in under a year, rich in vitamin A',
        'Pineapple and cassava between young rows',
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
    title: '82% of Sierra Leone is food insecure',
    text: 'That is the World Food Programme figure. 26% of children are stunted from malnutrition, and rural poverty stands at 86.3%. How might we design an orchard that gives this community reliable food and income?',
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
