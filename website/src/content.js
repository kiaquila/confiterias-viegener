/* Every string on the page lives here and nowhere else.

   Confiterías Viegener is a real business, but none of the wording, contact
   details or opening hours below has been confirmed by the owner. They were
   carried over from the concept prototype and are draft assumptions until the
   client approves them — see `../../README.md`. `unverified` marks the blocks
   whose factual content still needs that confirmation, and the build prints
   them so an unapproved claim cannot quietly reach a customer-facing stage. */

export const business = {
  name: "Confiterías Viegener",
  shortName: "Viegener",
  founded: 1949,
  /* Rendered as "75+" on the seal. Derived from `founded` so it cannot go
     stale, then floored to the decade the concept shows. */
  get yearsOfTradition() {
    return Math.floor((new Date().getFullYear() - this.founded) / 5) * 5;
  }
};

/* Where the built page believes it lives. It is a preview origin: this concept
   has no customer-facing home, and must not be given one before the client
   approves it. */
export const origin = "https://confiterias-viegener.ks-design.workers.dev";

export const links = {
  email: "confiteriasviegener@gmail.com",
  instagram: "https://www.instagram.com/confiteriasviegener/",
  instagramHandle: "@confiteriasviegener",
  /* Third-party coverage the concept cites as the history source. */
  lanacion:
    "https://www.lanacion.com.ar/lifestyle/hace-75-anos-llego-de-alemania-con-el-oficio-de-pastelero-y-abrio-una-confiteria-que-supero-nid26052025/"
};

/* Maps links are built from the address rather than stored as opaque URLs, so
   a corrected address cannot leave a stale pin behind. */
export const mapsSearch = (query) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export const locations = [
  {
    id: "vicente-lopez",
    kicker: "Casa central & fábrica",
    name: "Vicente López",
    street: "Av. Maipú 1480",
    city: "Buenos Aires",
    hours: ["Lun–Vie 7:30–20:00", "Sáb, Dom y feriados 8:00–20:00"],
    phoneLabel: "011 4791-2666",
    phoneHref: "tel:+541147912666",
    unverified: true
  },
  {
    id: "palermo",
    kicker: "Sucursal CABA",
    name: "Palermo",
    street: "Av. Coronel Díaz 1855",
    city: "Ciudad de Buenos Aires",
    hours: ["Lun–Vie 7:30–20:00", "Sáb, Dom y feriados 8:00–20:00"],
    phoneLabel: "011 4824-4910",
    phoneHref: "tel:+541148244910",
    unverified: true
  }
];

