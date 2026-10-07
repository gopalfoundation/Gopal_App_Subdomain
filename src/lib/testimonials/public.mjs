import { testimonialMarkup } from './model.mjs';
export async function mountPublicTestimonials(root,initiative,programs = [],program = '') {
  if (!root) return;
  try {
    const r = await fetch('/api/testimonials/public?initiative='+initiative+'&program='+encodeURIComponent(program),{cache:'no-store'});
    if (!r.ok) return;
    root.innerHTML = testimonialMarkup(await r.json(),programs);
    bindTestimonialVideos(root);
  } catch { /* Keep unavailable or empty testimonials hidden. */ }
}
export function bindTestimonialVideos(root) {
  root?.addEventListener('click',event=>{
    const b = event.target.closest('[data-testimonial-video]'); if (!b) return;
    // One player across testimonial and main video sections, activated only by a click.
    document.querySelectorAll('iframe[src*="youtube-nocookie.com"]').forEach(frame=>frame.remove());
    const frame = document.createElement('iframe'); frame.src='https://www.youtube-nocookie.com/embed/'+b.dataset.testimonialVideo+'?autoplay=1&playsinline=1'; frame.title=b.getAttribute('aria-label'); frame.allow='autoplay; encrypted-media; picture-in-picture'; frame.allowFullscreen=true; frame.referrerPolicy='strict-origin-when-cross-origin'; b.after(frame);
  });
}
