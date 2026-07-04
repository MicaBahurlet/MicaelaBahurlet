const nav = document.querySelector("#nav");
const abrir = document.querySelector("#abrir");
const cerrar = document.querySelector("#cerrar");


abrir.addEventListener("click", ()=>{
    nav.classList.add("visible");
})

cerrar.addEventListener("click", ()=>{
    nav.classList.remove("visible");
})

// ====================================
// SMOOTH SCROLL (GSAP ScrollToPlugin)
// ====================================

function getScrollOffset() {
    const header = document.querySelector("header");
    return header ? header.offsetHeight + 16 : 90;
}

function smoothScrollToTarget(target, duration = 1.2) {
    if (!target) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const offset = getScrollOffset();
    const top = target.getBoundingClientRect().top + window.pageYOffset - offset;

    if (reduceMotion || typeof window.gsap === "undefined" || typeof window.ScrollToPlugin === "undefined") {
        window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
        return;
    }

    window.gsap.registerPlugin(window.ScrollToPlugin);
    window.gsap.to(window, {
        duration,
        scrollTo: { y: target, offsetY: offset },
        ease: "power3.inOut",
    });
}

function initSmoothScroll() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');

    anchorLinks.forEach((link) => {
        link.addEventListener("click", (e) => {
            const href = link.getAttribute("href");
            if (!href) return;

            e.preventDefault();

            const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

            if (href === "#") {
                if (reduceMotion || typeof window.gsap === "undefined" || typeof window.ScrollToPlugin === "undefined") {
                    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
                } else {
                    window.gsap.registerPlugin(window.ScrollToPlugin);
                    window.gsap.to(window, {
                        duration: 1.2,
                        scrollTo: { y: 0 },
                        ease: "power3.inOut",
                    });
                }
                return;
            }

            const target = document.querySelector(href);
            if (!target) return;

            smoothScrollToTarget(target);

            if (link.closest(".nav-list") && nav) {
                nav.classList.remove("visible");
            }
        });
    });
}

// ====================================
// DARK MODE FUNCTIONALITY
// ====================================

const darkModeToggle = document.querySelector("#darkModeToggle");
const body = document.body;
const darkModeIcon = darkModeToggle.querySelector("i");

// Check for saved dark mode preference or default to light mode
const currentMode = localStorage.getItem("darkMode");

// Apply saved preference on page load
if (currentMode === "enabled") {
    body.classList.add("dark-mode");
    darkModeIcon.classList.remove("bi-moon-fill");
    darkModeIcon.classList.add("bi-sun-fill");
}

// Toggle dark mode on button click
darkModeToggle.addEventListener("click", () => {
    body.classList.toggle("dark-mode");
    
    // Update icon
    if (body.classList.contains("dark-mode")) {
        darkModeIcon.classList.remove("bi-moon-fill");
        darkModeIcon.classList.add("bi-sun-fill");
        localStorage.setItem("darkMode", "enabled");
    } else {
        darkModeIcon.classList.remove("bi-sun-fill");
        darkModeIcon.classList.add("bi-moon-fill");
        localStorage.setItem("darkMode", "disabled");
    }
});


// ====================================
// GSAP Hero Animationss
// ====================================

