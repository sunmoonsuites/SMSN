export interface SeoPageConfig {
  path: string;
  title: string;
  description: string;
  canonical: string;
  h1: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  badge: string;
  intro: string;
  highlights: string[];
  sections: {
    h2: string;
    h3?: string;
    paragraphs: string[];
    bullets?: string[];
  }[];
  nearbyPlaces: {
    name: string;
    distance: string;
    travelTime: string;
    purpose: string;
  }[];
  faqs: {
    question: string;
    answer: string;
  }[];
}

export const BASE_SITE_URL = 'https://sunmoonhotels.com';

export const ROUTE_SEO_META: Record<
  string,
  {
    title: string;
    description: string;
    canonical: string;
    h1: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
  }
> = {
  '/': {
    title: 'Hotel in Sector 117 Noida | Sun Moon Suites',
    description:
      'Book your stay at Sun Moon Suites, a comfortable 30-room boutique hotel in Sector 117 Noida near Medanta Hospital, Tivoli Lotus Court & Sector 76 Metro.',
    canonical: `${BASE_SITE_URL}/`,
    h1: 'Sun Moon Suites – Hotel in Sector 117 Noida',
    primaryKeyword: 'Hotel in Sector 117 Noida',
    secondaryKeywords: [
      'Hotels in Sector 117 Noida',
      'Best Hotel in Sector 117 Noida',
      'Boutique Hotel in Noida',
      'Hotel Near Medanta Hospital Noida',
      'Hotel Near Sector 76 Metro Station',
      'Sun Moon Suites Noida',
    ],
  },
  '/rooms': {
    title: 'Hotel Rooms in Sector 117 Noida | Deluxe & Family Suites – Sun Moon Suites',
    description:
      'Explore 30 air-conditioned hotel rooms and suites at Sun Moon Suites in Sector 117 Noida. Book Deluxe, Executive & Family rooms with free Wi-Fi & parking.',
    canonical: `${BASE_SITE_URL}/rooms`,
    h1: 'Hotel Rooms & Suites in Sector 117 Noida',
    primaryKeyword: 'Hotel Rooms in Noida',
    secondaryKeywords: [
      'Rooms in Sector 117 Noida',
      'Deluxe Room in Noida',
      'Executive Room in Noida',
      'Family Room in Noida',
      'Book Hotel Room Noida',
    ],
  },
  '/amenities': {
    title: 'Hotel with Parking, Free Wi-Fi & Lift in Noida | Sun Moon Suites',
    description:
      'Stay at Sun Moon Suites in Sector 117 Noida featuring AC rooms, elevator access across 3 floors, 100% power backup, free Wi-Fi, 24x7 front desk & parking.',
    canonical: `${BASE_SITE_URL}/amenities`,
    h1: 'Guest Amenities & Facilities at Sun Moon Suites Noida',
    primaryKeyword: 'Hotel with Parking in Noida',
    secondaryKeywords: [
      'Hotel with Free WiFi in Noida',
      'Hotel with Power Backup in Noida',
      'Hotel with AC Rooms in Noida',
      'Hotel with Lift in Noida',
      'Family Friendly Hotel in Noida',
    ],
  },
  '/offers': {
    title: 'Direct Hotel Booking Offers in Noida | Sun Moon Suites Sector 117',
    description:
      'Get the best direct room tariffs and zero booking fees at Sun Moon Suites in Sector 117 Noida. Special packages for corporate, family & medical stays.',
    canonical: `${BASE_SITE_URL}/offers`,
    h1: 'Direct Hotel Booking Offers in Sector 117 Noida',
    primaryKeyword: 'Hotel Room Booking Noida',
    secondaryKeywords: [
      'Book Hotel in Sector 117 Noida',
      'Affordable Hotel in Noida',
      'Business Hotel in Noida',
    ],
  },
  '/gallery': {
    title: 'Photos of Sun Moon Suites | Boutique Hotel in Sector 117 Noida',
    description:
      'View verified photos of rooms, suites, reception lobby, and guest facilities at Sun Moon Suites, located at GT-20, Sector 117, Noida.',
    canonical: `${BASE_SITE_URL}/gallery`,
    h1: 'Sun Moon Suites Sector 117 Noida – Property Photo Gallery',
    primaryKeyword: 'Sun Moon Suites Noida',
    secondaryKeywords: ['Sun Moon Suites Sector 117 Noida', 'Hotel Rooms in Noida'],
  },
  '/insights': {
    title: 'Noida Travel Insights, Local Events & Stay Guides | Sun Moon Suites',
    description:
      'Read local Noida travel tips, upcoming event guides, metro transit routes, and hospitality updates from Sun Moon Suites in Sector 117 Noida.',
    canonical: `${BASE_SITE_URL}/insights`,
    h1: 'Noida Travel Insights, Local Events & Hotel News',
    primaryKeyword: 'Noida Travel Tips & Local Events',
    secondaryKeywords: [
      'Hotel in Sector 117 Noida',
      'Medanta Hospital Noida Stay Guide',
      'Tivoli Lotus Court Wedding Guest Rooms',
      'Sector 76 Metro Station Noida Guide',
    ],
  },
  '/location': {
    title: 'Location & Directions to Sun Moon Suites | Sector 117 Noida',
    description:
      'Find directions to Sun Moon Suites at GT-20, Sector 117, Noida (201316). Convenient access to Sector 76 Metro, Medanta Hospital & Tivoli Lotus Court.',
    canonical: `${BASE_SITE_URL}/location`,
    h1: 'How to Reach Sun Moon Suites in Sector 117 Noida',
    primaryKeyword: 'Hotel Near Sector 117 Noida',
    secondaryKeywords: [
      'Hotel near Sector 116 Noida',
      'Hotel near Sector 76 Noida',
      'Hotel near Spectrum Metro Mall Noida',
    ],
  },
  '/contact': {
    title: 'Contact Sun Moon Suites Sector 117 Noida | 24x7 Reservation Desk',
    description:
      'Contact Sun Moon Suites at GT-20, Sector 117, Noida. Call +91 8586868442 or WhatsApp our 24x7 reception desk for room bookings and group enquiries.',
    canonical: `${BASE_SITE_URL}/contact`,
    h1: 'Contact Sun Moon Suites – Sector 117 Noida Reservation Desk',
    primaryKeyword: 'Book Hotel in Sector 117 Noida',
    secondaryKeywords: [
      'Sun Moon Suites Contact',
      'Hotel Booking in Noida',
      'Group Hotel Booking Noida',
    ],
  },
};

