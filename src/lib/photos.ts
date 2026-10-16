/**
 * Location photography (Unsplash License: free commercial use; no endorsement implied).
 * People pictured are not NANAM clients. Crops avoid third-party brand signage.
 */
export const photos = {
  hero: { src: "/images/hero-bulenga.jpg", alt: "Busy morning traffic in Bulenga, Wakiso", position: "50% 85%", credit: "Ssenyondo Gabriel" },
  logbook: { src: "/images/logbook-ntinda.jpg", alt: "Cars on the road in Ntinda, Kampala, at sunset", position: "50% 90%", credit: "Robin Kutesa" },
  business: { src: "/images/business-market.jpg", alt: "Traders at an outdoor market in Entebbe", position: "50% 60%", credit: "Wietse Jongsma" },
  land: { src: "/images/land-kampala.jpg", alt: "Kampala and its hills seen from above", position: "50% 55%", credit: "Keith Kasaija" },
  contract: { src: "/images/contract-mukono.jpg", alt: "A builder laying blocks on a site in Mukono", position: "50% 60%", credit: "Mugabi Owen" },
} as const;

export const photoCredits = Object.values(photos).map((p) => p.credit);
