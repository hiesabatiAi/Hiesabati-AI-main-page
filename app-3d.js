(() => {
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const el = document.getElementById('hero-3d');
    if (!el || prefersReduced) return;

    // Pause/enable only when in view (IntersectionObserver)
    let enabled = false;
    const io = new IntersectionObserver((entries) => {
        enabled = !!entries[0]?.isIntersecting;
        if (!enabled) {
            el.style.setProperty('--rx', '0deg');
            el.style.setProperty('--ry', '0deg');
        }
    }, { threshold: 0.2 });
    io.observe(el);

    let raf = 0;
    let targetRx = 0;
    let targetRy = 0;

    function apply() {
        raf = 0;
        el.style.setProperty('--rx', `${targetRx}deg`);
        el.style.setProperty('--ry', `${targetRy}deg`);
    }

    function onMove(e) {
        if (!enabled) return;
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width; // 0..1
        const y = (e.clientY - rect.top) / rect.height; // 0..1

        // Tilt range is intentionally small for luxury feel
        targetRy = (x - 0.5) * 14;
        targetRx = -(y - 0.5) * 10;

        if (!raf) raf = window.requestAnimationFrame(apply);
    }

    // Touch devices: keep static
    const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (isCoarse) return;

    window.addEventListener('mousemove', onMove, { passive: true });
})();