export const DEDICATED_LANDING_PAGES: Record<string, SeoPageConfig> = {
  '/hotel-in-sector-117-noida': {
    path: '/hotel-in-sector-117-noida',
    title: 'Best Hotel in Sector 117 Noida | Rooms & Booking – Sun Moon Suites',
    description:
      'Looking for a hotel in Sector 117 Noida? Stay at Sun Moon Suites (GT-20, Sector 117) with 30 AC rooms, lift, free Wi-Fi, power backup & free parking.',
    canonical: `${BASE_SITE_URL}/hotel-in-sector-117-noida`,
    h1: 'Best Hotel in Sector 117 Noida – Sun Moon Suites',
    primaryKeyword: 'Hotel in Sector 117 Noida',
    secondaryKeywords: [
      'Hotels in Sector 117 Noida',
      'Best Hotel in Sector 117 Noida',
      'Hotel Near Sector 117 Noida',
      'Rooms in Sector 117 Noida',
      'Stay in Sector 117 Noida',
      'Hotel near Sector 115 Noida',
      'Hotel near Sector 116 Noida',
      'Hotel near Sector 118 Noida',
      'Hotel near Sector 119 Noida',
      'Hotel near Sector 120 Noida',
      'Hotel near Sector 121 Noida',
      'Hotel near Sector 122 Noida',
      'Hotel near Sector 74 Noida',
      'Hotel near Sector 75 Noida',
      'Hotel near Sector 76 Noida',
      'Hotel near Sector 77 Noida',
      'Hotel near Sector 78 Noida',
    ],
    badge: 'GT-20, Sector 117, Noida • 30 Boutique Rooms',
    intro:
      'Located at GT-20, Sector 117, Noida (Uttar Pradesh 201316), Sun Moon Suites is a 30-room boutique hotel designed for families, corporate travelers, medical visitors, and event guests seeking a clean, peaceful, and well-connected stay in Central Noida.',
    highlights: [
      '30 Air-Conditioned Rooms Across 3 Floors with Elevator',
      'Free High-Speed Wi-Fi, 100% Power Backup & On-Site Parking',
      'Direct Booking with Zero Commission Fees',
    ],
    sections: [
      {
        h2: 'Comfortable Hotel Rooms in Sector 117 Noida',
        h3: 'Thoughtfully Equipped Deluxe, Executive & Family Accommodations',
        paragraphs: [
          'Finding a reliable hotel in Sector 117 Noida that balances comfort, hygiene, and transparent pricing is essential whether you are visiting for a single night or an extended stay. Sun Moon Suites offers 30 well-maintained rooms spread across three floors connected by a modern passenger lift.',
          'Every guest room includes climate-controlled air conditioning, comfortable bedding with fresh linen, a dedicated work desk for business travelers, a smart LED television, an electric tea/coffee kettle, and an attached bathroom with 24-hour hot and cold running water.',
        ],
        bullets: [
          'Deluxe & Super Deluxe Rooms ideal for solo business travelers and couples.',
          'Executive Rooms & spacious Family Suites suited for families and group stays.',
          'Standard check-in at 14:00 and check-out at 11:00 with 24x7 front desk support.',
          'Full diesel generator power backup ensuring uninterrupted AC and elevator operation.',
        ],
      },
      {
        h2: 'Convenient Stay for Nearby Central Noida Sectors',
        h3: 'Serving Guests Visiting Sectors 115–122 and Sectors 74–78 Noida',
        paragraphs: [
          'Residential societies and commercial hubs in Central Noida often have limited boutique hotel options inside their immediate neighborhood. Because Sun Moon Suites is situated right at GT-20 in Sector 117, it serves as a convenient accommodation choice for guests visiting relatives or attending business meetings across surrounding sectors.',
          'Travelers searching for a hotel near Sector 115 Noida, Sector 116, Sector 118, Sector 119, Sector 120, Sector 121, or Sector 122 can reach our property within 3 to 8 minutes by road. We are equally accessible for visitors looking for a hotel near Sector 74, Sector 75, Sector 76, Sector 77, and Sector 78 in Noida.',
        ],
      },
    ],
    nearbyPlaces: [
      {
        name: 'Tivoli Lotus Court Banquet (Sector 117)',
        distance: 'Approx. 0.8 km',
        travelTime: '2–3 mins drive',
        purpose: 'Ideal stay for wedding guests, family celebrations, and corporate events.',
      },
      {
        name: 'Sector 76 Metro Station (Aqua Line)',
        distance: 'Approx. 2.2 km',
        travelTime: '5 mins drive',
        purpose: 'Quick metro connectivity across Noida, Greater Noida, and Delhi NCR.',
      },
      {
        name: 'Spectrum Metro Mall (Sector 75)',
        distance: 'Approx. 2.5 km',
        travelTime: '5–6 mins drive',
        purpose: 'Shopping, dining, commercial offices, and entertainment.',
      },
      {
        name: 'Medanta Hospital Noida',
        distance: 'Short drive via Central Noida road network',
        travelTime: '5–10 mins drive',
        purpose: 'Peaceful accommodation for patient attendants, families, and visiting doctors.',
      },
      {
        name: 'Sector 51 Metro Station (Blue Line Interchange)',
        distance: 'Approx. 3.5 km',
        travelTime: '7–8 mins drive',
        purpose: 'Direct Blue Line metro link toward Connaught Place and New Delhi Railway Station.',
      },
    ],
    faqs: [
      {
        question: 'Where exactly is Sun Moon Suites located in Sector 117 Noida?',
        answer:
          'Sun Moon Suites is located at Plot GT-20, Sector 117, Noida, Uttar Pradesh 201316 (Google Maps Plus Code: H9FW+8F), just off the main Sector 117–76 corridor.',
      },
      {
        question: 'Does the hotel provide parking and elevator access?',
        answer:
          'Yes, Sun Moon Suites provides complimentary on-site parking under CCTV surveillance as well as elevator (lift) access to all three guest floors.',
      },
      {
        question: 'How can I book a room directly at Sun Moon Suites?',
        answer:
          'You can check availability and book directly on our website with zero commission fees, or call/WhatsApp our 24x7 reservation desk at +91 8586868442.',
      },
    ],
  },

  '/hotel-near-medanta-hospital-noida': {
    path: '/hotel-near-medanta-hospital-noida',
    title: 'Hotel Near Medanta Hospital Noida | Family Stay – Sun Moon Suites',
    description:
      'Convenient hotel near Medanta Hospital Noida in Sector 117. Peaceful AC rooms, elevator access, 24x7 front desk, power backup & parking at Sun Moon Suites.',
    canonical: `${BASE_SITE_URL}/hotel-near-medanta-hospital-noida`,
    h1: 'Hotel Near Medanta Hospital Noida – Peaceful Stay for Families & Attendants',
    primaryKeyword: 'Hotel Near Medanta Hospital Noida',
    secondaryKeywords: [
      'Hotels Near Medanta Hospital Noida',
      'Rooms Near Medanta Hospital Noida',
      'Stay Near Medanta Hospital Noida',
      'Hotel Room Near Medanta Hospital Noida',
      'Family Hotel Near Medanta Hospital Noida',
      'Accommodation Near Medanta Hospital Noida',
    ],
    badge: 'Medical Visitor & Family Friendly Stay • Sector 117 Noida',
    intro:
      'When accompanying a family member for medical consultations, diagnostic visits, or inpatient care at Medanta Hospital Noida, having a clean, quiet, and dependable place to rest nearby makes a meaningful difference. Sun Moon Suites at GT-20, Sector 117, Noida offers restful accommodation with 24x7 reception support.',
    highlights: [
      'Passenger Elevator (Lift) to All 3 Floors for Easy Mobility',
      'Quiet, Hygienic AC Rooms with 24-Hour Hot & Cold Water',
      '24x7 Front Desk Assistance, Power Backup & Free Parking',
    ],
    sections: [
      {
        h2: 'Thoughtful Accommodation Near Medanta Hospital Noida',
        h3: 'Designed for Patient Attendants, Visiting Families & Healthcare Professionals',
        paragraphs: [
          'Hospital visits often involve early-morning appointments, unpredictable schedules, and multi-day stays. Located in a calm residential-commercial pocket at GT-20, Sector 117, Noida, Sun Moon Suites provides a peaceful environment where patient attendants and family members can recharge.',
          'Our building is equipped with a modern passenger lift serving all three floors, making it convenient for senior citizens and guests carrying luggage. Every room is thoroughly sanitized prior to check-in and features air conditioning, fresh bed linen, an electric kettle for warm water or tea, and high-speed Wi-Fi.',
        ],
        bullets: [
          '24x7 front desk reception to assist with late-night arrivals or early check-outs.',
          'Passenger elevator access across all floors for elderly family members.',
          '100% power backup so air conditioning, lighting, and Wi-Fi remain uninterrupted.',
          'Flexible multi-day stay support and direct tariff rates with zero booking commission.',
        ],
      },
      {
        h2: 'Easy Road Connectivity & Everyday Convenience',
        h3: 'Quick Cab/Auto Access and Essential Amenities Nearby',
        paragraphs: [
          'From Sun Moon Suites in Sector 117, guests can easily book cabs, auto-rickshaws, or drive their own vehicles via well-maintained Central Noida sector roads. Free on-site parking is available right outside the property for families traveling by personal car from outstation cities in Uttar Pradesh, Delhi NCR, Haryana, or Uttarakhand.',
          'Note: Sun Moon Suites is an independent boutique hotel providing hospitality and lodging services only; we do not provide medical advice or clinical services.',
        ],
      },
    ],
    nearbyPlaces: [
      {
        name: 'Medanta Hospital Noida',
        distance: 'Central Noida corridor',
        travelTime: '5–10 mins drive',
        purpose: 'Quick commute for patient attendants, family members, and visiting doctors.',
      },
      {
        name: 'Sector 76 Metro Station (Aqua Line)',
        distance: 'Approx. 2.2 km',
        travelTime: '5 mins drive',
        purpose: 'Convenient metro transit for outstation relatives arriving in Noida.',
      },
      {
        name: 'Spectrum Metro Mall & Pharmacies (Sector 75)',
        distance: 'Approx. 2.5 km',
        travelTime: '5–6 mins drive',
        purpose: 'Easy access to dining, daily essentials, ATMs, and retail stores.',
      },
    ],
    faqs: [
      {
        question: 'Is there a lift (elevator) at Sun Moon Suites for elderly family members?',
        answer:
          'Yes, our 3-floor hotel building has a modern passenger elevator providing step-free access to all guest room floors.',
      },
      {
        question: 'Can patient attendants check in late at night or extend their stay?',
        answer:
          'Yes, our reception desk operates 24x7. Subject to room availability, our team is happy to assist families who need to extend their stay depending on hospital schedules.',
      },
      {
        question: 'Is parking available for families driving from outside Noida?',
        answer:
          'Yes, we offer free on-site parking with 24x7 CCTV surveillance at GT-20, Sector 117, Noida.',
      },
    ],
  },

  '/hotel-near-tivoli-lotus-court-noida': {
    path: '/hotel-near-tivoli-lotus-court-noida',
    title: 'Hotel Near Tivoli Lotus Court Noida | Wedding Guest Rooms',
    description:
      'Book wedding guest accommodation and group hotel rooms near Tivoli Lotus Court Noida at Sun Moon Suites, Sector 117. 30 AC rooms across 3 floors with parking.',
    canonical: `${BASE_SITE_URL}/hotel-near-tivoli-lotus-court-noida`,
    h1: 'Hotel Near Tivoli Lotus Court Noida – Wedding Guest & Group Accommodation',
    primaryKeyword: 'Hotel Near Tivoli Lotus Court Noida',
    secondaryKeywords: [
      'Hotels Near Tivoli Lotus Court',
      'Rooms Near Tivoli Lotus Court Noida',
      'Stay Near Tivoli Lotus Court Noida',
      'Wedding Guest Accommodation Noida',
      'Wedding Guest Rooms Noida',
      'Group Hotel Booking Noida',
      'Hotel for Wedding Guests Noida',
    ],
    badge: '2 Mins from Tivoli Lotus Court • 30 Rooms for Group Stays',
    intro:
      'Hosting a wedding, reception, ring ceremony, or family celebration in Central Noida? Situated at GT-20, Sector 117, Noida—just 2 minutes from Tivoli Lotus Court—Sun Moon Suites offers 30 air-conditioned rooms across three floors, making it an ideal venue for accommodating outstation wedding guests and family groups.',
    highlights: [
      '30 Rooms Across 3 Floors — Keep Your Entire Wedding Group Together',
      'Just 2–3 Minutes from Tivoli Lotus Court Banquet in Sector 117',
      'Dedicated Group Coordination, Lift Access & Free On-Site Parking',
    ],
    sections: [
      {
        h2: 'Seamless Wedding Guest Accommodation in Sector 117 Noida',
        h3: 'Keep Outstation Relatives & Friends Under One Roof',
        paragraphs: [
          'When families organize weddings or milestone celebrations at Tivoli Lotus Court or nearby banquet halls in Sector 117, Sector 116, and Sector 75, coordinating transport between distant hotels and the event venue can be stressful. Because Sun Moon Suites is located right in Sector 117, wedding guests can travel between their rooms and the banquet venue in just a couple of minutes.',
          'With 30 rooms spread across three elevator-connected floors—including Deluxe Rooms, Executive Suites, and multi-guest Family Rooms—hosts can comfortably allocate an entire floor or block of rooms for close relatives.',
        ],
        bullets: [
          'Well-lit rooms with full-length mirrors, wardrobe space, and spotless attached bathrooms for dressing up before events.',
          '100% power backup ensuring uninterrupted lighting, air conditioning, and hair/styling appliance usage.',
          '24x7 front desk reception to welcome guests returning from late-night wedding ceremonies.',
          'On-site ground-floor banquet/gathering space available for intimate pre-wedding functions or family meals.',
        ],
      },
      {
        h2: 'Group Hotel Booking Benefits at Sun Moon Suites',
        h3: 'Direct Block Tariffs & Dedicated Front Desk Support',
        paragraphs: [
          'Booking multiple rooms directly with our management team eliminates third-party OTA commissions and ensures smooth room allocation on arrival. Our front desk coordinates guest check-ins, luggage assistance, and parking for family cars and tourist vehicles.',
        ],
      },
    ],
    nearbyPlaces: [
      {
        name: 'Tivoli Lotus Court Banquet (Sector 117)',
        distance: 'Approx. 0.8 km',
        travelTime: '2–3 mins drive',
        purpose: 'Immediate proximity for wedding ceremonies, receptions, and family functions.',
      },
      {
        name: 'Sector 76 & Sector 51 Metro Stations',
        distance: '2.2 km – 3.5 km',
        travelTime: '5–8 mins drive',
        purpose: 'Easy arrival for wedding guests traveling from Delhi, Ghaziabad, and Greater Noida.',
      },
      {
        name: 'Spectrum Metro Mall (Sector 75)',
        distance: 'Approx. 2.5 km',
        travelTime: '5–6 mins drive',
        purpose: 'Last-minute wedding shopping, salons, gifting, and dining.',
      },
    ],
    faqs: [
      {
        question: 'How far is Sun Moon Suites from Tivoli Lotus Court in Noida?',
        answer:
          'Sun Moon Suites is located in the same sector (GT-20, Sector 117, Noida), just a 2 to 3 minute drive (approx. 800 meters) from Tivoli Lotus Court.',
      },
      {
        question: 'How many rooms can we book for a wedding group?',
        answer:
          'Our property has 30 air-conditioned rooms across 3 floors. You can book individual rooms, an entire floor, or full-property room blocks subject to date availability.',
      },
      {
        question: 'Can wedding guests check in or return late at night after the reception?',
        answer:
          'Yes, our reception desk and security operate 24x7 so guests attending late-night wedding functions can enter and rest comfortably at any hour.',
      },
    ],
  },

  '/hotel-near-sector-76-metro-noida': {
    path: '/hotel-near-sector-76-metro-noida',
    title: 'Hotel Near Sector 76 Metro Station & Spectrum Mall Noida',
    description:
      'Stay near Sector 76 Aqua Line Metro Station and Spectrum Metro Mall at Sun Moon Suites, Sector 117 Noida. Comfortable AC rooms with free Wi-Fi & parking.',
    canonical: `${BASE_SITE_URL}/hotel-near-sector-76-metro-noida`,
    h1: 'Hotel Near Sector 76 Metro Station & Spectrum Metro Mall Noida',
    primaryKeyword: 'Hotel Near Sector 76 Metro Station',
    secondaryKeywords: [
      'Hotel Near Sector 76 Metro Station Noida',
      'Hotels Near Sector 76 Metro Station',
      'Hotel Near Noida Sector 76 Metro',
      'Rooms Near Sector 76 Metro Station',
      'Hotel Near Spectrum Metro Mall Noida',
      'Hotels Near Spectrum Metro Mall',
      'Rooms Near Spectrum Metro Mall Noida',
    ],
    badge: '5 Mins from Sector 76 Metro & Spectrum Mall • Sector 117 Noida',
    intro:
      'For business travelers, corporate executives, and transit visitors arriving in Central Noida, staying close to the metro corridor saves valuable commute time. Located at GT-20, Sector 117, Noida, Sun Moon Suites is just a 5-minute drive from Sector 76 Metro Station (Aqua Line) and Spectrum Metro Mall in Sector 75.',
    highlights: [
      '5 Minutes from Sector 76 Aqua Line & 7 Minutes from Sector 51 Blue Line Metro',
      'High-Speed Free Fiber Wi-Fi & Dedicated In-Room Work Desks',
      'Quick Access to Spectrum Metro Mall, Corporate Hubs & Noida Expressway',
    ],
    sections: [
      {
        h2: 'Effortless Metro & Road Connectivity in Central Noida',
        h3: 'Close to Sector 76 Aqua Line, Sector 51 Blue Line & Spectrum Metro Mall',
        paragraphs: [
          'Travelers searching for a hotel near Sector 76 Metro Station Noida benefit from dual-line metro accessibility. Sector 76 Station connects directly along the Aqua Line toward Noida Sector 142, Knowledge Park, and Pari Chowk Expo Mart, while nearby Sector 51 Station provides seamless interchange to the Delhi Metro Blue Line toward Sector 62, Sector 18, and central New Delhi.',
          'Just 5 minutes away in Sector 75, Spectrum Metro Mall offers a major commercial, retail, and dining destination. Guests visiting offices or retail outlets at Spectrum Metro Mall can return to peaceful, sound-insulated boutique rooms at Sun Moon Suites in Sector 117.',
        ],
        bullets: [
          'Complimentary high-speed Wi-Fi and ergonomic work desks for remote work and video calls.',
          'Express check-in at 14:00, GST-compliant billing for corporate reimbursement, and 24x7 room service.',
          'Free on-site vehicle parking and easy cab availability at all hours.',
        ],
      },
    ],
    nearbyPlaces: [
      {
        name: 'Sector 76 Metro Station (Aqua Line)',
        distance: 'Approx. 2.2 km',
        travelTime: '5 mins drive',
        purpose: 'Direct Aqua Line metro access toward Greater Noida and Expo Mart.',
      },
      {
        name: 'Spectrum Metro Mall (Sector 75 Noida)',
        distance: 'Approx. 2.5 km',
        travelTime: '5–6 mins drive',
        purpose: 'Commercial offices, restaurants, shopping, and multiplex.',
      },
      {
        name: 'Sector 51 / Sector 52 Metro Interchange',
        distance: 'Approx. 3.5 km',
        travelTime: '7–8 mins drive',
        purpose: 'Blue Line metro connection to Delhi NCR and Noida Electronic City.',
      },
    ],
    faqs: [
      {
        question: 'How far is Sun Moon Suites from Sector 76 Metro Station in Noida?',
        answer:
          'Sun Moon Suites at GT-20, Sector 117, Noida is approximately 2.2 km (about a 5-minute drive or e-rickshaw ride) from Sector 76 Metro Station.',
      },
      {
        question: 'Do you provide GST invoices for corporate and business travelers?',
        answer:
          'Yes, Sun Moon Suites provides official GST-compliant tax invoices for corporate bookings and business travel reimbursements.',
      },
    ],
  },
};

