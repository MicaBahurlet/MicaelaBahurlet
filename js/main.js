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

    window.gsap.set(heroName, { opacity: 0, y: 30 });
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

    tl.to(heroName, {
        opacity: 1,
        y: 0,
        duration: .8,
        ease: "power3.out",
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
                duration: 0.6,
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

document.addEventListener("DOMContentLoaded", () => {
    initHeroGsapAnimations();
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






