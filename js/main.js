const nav = document.querySelector("#nav");
const abrir = document.querySelector("#abrir");
const cerrar = document.querySelector("#cerrar");


abrir.addEventListener("click", ()=>{
    nav.classList.add("visible");
})

cerrar.addEventListener("click", ()=>{
    nav.classList.remove("visible");
})

const enlaces = document.querySelectorAll(".nav-list a");

enlaces.forEach((enlace) => {
    enlace.addEventListener("click", () => {
        nav.classList.remove("visible");
    });
});

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

    const heroName = heroRoot.querySelector(".hero-name");
    const heroTitle = heroRoot.querySelector(".TextHero h2");
    const highlights = heroRoot.querySelectorAll(".highlight-text");
    const lines = heroRoot.querySelectorAll(".line-text");
    const btn1 = heroRoot.querySelector(".hero-btn-1");
    const btn2 = heroRoot.querySelector(".hero-btn-2");

    if (!heroName || !heroTitle) return;

    // Split hero name into characters for animation
    const nameText = heroName.textContent;
    heroName.innerHTML = nameText.split('').map(char => 
        `<span class="char" style="display:inline-block;opacity:0;">${char === ' ' ? '&nbsp;' : char}</span>`
    ).join('');
    
    const chars = heroName.querySelectorAll('.char');

    window.gsap.set(heroTitle, { opacity: 0 });

    if (highlights.length) {
        window.gsap.set(highlights, { backgroundSize: "0% 100%" });
    }

    if (lines.length) {
        window.gsap.set(lines, { opacity: 0, y: 20 });
    }

    if (btn1 || btn2) {
        window.gsap.set([btn1, btn2].filter(Boolean), { opacity: 0, y: 20 });
    }

    const tl = window.gsap.timeline({ defaults: { ease: "power3.out" } });


    tl.to(chars, {
        opacity: 1,
        y: 0,
        duration: 0.08,
        stagger: 0.05,
        ease: "power2.out",
    })
        .to(
            heroTitle,
            {
                opacity: 1,
                duration: 0.6,
            },
            "-=0.3"
        );

    if (highlights.length) {
        tl.to(
            highlights,
            {
                backgroundSize: "100% 100%",
                duration: 0.5,
                stagger: 0.2,
                ease: "power3.inOut",
            },
            "-=0.2"
        );
    }

    if (lines.length) {
        tl.to(
            lines,
            {
                opacity: 1,
                y: 0,
                duration: 0.5,
                stagger: 0.15,
                ease: "power3.out",
            },
            "-=0.4"
        );
    }

    if (btn1) {
        tl.to(
            btn1,
            {
                opacity: 1,
                y: 0,
                duration: 0.6,
                ease: "power3.out",
            },
            "-=0.3"
        );
    }

    if (btn2) {
        tl.to(
            btn2,
            {
                opacity: 1,
                y: 0,
                duration: 0.6,
                ease: "power3.out",
            },
            "-=0.4"
        );
    }
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

document.addEventListener("DOMContentLoaded", () => {
    initHeroGsapAnimations();
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