export function applyRouteSeoToDocument(pathname: string): void {
  if (typeof document === 'undefined') return;
  const normalized = pathname === '/' ? '/' : pathname.replace(/\/+$/, '').toLowerCase();

  // Dynamic article pages (/insights/:slug) manage their own title, description, and canonical tag
  if (normalized.startsWith('/insights/') && normalized !== '/insights') {
    return;
  }

  const landing = DEDICATED_LANDING_PAGES[normalized];
  const meta = landing
    ? {
        title: landing.title,
        description: landing.description,
        canonical: landing.canonical,
      }
    : ROUTE_SEO_META[normalized] || ROUTE_SEO_META['/'];

  document.title = meta.title;

  const setMetaContent = (selector: string, content: string) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute('content', content);
  };

  setMetaContent('meta[name="description"]', meta.description);
  setMetaContent('meta[property="og:title"]', meta.title);
  setMetaContent('meta[property="og:description"]', meta.description);
  setMetaContent('meta[property="og:url"]', meta.canonical);
  setMetaContent('meta[name="twitter:title"]', meta.title);
  setMetaContent('meta[name="twitter:description"]', meta.description);

  const canonicalEl = document.querySelector('link[rel="canonical"]');
  if (canonicalEl) {
    canonicalEl.setAttribute('href', meta.canonical);
  }
}
