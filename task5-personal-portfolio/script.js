/* ──────────────────────────────────────────────────────────
   Portfolio — script.js
   Single feature: a typewriter effect for the hero name,
   kept deliberately minimal per the design's "quiet motion" rule.
   ────────────────────────────────────────────────────────── */

const NAME = "Vishnu Teja";
const typedEl = document.getElementById('typedName');

function typeName(text, el, speed = 90) {
  let i = 0;
  el.textContent = '';

  function step() {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
      setTimeout(step, speed);
    }
  }

  step();
}

document.addEventListener('DOMContentLoaded', () => {
  if (typedEl) {
    typeName(NAME, typedEl);
  }
});
