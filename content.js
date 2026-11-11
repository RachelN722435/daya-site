/* ==========================================================================
   DAYA — everything you will ever want to edit lives in this one file.

   1. config        → weekly affirmation + stylist contact details
   2. bodyTypes     → the body type menu
   3. occasions     → the occasion menu
   4. looks         → the outfits shown across the site
   5. articles      → the journal (short write-ups)

   Edit, save, redeploy. No other file needs to change.
   ========================================================================== */

window.DAYA = {

  /* ---------- 1. CONFIG ---------- */
  config: {

    /* WEEKLY AFFIRMATION BAR
       Option A (automatic): add your sentences to the list below. The bar
       moves to the next one every Monday, starting from `affirmationStart`.
       Option B (manual): type a sentence into `affirmationOverride` and it
       will show instead, until you clear it again. */
    affirmationStart: "2026-11-09",      // a Monday
    affirmationOverride: "",
    affirmations: [
      "You are allowed to take up space, in every room you walk into.",
      "Your body is not a problem to solve. It is home, and it deserves to feel good.",
      "You don't have to shrink to be chosen. Show up as you are.",
      "Getting dressed is an act of kindness to yourself. Start there today.",
      "Your confidence is not something you earn. It's something you wear.",
      "You are already enough. The outfit is just the fun part.",
      "Walk like you know where you're going. Because you do.",
      "Soft is strong. Bold is beautiful. You get to be both.",
      "Comfort and style were never opposites. You deserve both.",
      "Be proud of how far you've come, and gentle about how far you have to go.",
      "Your story is still being written. Dress like the main character.",
      "You are worthy of good things, and that includes a great fit."
    ],

    /* STYLIST CONTACT — fill these in so "Book" and "Chat" work.
       whatsapp: country code + number, digits only, e.g. "2348012345678"
       email: where booking requests should be sent */
    whatsapp: "2348089484402",
    email: "nesse.management@gmail.com"
  },

  /* ---------- 2. BODY TYPES ---------- */
  bodyTypes: [
    { slug: "hourglass", name: "Hourglass", desc: "Bust and hips are close in size, with a clearly defined waist." },
    { slug: "pear", name: "Pear", desc: "Hips are wider than the bust and shoulders." },
    { slug: "apple", name: "Apple", desc: "You carry more fullness around the middle, with a waist similar to or wider than your bust and hips." },
    { slug: "rectangle", name: "Rectangle", desc: "Bust, waist and hips are fairly similar in measurement." },
    { slug: "inverted-triangle", name: "Inverted triangle", desc: "Shoulders and bust are broader than the hips." },
    { slug: "athletic", name: "Athletic", desc: "A strong, toned frame with a straighter waistline." },
    { slug: "petite", name: "Petite", desc: "160 cm (5'3\") or under. Proportion and hem length matter most." },
    { slug: "tall", name: "Tall", desc: "175 cm (5'9\") or over. Length in sleeves, trousers and dresses matters most." },
    { slug: "plus-size", name: "Plus size", desc: "UK 18 and above (US 14+). Shape, stretch and structure over size labels." },
    { slug: "full-bust", name: "Full bust", desc: "A bust that is noticeably fuller than the rest of your frame, often a D cup or above." }
  ],

  /* ---------- 3. OCCASIONS ---------- */
  occasions: [
    { slug: "workwear", name: "Workwear" },
    { slug: "suits", name: "Suits" },
    { slug: "modest", name: "Modest" },
    { slug: "evening-gowns", name: "Evening gowns" },
    { slug: "beachwear", name: "Beachwear" },
    { slug: "weddings", name: "Weddings" },
    { slug: "date-night", name: "Date night" },
    { slug: "everyday", name: "Everyday" },
    { slug: "events", name: "Events" },
    { slug: "party", name: "Party" },
    { slug: "church", name: "Church" },
    { slug: "brunch", name: "Brunch" }
  ],

  /* ---------- 4. LOOKS ----------
     price / was   → numbers, in the look's currency (was = the old price, for deals)
     currency      → "NGN" or "USD"
     bodies        → body type slugs this look suits
     featured      → true = appears under "Best looks"
     url           → link to the retailer (leave "" if none; the card will offer "Ask a stylist")
     fabric        → a few words, e.g. "Satin, stretch" (shown on the look's page)
     styling       → a short note on how to style it (shown on the look's page)
     image         → the photo. Replace the sample photos with each look's own.

     NOTE: these are the sample looks from your current site. The "was" prices
     are placeholders so you can see how Best deals works. Replace with real ones. */
  looks: [
    {
      id: "topshop-teal-maxi",
      name: "Embellished fringed maxi dress in teal",
      brand: "Asos Topshop",
      occasion: "date-night",
      bodies: ["hourglass", "pear", "tall"],
      price: 490, currency: "USD",
      featured: true,
      url: "https://www.asos.com/topshop/topshop-premium-heavily-embellished-fringed-maxi-dress-in-teal-polka-dot/prd/210745025#colourWayId-210745031",
      fabric: "",    // e.g. "Satin, stretch" (a few words)
      styling: "",   // one or two short lines on how to style it
      image: "https://hcqzgqdezosaqfsadjyq.supabase.co/storage/v1/object/public/site-images/1794407060995-xmioyv.jpg"
    },
    {
      id: "wide-leg-shirt",
      name: "Wide-leg trousers and shirt",
      brand: "",
      occasion: "workwear",
      bodies: ["pear", "rectangle", "tall", "petite"],
      price: 55000, currency: "NGN",
      featured: true,
      url: "",
      fabric: "",    // e.g. "Satin, stretch" (a few words)
      styling: "",   // one or two short lines on how to style it
      image: "https://hcqzgqdezosaqfsadjyq.supabase.co/storage/v1/object/public/site-images/1794407102796-6oykzm.jpg"
    },
    {
      id: "statement-dress",
      name: "Statement dress",
      brand: "",
      occasion: "weddings",
      bodies: ["hourglass", "plus-size", "full-bust", "apple"],
      price: 85000, was: 110000, currency: "NGN",
      featured: true,
      url: "",
      fabric: "",    // e.g. "Satin, stretch" (a few words)
      styling: "",   // one or two short lines on how to style it
      image: "https://hcqzgqdezosaqfsadjyq.supabase.co/storage/v1/object/public/site-images/1794406986889-3q7d7k.jpg"
    },
    {
      id: "evening-look",
      name: "Evening look",
      brand: "",
      occasion: "date-night",
      bodies: ["hourglass", "rectangle", "athletic"],
      price: 70000, was: 90000, currency: "NGN",
      featured: true,
      url: "",
      fabric: "",    // e.g. "Satin, stretch" (a few words)
      styling: "",   // one or two short lines on how to style it
      image: "https://hcqzgqdezosaqfsadjyq.supabase.co/storage/v1/object/public/site-images/1794407060995-xmioyv.jpg"
    },
    {
      id: "relaxed-everyday-set",
      name: "Relaxed everyday set",
      brand: "",
      occasion: "everyday",
      bodies: ["apple", "rectangle", "plus-size", "petite"],
      price: 35000, currency: "NGN",
      featured: false,
      url: "",
      fabric: "",    // e.g. "Satin, stretch" (a few words)
      styling: "",   // one or two short lines on how to style it
      image: "https://hcqzgqdezosaqfsadjyq.supabase.co/storage/v1/object/public/site-images/1794407170481-797s7t.jpg"
    },
    {
      id: "layered-casual",
      name: "Layered casual look",
      brand: "",
      occasion: "brunch",
      bodies: ["inverted-triangle", "athletic", "tall"],
      price: 45000, was: 52000, currency: "NGN",
      featured: false,
      url: "",
      fabric: "",    // e.g. "Satin, stretch" (a few words)
      styling: "",   // one or two short lines on how to style it
      image: "https://hcqzgqdezosaqfsadjyq.supabase.co/storage/v1/object/public/site-images/1794406786730-jxa0b3.jpg"
    },
    {
      id: "structured-event-dress",
      name: "Structured event dress",
      brand: "",
      occasion: "events",
      bodies: ["hourglass", "pear", "full-bust"],
      price: 90000, was: 120000, currency: "NGN",
      featured: false,
      url: "",
      fabric: "",    // e.g. "Satin, stretch" (a few words)
      styling: "",   // one or two short lines on how to style it
      image: "https://hcqzgqdezosaqfsadjyq.supabase.co/storage/v1/object/public/site-images/1794407184155-3d1tya.jpg"
    }
  ],

  /* ---------- 5. ARTICLES ----------
     To add one: copy a block, change the id (no spaces), and write.
     Newest first. In `body`, each string is a paragraph; start a string
     with "## " to make it a sub-heading. */
  articles: [
    {
      id: "measure-without-the-panic",
      title: "How to take your measurements without the panic",
      date: "2026-11-09",
      readMins: 3,
      excerpt: "Three numbers, one tape measure, five minutes. Here is how to get them right, and what to do with them.",
      image: "",
      body: [
        "A tape measure is a tool, not a verdict. The numbers you take are only there to help you find clothes that fit the body you have today.",
        "## What you need",
        "A soft tape measure, a mirror, and clothes thin enough that they won't add bulk. Stand relaxed, feet together, and breathe normally.",
        "## The three measurements",
        "Bust: around the fullest part of your chest, with the tape level across your back. Waist: around the narrowest part of your torso, usually just above the belly button. Hips: around the fullest part of your hips and bottom, feet together.",
        "Write all three down, then use our body calculator to turn them into a size and a body type. Remember that sizes change from brand to brand, so always glance at the retailer's own chart too."
      ]
    },
    {
      id: "what-to-wear-to-a-wedding",
      title: "Not sure what to wear to the wedding? Start here",
      date: "2026-11-02",
      readMins: 3,
      excerpt: "A simple way to choose an outfit that photographs well, feels good at hour six, and doesn't compete with the bride.",
      image: "",
      body: [
        "Wedding outfits fail for two reasons: they look great for ten minutes, or they look great but you can't sit in them. Plan for the whole day.",
        "## Check the invitation first",
        "Dress code, colour request and venue all narrow your choices fast. If the invitation says nothing, ask the couple, or look at the venue and the time of day.",
        "## Choose fabric for the hours, not the hour",
        "Look for fabrics that hold their shape and breathe. A structured dress or a well-cut two-piece will still look sharp after hours of sitting, dancing and hugging.",
        "## Build around one statement",
        "One strong piece, whether it's the colour, the sleeve or the gele, and keep everything else quiet. It looks deliberate, and it's easier to accessorise."
      ]
    },
    {
      id: "why-sizes-dont-match",
      title: "Why your size changes from shop to shop",
      date: "2026-10-26",
      readMins: 2,
      excerpt: "You're not changing. The labels are. A quick guide to shopping across brands without the guesswork.",
      image: "",
      body: [
        "If you wear a 12 in one shop and a 14 in another, nothing is wrong with you. There is no single standard for women's sizing, and every brand cuts for its own idea of a customer.",
        "## What to do instead",
        "Use your measurements, not the number on the label. Compare them with the size chart on the product page, and read the fabric details: stretch changes everything.",
        "When you're between sizes, size up for structured pieces and size down for stretchy ones. A good tailor can take clothes in far more easily than they can let them out."
      ]
    }
  ]
};
