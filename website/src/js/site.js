/* The only script the page ships.

   It marks the nav link whose section is currently on screen. Everything the
   page says and every way to act on it works with this file blocked. */

const nav = document.querySelector(".site-header nav");
if (nav) {
  const links = new Map();
  for (const link of nav.querySelectorAll("a[href^='#']")) {
    const section = document.querySelector(link.getAttribute("href"));
    if (section) links.set(section, link);
  }

  const mark = (active) => {
    for (const [section, link] of links) {
      if (section === active) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) mark(visible.target);
    },
    /* The band sits below the header so a section counts as current once it
       actually occupies the reading area, not the moment its top edge appears. */
    { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5] }
  );

  for (const section of links.keys()) observer.observe(section);
}
