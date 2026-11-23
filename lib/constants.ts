// Immutable store definitions taken directly from the verified catalog
export interface StoneDef {
  name: string;
  handle: string;
  color: string;
  mohs: [number, number];
  delta: number;
  opaque: boolean;
  blurb: string;
  care: string;
  words: string;
}

export const STONES: Record<string, StoneDef> = {
  garnet: {
    name: "Garnet",
    handle: "garnet",
    color: "#8E2A3B",
    mohs: [6.5, 7.5],
    delta: 0,
    opaque: false,
    blurb: "Deep wine red that glows warm in daylight.",
    care: "Hard enough for daily wear. Wipe with a soft cloth and mild soapy water.",
    words: "red wine burgundy",
  },
  turquoise: {
    name: "Turquoise",
    handle: "turquoise",
    color: "#2A9D9A",
    mohs: [5, 6],
    delta: 500,
    opaque: true,
    blurb: "Opaque blue-green. Every stone has its own veining.",
    care: "Softer and porous. Keep away from perfume, oils and soaps, and remove before washing hands.",
    words: "teal aqua blue",
  },
  emerald: {
    name: "Emerald",
    handle: "emerald",
    color: "#1F7A4D",
    mohs: [7.5, 8],
    delta: 1200,
    opaque: false,
    blurb: "Deep, lively green with a soft natural glow.",
    care: "Emeralds often have natural inclusions and can be brittle. Avoid hard knocks and ultrasonic cleaners.",
    words: "green",
  },
  sapphire: {
    name: "Blue sapphire",
    handle: "blue-sapphire",
    color: "#1F3A8A",
    mohs: [9, 9],
    delta: 0,
    opaque: false,
    blurb: "Deep, inky blue that glows when the light hits it.",
    care: "Very hard and durable. Clean with mild soapy water and a soft brush.",
    words: "blue navy",
  },
  pinksapphire: {
    name: "Pink sapphire",
    handle: "pink-sapphire",
    color: "#E86AA6",
    mohs: [9, 9],
    delta: 0,
    opaque: false,
    blurb: "Soft, bright pink with a clean sparkle.",
    care: "Very hard and durable. Clean with mild soapy water and a soft brush.",
    words: "pink rose",
  },
  whitetopaz: {
    name: "White topaz",
    handle: "white-topaz",
    color: "#C9D3E0",
    mohs: [8, 8],
    delta: 0,
    opaque: false,
    blurb: "Clear and bright, with a crisp, icy sparkle.",
    care: "Very durable. Avoid hard knocks, as topaz can split along one direction.",
    words: "clear white diamond colourless",
  },
  lapis: {
    name: "Lapis lazuli",
    handle: "lapis-lazuli",
    color: "#26407A",
    mohs: [5, 5.5],
    delta: 0,
    opaque: true,
    blurb: "Deep royal blue, flecked with natural golden pyrite.",
    care: "Fairly soft. Keep it away from chemicals and hard knocks, and wipe with a soft dry cloth.",
    words: "blue royal deep",
  },
  multicolour: {
    name: "Multi-colour",
    handle: "multi-colour",
    color: "#B04A7A",
    mohs: [5, 9],
    delta: 0,
    opaque: false,
    blurb: "A mix of coloured stones set together in one piece.",
    care: "Stones differ in hardness. Keep it away from chemicals and hard knocks, and clean with a soft cloth.",
    words: "rainbow colourful mixed",
  },
  navratna: {
    name: "Navratna",
    handle: "navratna",
    color: "#1F7A4D",
    mohs: [2.5, 9],
    delta: 0,
    opaque: false,
    blurb: "Nine colours of stone set together in one piece.",
    care: "Includes soft stones such as pearl. Put it on after perfume and keep it away from chemicals and knocks.",
    words: "nine gems colourful mixed",
  },
};

export const SIZE_MM: Record<string, number> = {
  "5": 15.7,
  "6": 16.5,
  "7": 17.3,
  "8": 18.1,
  "9": 18.9,
  "10": 19.8,
  "11": 20.6,
  "12": 21.4,
};

export const COUNTRIES = [
  { code: "PK", name: "Pakistan" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
];
