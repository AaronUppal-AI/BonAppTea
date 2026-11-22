/**
 * Kochi (꼬치 한식당), 652 10th Ave, Hell's Kitchen, New York.
 *
 * Restaurant facts and the menu come from https://www.kochinyc.com/ (home, /menu, /the-team),
 * read 2026-11-22. Rivals, their reviews and creators are NOT seeded: the pipeline pulls them live
 * through Treg (Google Maps + Instagram). Trend stage and velocity start as placeholders and are replaced
 * by live Google Trends + TikTok signals (Treg) when the enrichment pipeline runs; weekly-revenue upside
 * stays an illustrative estimate.
 */

export const KOCHI = {
  restaurant: {
    id: "rest-kochi",
    name: "Kochi",
    cuisine: "Korean",
    cuisines: ["Korean", "Desserts"],
    concept: "Korean skewer (kkochi) tasting menu, \"an homage to Korean royal cuisine\"",
    chef: "Sungchul Shim",
    award: "One Michelin star",
    address: "652 10th Ave, New York, NY 10036",
    neighborhood: "Hell's Kitchen",
    lat: 40.7619926,
    lng: -73.9932964,
    website: "https://www.kochinyc.com/",
    instagram: "kochinyc",
    reservations: "OpenTable",
    hours: "Dinner 7 nights: Mon–Thu & Sun 5:00–9:30 PM, Fri–Sat 5:00–10:00 PM",
    tasting_price: 145,
    pairing_price: 110,
    avg_check: 145,
    // Shifts the owner wants to fill (Kochi serves dinner only)
    slow_shifts: ["Monday dinner", "Tuesday dinner", "5:00 PM seatings"],
    // Chef Shim's own restaurants are not rivals
    // Chef Shim's other restaurants (Team page; PM brief) are never treated as rivals
    sister_restaurants: ["Mari", "Gui", "GUI Steakhouse"],
    google_place_id: "ChIJN8SzjFRZwokR-b5lqNXcg44",
    instagram_location_id: "869095460127552",
    // When the menu and facts above were last checked against the website
    facts_checked: "2026-11-22",
  },
  city: "New York",
  neighborhoods: [
    "Hell's Kitchen", "Midtown", "Times Square", "Chelsea", "Hudson Yards", "Upper West Side", "Koreatown",
    "East Village", "West Village", "Lower East Side", "SoHo", "Williamsburg", "Greenpoint",
  ],
  adjacency: [
    ["Hell's Kitchen", "Midtown"],
    ["Hell's Kitchen", "Times Square"],
    ["Hell's Kitchen", "Chelsea"],
    ["Hell's Kitchen", "Hudson Yards"],
    ["Hell's Kitchen", "Upper West Side"],
    ["Midtown", "Koreatown"],
    ["Midtown", "Times Square"],
    ["Chelsea", "West Village"],
    ["East Village", "Lower East Side"],
    ["Williamsburg", "Greenpoint"],
  ],
  cuisines: ["Korean", "Desserts", "Japanese", "Italian", "American"],
  themes: ["portions", "price", "wait times", "service", "noise", "reservations"],
  // The 8-course Chef's Signature Menu, with each course's listed ingredients
  menu: [
    { id: "menu-squid", name: "Squid (오징어 콩국수)", ingredients: ["squid", "macadamia", "edamame", "dasima oil"] },
    { id: "menu-fluke", name: "Fluke (광어 회무침)", ingredients: ["fluke", "maesil", "perilla", "minari", "pear"] },
    { id: "menu-halibut", name: "Halibut skewer (넙치 꼬치)", ingredients: ["halibut", "jiri consommé", "radish", "napa cabbage", "purple cabbage"] },
    { id: "menu-octopus", name: "Octopus skewer (문어 꼬치)", ingredients: ["octopus", "celtuce", "curry aioli", "potato"] },
    { id: "menu-duck", name: "Duck (오리 스테이크)", ingredients: ["duck", "namul", "king oyster mushroom", "cucumber kimchi"] },
    { id: "menu-tuna-bibimbap", name: "Tuna Bibimbap (참치 비빔밥)", ingredients: ["bluefin tuna", "kimchi", "seaweed", "rice"] },
    { id: "menu-strawberry-apple", name: "Strawberry & Apple (스크류바)", ingredients: ["strawberry", "apple", "milk", "mint"] },
    { id: "menu-black-sesame", name: "Black Sesame (흑임자바)", ingredients: ["black sesame", "matcha", "black rice", "milk"] },
  ],
  // Strengths are facts from Kochi's site, mapped to the complaint themes they answer
  strengths: [
    { id: "str-price", theme: "price", pitch: "one-Michelin-star eight-course tasting menu for $145" },
    { id: "str-portions", theme: "portions", pitch: "eight-course tasting menu (plus an optional abalone course)" },
    { id: "str-reservations", theme: "reservations", pitch: "OpenTable reservations, dinner seven nights a week" },
    { id: "str-wait", theme: "wait times", pitch: "reserved seatings from 5 PM every night" },
  ],
  trends: [
    {
      id: "ft-bibimbap-mix", name: "Tableside Bibimbap Mix", keyword: "bibimbap", hashtag: "bibimbap", stage: "Accelerating", velocity_pct: 230,
      visual_format: "one slow tableside mix of the bibimbap", hook: "Sensory ASMR",
      audio: "rice scrape and sizzle sound", est_weekly_revenue: 1500,
      requires: ["rice", "seaweed", "kimchi"], fits: ["Korean"],
    },
    {
      id: "ft-black-sesame", name: "Black Sesame Desserts", keyword: "black sesame", hashtag: "blacksesame", stage: "Accelerating", velocity_pct: 260,
      visual_format: "spoon cracking through black sesame ice cream", hook: "Sensory ASMR",
      audio: "soft crunch close-up sound", est_weekly_revenue: 1200,
      requires: ["black sesame", "milk"], fits: ["Desserts", "Korean"],
    },
    {
      id: "ft-perilla", name: "Perilla Leaf Everything", keyword: "perilla", hashtag: "perilla", stage: "Emerging", velocity_pct: 210,
      visual_format: "perilla leaf torn over raw fish", hook: "Secret Menu",
      audio: "leaf tear and knife sound", est_weekly_revenue: 900,
      requires: ["perilla", "fluke", "pear"], fits: ["Korean"],
    },
    {
      id: "ft-matcha", name: "Matcha Cream Everything", keyword: "matcha", hashtag: "matcha", stage: "Mainstream", velocity_pct: 110,
      visual_format: "matcha cream pour", hook: "Sensory ASMR", audio: "pour sound", est_weekly_revenue: 500,
      requires: ["matcha", "milk", "heavy cream"], fits: ["Desserts", "Japanese"],
    },
    {
      id: "ft-corn-dog", name: "Korean Corn Dogs", keyword: "korean corn dog", hashtag: "koreancorndog", stage: "Saturated", velocity_pct: 30,
      visual_format: "cheese pull", hook: "Shock/Scale", audio: "crunch sound", est_weekly_revenue: 300,
      requires: ["hot dogs", "rice flour", "mozzarella"], fits: ["Korean"],
    },
    {
      id: "ft-dubai-chocolate", name: "Dubai Chocolate Desserts", keyword: "dubai chocolate", hashtag: "dubaichocolate", stage: "Saturated", velocity_pct: 25,
      visual_format: "pistachio kataifi snap", hook: "Shock/Scale", audio: "snap sound", est_weekly_revenue: 300,
      requires: ["pistachio cream", "kataifi", "chocolate"], fits: ["Desserts"],
    },
  ],
};