function initHeroGsapAnimations() {
    if (typeof window.gsap === "undefined") return;

    const heroRoot = document.querySelector("#home");
    if (!heroRoot) return;

    const eyebrow = heroRoot.querySelector(".hero-eyebrow");
    const nameLines = heroRoot.querySelectorAll(".hero-name-line");
    const heroTitle = heroRoot.querySelector(".TextHero h2");
    const highlights = heroRoot.querySelectorAll(".highlight-text");
    const lines = heroRoot.querySelectorAll(".line-text");
    const btns = heroRoot.querySelectorAll(".BtnsHero button");
    const scrollHint = heroRoot.querySelector(".hero-scroll-hint");
    const visual = heroRoot.querySelector(".hero-visual");

    const gsap = window.gsap;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Estado inicial
    if (eyebrow) gsap.set(eyebrow, { opacity: 0, y: 20 });
    if (nameLines.length) gsap.set(nameLines, { opacity: 0, y: 60 });
    if (heroTitle) gsap.set(heroTitle, { opacity: 0, y: 20 });
    if (highlights.length) gsap.set(highlights, { backgroundSize: "0% 100%" });
    if (lines.length) gsap.set(lines, { opacity: 0, y: 20 });
    if (btns.length) gsap.set(btns, { opacity: 0, y: 20 });
    if (scrollHint) gsap.set(scrollHint, { opacity: 0 });
    if (visual) gsap.set(visual, { opacity: 0, scale: 0.85 });

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    if (visual) {
        tl.to(visual, { opacity: 1, scale: 1, duration: 1, ease: "power2.out" }, 0);
    }
    if (eyebrow) {
        tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.6 }, 0.1);
    }
    if (nameLines.length) {
        tl.to(nameLines, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: "power4.out" }, 0.2);
    }
    if (heroTitle) {
        tl.to(heroTitle, { opacity: 1, y: 0, duration: 0.6 }, "-=0.4");
    }
    if (highlights.length) {
        tl.to(highlights, { backgroundSize: "100% 100%", duration: 0.5, stagger: 0.2, ease: "power3.inOut" }, "-=0.2");
    }
    if (lines.length) {
        tl.to(lines, { opacity: 1, y: 0, duration: 0.5, stagger: 0.15 }, "-=0.4");
    }
    if (btns.length) {
        tl.to(btns, { opacity: 1, y: 0, duration: 0.6, stagger: 0.12 }, "-=0.3");
    }
    if (scrollHint) {
        tl.to(scrollHint, { opacity: 1, duration: 0.6 }, "-=0.2");
    }

    // Objeto 3D: movimiento continuo
    initHero3dObject(reduceMotion);
}

// ====================================
// OBJETO 3D — animación continua
// ====================================

function initHero3dObject(reduceMotion) {
    const gsap = window.gsap;
    const obj = document.querySelector(".hero-object");
    const visual = document.querySelector(".hero-visual");
    if (!gsap || !obj || reduceMotion) return;

    gsap.set(obj, {
        transformOrigin: "50% 50%",
        transformPerspective: 1200,
        transformStyle: "preserve-3d",
    });

    if (visual) {
        gsap.set(visual, { transformPerspective: 1200 });
    }

    const mm = gsap.matchMedia();

    const bindMotion = (values) => {
        gsap.to(obj, {
            rotation: 360,
            duration: 40,
            ease: "none",
            repeat: -1,
        });

        gsap.to(obj, {
            y: values.y,
            duration: 4,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
        });

        gsap.to(obj, {
            z: values.z,
            scale: values.scale,
            duration: 5.5,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
        });

        gsap.to(obj, {
            rotationY: values.rotationY,
            rotationX: values.rotationX,
            duration: 7,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
        });

        gsap.to(obj, {
            x: values.x,
            duration: 6,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
        });
    };

    mm.add("(max-width: 767px)", () => {
        bindMotion({
            y: -10,
            z: 18,
            scale: 1.015,
            rotationY: 10,
            rotationX: -6,
            x: 6,
        });

        return () => gsap.set(obj, { clearProps: "transform" });
    });

    mm.add("(min-width: 768px)", () => {
        bindMotion({
            y: -16,
            z: 32,
            scale: 1.025,
            rotationY: 14,
            rotationX: -8,
            x: 10,
        });

        return () => gsap.set(obj, { clearProps: "transform" });
    });
}

// ====================================
// NAV FLOTANTE — scroll suave + estado activo
// ====================================

function initFloatingNav() {
    const nav = document.querySelector(".floating-nav");
    if (!nav) return;

    if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    const items = nav.querySelectorAll(".floating-nav-list a");
    items.forEach((link) => {
        const id = link.getAttribute("href");
        const section = id && id.length > 1 ? document.querySelector(id) : null;
        if (!section) return;

        ScrollTrigger.create({
            trigger: section,
            start: "top center",
            end: "bottom center",
            onToggle: (self) => {
                if (self.isActive) {
                    items.forEach((l) => l.classList.remove("is-active"));
                    link.classList.add("is-active");
                }
            },
        });
    });
}

// ====================================
// PAPER PLANE SCROLL ANIMATION
// ====================================