export const content = {
  meta: {
    lang: "es-AR",
    title:
      "Confiterías Viegener | Pastelería artesanal desde 1949",
    description:
      "Pastelería europea, panadería y bombonería artesanal en Vicente López y Palermo. Elaboración propia desde 1949.",
    ogAlt: "Confiterías Viegener — pastelería artesanal desde 1949"
  },

  topNote: {
    text: "Elaboración artesanal todos los días",
    linkLabel: "Vicente López & Palermo"
  },

  nav: [
    { href: "#especialidades", label: "Especialidades" },
    { href: "#catering", label: "Catering" },
    { href: "#historia", label: "Nuestra historia" },
    { href: "#locales", label: "Locales" }
  ],

  cta: {
    header: "Hacé tu pedido",
    hero: "Hacer un pedido",
    heroSecondary: "Ver especialidades",
    signatures: "Quiero hacer un pedido",
    catering: "Pedir presupuesto",
    categories: "Consultar opciones",
    menuLine: "Consultar variedad",
    mobile: "Hacé tu pedido"
  },

  hero: {
    eyebrow: "Tradición europea · Desde 1949",
    heading: "El sabor de las cosas bien hechas.",
    copy:
      "Pastelería europea, panadería y bombonería artesanal para tus días, tus regalos y tus celebraciones.",
    image: "hero-catering",
    imageAlt: "Panadero de Viegener amasando a mano",
    proofLabel: "Características de Viegener",
    proof: [
      { value: "1949", label: "El comienzo de una tradición" },
      { value: "Artesanal", label: "Recetas y oficio de maestros" },
      { value: "2 locales", label: "Vicente López y Palermo" }
    ]
  },

  categories: {
    eyebrow: "Elegí tu momento Viegener",
    heading: "Un clásico para cada ocasión",
    lead:
      "Del desayuno de todos los días a una mesa de celebración: elaboramos cada pedido con materias primas de primera y atención a cada detalle.",
    unverified: true,
    items: [
      {
        title: "Pastelería",
        copy:
          "Tortas, tartas, masas finas, semifríos y el inconfundible Apfelstrudel.",
        image: "product-spread",
        alt: "Selección de tortas artesanales de Viegener"
      },
      {
        title: "Bombonería",
        copy:
          "Bombones, florentinos, mazapán y pequeños regalos hechos a mano.",
        image: "heritage-photo",
        alt: "Cajas de bombones artesanales de Viegener"
      },
      {
        title: "Panadería",
        copy:
          "Panes de campo, masa madre, cereales, focaccias y especialidades europeas.",
        image: "bakers-hands",
        alt: "Maestro panadero trabajando una masa artesanal"
      },
      {
        title: "Desayunos & regalos",
        copy: "Presentaciones para una o dos personas y opciones empresariales.",
        image: "pastry-cake",
        alt: "Tarteletas de frutas elaboradas por Viegener"
      }
    ],
    alsoLabel: "También hacemos",
    also:
      "Facturas · Especialidades judías · Pan dulce · Festividades · Tortas personalizadas"
  },

  signatures: {
    eyebrow: "Los favoritos de siempre",
    heading: "Recetas que vuelven a la mesa",
    lead:
      "Especialidades que conservan su carácter europeo y se siguen elaborando con el mismo cuidado de generación en generación.",
    image: "signature-cake",
    imageAlt: "Torta artesanal decorada con frutillas",
    imageNote: "Elaborado en nuestra casa",
    unverified: true,
    items: [
      {
        title: "Torta Viegener",
        copy: "Mousse de chocolate, merengue y castañas en almíbar."
      },
      {
        title: "Stollen alemán",
        copy: "Pasta de almendras, nueces, pasas y cáscara de naranja."
      },
      {
        title: "Sándwiches de miga",
        copy: "Preparados frescos cada día con pan inglés artesanal."
      }
    ]
  },

  catering: {
    eyebrow: "Lunch & catering",
    heading: "Tu evento, servido con oficio.",
    copy:
      "Propuestas dulces y saladas para reuniones de trabajo, celebraciones familiares y eventos empresariales. Te ayudamos a armar la selección según la ocasión y la cantidad de invitados.",
    unverified: true,
    items: [
      "Bocaditos fríos y calientes",
      "Sándwiches de miga y empanadas",
      "Tablas, ensaladas y mesas dulces",
      "Opciones para empresas"
    ]
  },

  heritage: {
    eyebrow: "Una historia de oficio",
    heading: "De Alemania a Buenos Aires, una tradición que sigue viva.",
    unverified: true,
    paragraphs: [
      "En 1949, Otto Viegener abrió su pastelería alemana y bombonería con recetas, moldes y saberes traídos de su tierra. Hoy, nuestros maestros siguen elaborando cada especialidad de forma artesanal en la casa de Vicente López y en nuestra sucursal de Palermo.",
      "Nuevas generaciones, el mismo compromiso: ingredientes naturales, producción cuidada y ese sabor que hace que nuestros clientes vuelvan."
    ],
    sourceLabel: "Conocé nuestra historia en LA NACION",
    mainImage: "artisan-baker",
    mainAlt: "Panadero de Viegener presentando panes recién elaborados",
    smallImage: "storefront",
    smallAlt: "Fachada de Confiterías Viegener en Vicente López",
    sealLabel: "años de tradición"
  },

  locations: {
    eyebrow: "Vení a visitarnos",
    heading: "Dos casas, el mismo sabor",
    directions: "Cómo llegar"
  },

  order: {
    eyebrow: "Pedidos & consultas",
    heading: "¿Qué ocasión estás imaginando?",
    copy:
      "Contanos qué necesitás y te ayudamos a elegir la mejor propuesta.",
    callPrefix: "Llamar a",
    email: "Escribir por email"
  },

  footer: {
    tagline: "Pastelería europea y elaboración artesanal desde 1949.",
    contactLabel: "Contacto",
    navLabel: "Navegación",
    nav: [
      { href: "#especialidades", label: "Especialidades" },
      { href: "#catering", label: "Lunch & catering" },
      { href: "#locales", label: "Locales" }
    ]
  }
};

/* Image slots the page renders, mapped to the files in assets/. Each entry
   lists the widths that ship, so the markup can build a `srcset` instead of
   sending a 2000px photo to a phone. */
export const images = {
  "hero-catering": { widths: [960, 1600, 2000], ratio: [3, 2] },
  "product-spread": { widths: [640, 960], ratio: [4, 5] },
  "heritage-photo": { widths: [640, 960], ratio: [4, 5] },
  "bakers-hands": { widths: [640, 960], ratio: [4, 5] },
  "pastry-cake": { widths: [640, 960], ratio: [4, 5] },
  "signature-cake": { widths: [960, 1440], ratio: [3, 2] },
  "artisan-baker": { widths: [640, 960], ratio: [5, 6] },
  storefront: { widths: [640, 960], ratio: [4, 3] }
};

/** Sections whose factual content the client has not confirmed. The build
 *  reports these; the list empties as the owner approves each block. */
export const unverifiedSections = Object.entries(content)
  .filter(([, block]) => block && typeof block === "object" && block.unverified)
  .map(([name]) => name)
  .concat(locations.filter((entry) => entry.unverified).map((entry) => `locations.${entry.id}`));