function initPaperPlaneScrollAnimation() {
    const plane = document.querySelector(".paper-plane-scroll");
    if (!plane) {
        console.warn("Paper plane element not found");
        return;
    }

    // Verificar que GSAP y ScrollTrigger estén disponibles
    if (typeof gsap === "undefined") {
        console.warn("GSAP not loaded");
        return;
    }
    
    if (typeof ScrollTrigger === "undefined") {
        console.warn("ScrollTrigger not loaded");
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    // Solo desktop y sin prefers-reduced-motion
    mm.add("(min-width: 992px) and (prefers-reduced-motion: no-preference)", () => {
        
        // Posición inicial - sobre el hero
        gsap.set(plane, {
            opacity: 1,
            visibility: "visible",
            x: 0,
            y: 0,
            rotation: -10,
            scale: 1,
            transformOrigin: "50% 50%",
        });

        // Crear la timeline con ScrollTrigger y delay
        const flightPath = gsap.timeline({
            defaults: {
                ease: "none",
                duration: 1,
            },
            scrollTrigger: {
                trigger: document.body,
                start: "top top",
                end: "max",
                scrub: 1.2,
                invalidateOnRefresh: true,
            },
        });

        // Movimiento aerodinámico - la punta siempre va hacia adelante
        // Pequeñas rotaciones para simular vuelo natural
        flightPath
            // Delay inicial - el avión se queda quieto
            .to(plane, {
                x: 0,
                y: 0,
                rotation: -25,
                duration: 0.15,
            })
            // Primer movimiento - hacia la izquierda y arriba
            .to(plane, {
                x: () => -window.innerWidth * 0.35,
                y: () => -window.innerHeight * 0.55,
                rotation: -155,
                duration: 1,
            })
            // Curva hacia abajo - suave
            .to(plane, {
                x: () => -window.innerWidth * 0.55,
                y: () => window.innerHeight * 0.08,
                rotation: -205,
                duration: 1,
            })
            // Sube nuevamente
            .to(plane, {
                x: () => -window.innerWidth * 0.32,
                y: () => window.innerHeight * 0.28,
                rotation: -300,
                duration: 1,
            })
            // Movimiento amplio hacia la izquierda
            .to(plane, {
                x: () => -window.innerWidth * 0.35,
                y: () => -window.innerHeight * 0.35,
                rotation: -460,
                duration: 1,
            })
            // Último tramo - sale por arriba
            .to(plane, {
                x: () => -window.innerWidth * 0.55,
                y: () => -window.innerHeight * 0.15,
                rotation: -610,
                duration: 1,
            });

        // Cleanup function
        return () => {
            if (flightPath.scrollTrigger) {
                flightPath.scrollTrigger.kill();
            }
            flightPath.kill();
            gsap.set(plane, { clearProps: "all" });
        };
    });

    // Ocultar en mobile o con prefers-reduced-motion
    mm.add("(max-width: 991px), (prefers-reduced-motion: reduce)", () => {
        gsap.set(plane, { 
            opacity: 0,
            visibility: "hidden"
        });
    });
}

function initHeaderScroll() {
    const header = document.querySelector("header");
    const hero = document.querySelector("#home.hero-modern");
    if (!header || !hero) return;

    const update = () => {
        const pastHero = hero.getBoundingClientRect().bottom <= header.offsetHeight + 8;
        header.classList.toggle("header--solid", pastHero);
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
}

document.addEventListener("DOMContentLoaded", () => {
    initSmoothScroll();
    initHeroGsapAnimations();
    initFloatingNav();
    initHeaderScroll();
    initPaperPlaneScrollAnimation();
});



// ====================================
// CURSOR FUNCTIONALITY, deprecated
// ====================================

// const cursorDot = document.querySelector([".cursor-dot"]);
// const cursorOutline = document.querySelector([".cursor-outline"]);

// window.addEventListener("mousemove", function (e)  {

//     const posX = e.clientX;
//     const posY = e.clientY;

//     cursorDot.style.left = `${ posX }px`;
//     cursorDot.style.top = `${ posY }px`;

//     // cursorOutline.style.left = `${posX}px`;
//     // cursorOutline.style.top = `${posY}px`;

//     cursorOutline.animate({
        
//             left: `${posX}px`,
//             top: `${posY}px`
//         }, {
//             duration: 250,
//             fill: "forwards"
            
//         }

//     );

  
// });






