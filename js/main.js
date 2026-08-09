const nav = document.querySelector("#nav");
const abrir = document.querySelector("#abrir");
const cerrar = document.querySelector("#cerrar");

const GSAP_BASE = "https://cdn.jsdelivr.net/npm/gsap@3.14.1/dist";

if (abrir && nav) {
    abrir.addEventListener("click", () => nav.classList.add("visible"));
}

if (cerrar && nav) {
    cerrar.addEventListener("click", () => nav.classList.remove("visible"));
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function loadGsapBundle() {
    if (typeof window.gsap !== "undefined") return;

    // Load gsap core first (required), then load plugins in parallel
    await loadScript(`${GSAP_BASE}/gsap.min.js`);
    // Load plugins in parallel — much faster on slow mobile connections
    await Promise.all([
        loadScript(`${GSAP_BASE}/ScrollTrigger.min.js`),
        loadScript(`${GSAP_BASE}/ScrollToPlugin.min.js`),
        loadScript(`${GSAP_BASE}/SplitText.min.js`),
    ]);
}

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
                window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
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

function initDarkMode() {
    const darkModeToggle = document.querySelector("#darkModeToggle");
    if (!darkModeToggle) return;

    const body = document.body;
    const darkModeIcon = darkModeToggle.querySelector("i");
    const currentMode = localStorage.getItem("darkMode");

    if (currentMode === "enabled") {
        body.classList.add("dark-mode");
        if (darkModeIcon) {
            darkModeIcon.classList.remove("bi-moon-fill");
            darkModeIcon.classList.add("bi-sun-fill");
        }
    }

    darkModeToggle.addEventListener("click", () => {
        body.classList.toggle("dark-mode");

        if (!darkModeIcon) return;

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
}

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
    // Animations will play even if prefers-reduced-motion is active

    highlights.forEach((highlight) => {
        gsap.set(highlight, { backgroundSize: "0% 100%" });
    });

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    if (visual) tl.from(visual, { opacity: 0, scale: 0.85, duration: 1, ease: "power2.out" }, 0);
    if (eyebrow) tl.from(eyebrow, { opacity: 0, y: 20, duration: 0.6 }, 0.1);
    if (nameLines.length) tl.from(nameLines, { opacity: 0, y: 60, duration: 0.8, stagger: 0.12, ease: "power4.out" }, 0.2);
    if (heroTitle) tl.from(heroTitle, { opacity: 0, y: 20, duration: 0.6 }, "-=0.4");
    if (highlights.length) tl.to(highlights, { backgroundSize: "100% 100%", duration: 0.5, stagger: 0.2, ease: "power3.inOut" }, "-=0.2");
    if (lines.length) tl.from(lines, { opacity: 0, y: 20, duration: 0.5, stagger: 0.15 }, "-=0.4");
    if (btns.length) tl.from(btns, { opacity: 0, y: 20, duration: 0.6, stagger: 0.12 }, "-=0.3");
    if (scrollHint) tl.from(scrollHint, { opacity: 0, duration: 0.6 }, "-=0.2");

    initHero3dObject();
}

function initHero3dObject() {
    const gsap = window.gsap;
    const obj = document.querySelector(".hero-object");
    const visual = document.querySelector(".hero-visual");
    if (!gsap || !obj) return;

    gsap.set(obj, {
        transformOrigin: "50% 50%",
        transformPerspective: 1200,
        transformStyle: "preserve-3d",
    });

    if (visual) gsap.set(visual, { transformPerspective: 1200 });

    const mm = gsap.matchMedia();

    // Mobile (touch/coarse): same multi-axis animation as desktop but with
    // smaller travel values and slower durations — fewer GPU compositing
    // operations per second without losing the 3D character.
    mm.add("(max-width: 767px)", () => {
        gsap.to(obj, { rotation: 360, duration: 55, ease: "none", repeat: -1 });
        gsap.to(obj, { y: -8,  duration: 5,   ease: "sine.inOut", repeat: -1, yoyo: true });
        gsap.to(obj, { z: 14, scale: 1.012, duration: 7,   ease: "sine.inOut", repeat: -1, yoyo: true });
        gsap.to(obj, { rotationY: 8, rotationX: -4, duration: 9, ease: "sine.inOut", repeat: -1, yoyo: true });
        gsap.to(obj, { x: 5,   duration: 8,   ease: "sine.inOut", repeat: -1, yoyo: true });
        return () => gsap.set(obj, { clearProps: "transform" });
    });

    // Desktop: full original values
    mm.add("(min-width: 768px)", () => {
        gsap.to(obj, { rotation: 360, duration: 40, ease: "none", repeat: -1 });
        gsap.to(obj, { y: -16, duration: 4,   ease: "sine.inOut", repeat: -1, yoyo: true });
        gsap.to(obj, { z: 32,  scale: 1.025, duration: 5.5, ease: "sine.inOut", repeat: -1, yoyo: true });
        gsap.to(obj, { rotationY: 14, rotationX: -8, duration: 7, ease: "sine.inOut", repeat: -1, yoyo: true });
        gsap.to(obj, { x: 10,  duration: 6,   ease: "sine.inOut", repeat: -1, yoyo: true });
        return () => gsap.set(obj, { clearProps: "transform" });
    });
}

function initFloatingNavScrollSpy() {
    const navEl = document.querySelector(".floating-nav");
    if (!navEl || typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;

    const gsap = window.gsap;
    gsap.registerPlugin(ScrollTrigger);

    const items = navEl.querySelectorAll(".floating-nav-list a");
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

function initFloatingNav() {
    const navEl = document.querySelector(".floating-nav");
    if (!navEl) return;

    initFloatingNavFooterAvoid(navEl);
}

function initFloatingNavFooterAvoid(navEl) {
    const footer = document.querySelector("footer");
    if (!footer) return;

    const minBottom = 26;
    const footerGap = 16;

    const updatePosition = () => {
        const footerTop = footer.getBoundingClientRect().top;
        const requiredBottom = window.innerHeight - footerTop + footerGap;
        navEl.style.bottom = `${Math.max(minBottom, requiredBottom)}px`;
    };

    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);
    updatePosition();
}

function initProfileIntroAnimations() {
    const section = document.querySelector("#profile-intro");
    if (!section || typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;

    const gsap = window.gsap;
    gsap.registerPlugin(ScrollTrigger);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const titleReveals = section.querySelectorAll(".profile-title-mask > *");
    const paragraph = section.querySelector(".profile-intro-text > p");
    const emphasisWords = [...section.querySelectorAll(".profile-text-em")];
    const underlineHighlights = [...section.querySelectorAll(".profile-text-em--underline")];

    underlineHighlights.forEach((span) => span.classList.add("profile-text-em--gsap"));

    if (reduceMotion) {
        gsap.set(titleReveals, { yPercent: 0, autoAlpha: 1 });
        if (paragraph) gsap.set(paragraph, { autoAlpha: 1, y: 0, filter: "none" });
        gsap.set(emphasisWords, { autoAlpha: 1, y: 0 });
        underlineHighlights.forEach((span) => gsap.set(span, { backgroundSize: "100% 0.88em" }));
        return;
    }

    let introTl = null;

    const resetIntro = () => {
        if (introTl) {
            introTl.kill();
            introTl = null;
        }

        gsap.set(titleReveals, { yPercent: 110, autoAlpha: 1 });
        if (paragraph) gsap.set(paragraph, { autoAlpha: 0, y: 22, filter: "blur(8px)" });
        gsap.set(emphasisWords, { autoAlpha: 0.25, y: 10 });
        underlineHighlights.forEach((span) => gsap.set(span, { backgroundSize: "0% 0.88em" }));
    };

    const playIntro = () => {
        if (introTl) introTl.kill();
        resetIntro();

        introTl = gsap.timeline({ defaults: { ease: "power3.out" } });

        introTl.to(titleReveals, {
            yPercent: 0,
            duration: 0.82,
            stagger: 0.14,
            ease: "power3.out",
        }, 0);

        if (paragraph) {
            introTl.to(paragraph, {
                autoAlpha: 1,
                y: 0,
                filter: "blur(0px)",
                duration: 0.75,
                ease: "power2.out",
            }, 0.3);
        }

        introTl.to(emphasisWords, {
            autoAlpha: 1,
            y: 0,
            duration: 0.48,
            stagger: 0.07,
            ease: "back.out(1.35)",
        }, 0.52);

        underlineHighlights.forEach((span, i) => {
            introTl.to(span, {
                backgroundSize: "100% 0.88em",
                duration: 0.46,
                ease: "power2.inOut",
            }, 0.78 + i * 0.11);
        });
    };

    resetIntro();

    ScrollTrigger.create({
        trigger: section,
        start: "top 82%",
        end: "bottom 18%",
        onEnter: playIntro,
        onEnterBack: playIntro,
        onLeave: resetIntro,
        onLeaveBack: resetIntro,
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

function initCarouselControls() {
    const carousel = document.getElementById("carouselExample");
    if (!carousel) return;

    const items = [...carousel.querySelectorAll(".carousel-item")];
    const prevBtn = carousel.querySelector(".carousel-control-prev");
    const nextBtn = carousel.querySelector(".carousel-control-next");

    if (items.length < 2) {
        if (prevBtn) prevBtn.style.display = "none";
        if (nextBtn) nextBtn.style.display = "none";
        return;
    }

    let currentIndex = items.findIndex((item) => item.classList.contains("active"));
    if (currentIndex < 0) currentIndex = 0;

    const showSlide = (index) => {
        items.forEach((item, i) => {
            item.classList.toggle("active", i === index);
        });

        if (prevBtn) prevBtn.style.display = index <= 0 ? "none" : "";
        if (nextBtn) nextBtn.style.display = index >= items.length - 1 ? "none" : "";
    };

    prevBtn?.addEventListener("click", () => {
        if (currentIndex > 0) {
            currentIndex -= 1;
            showSlide(currentIndex);
        }
    });

    nextBtn?.addEventListener("click", () => {
        if (currentIndex < items.length - 1) {
            currentIndex += 1;
            showSlide(currentIndex);
        }
    });

    showSlide(currentIndex);
}

function initCertificateModal() {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("imgModal");
    const closeBtn = document.querySelector(".close");
    if (!modal || !modalImg) return;

    const openModal = (src) => {
        modalImg.src = src;
        modal.classList.add("is-open");
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
    };

    const closeModal = () => {
        modal.classList.remove("is-open");
        modal.style.display = "none";
        modalImg.src = "";
        document.body.style.overflow = "";
    };

    document.querySelectorAll(".certificado-img").forEach((img) => {
        img.addEventListener("click", () => {
            openModal(img.currentSrc || img.src);
        });
    });

    if (closeBtn) {
        closeBtn.addEventListener("click", closeModal);
    }

    modal.addEventListener("click", (event) => {
        if (event.target === modal) closeModal();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.classList.contains("is-open")) {
            closeModal();
        }
    });
}

function initProjectsLoadMore() {
    const proyectos = document.querySelectorAll("#projects .LogosProyectos");
    const btnCargar = document.getElementById("btnCargarMasProyectos");
    if (!btnCargar || !proyectos.length) return;

    const actualizarProyectos = () => {
        if (window.innerWidth > 991) {
            let visibles = parseInt(btnCargar.getAttribute("data-visibles"), 10) || 3;
            proyectos.forEach((proy, idx) => {
                proy.style.display = idx < visibles ? "flex" : "none";
            });
            btnCargar.style.display = visibles < proyectos.length ? "inline-block" : "none";

            btnCargar.onclick = () => {
                visibles += 3;
                btnCargar.setAttribute("data-visibles", String(visibles));
                proyectos.forEach((proy, idx) => {
                    if (idx < visibles) proy.style.display = "flex";
                });
                if (visibles >= proyectos.length) btnCargar.style.display = "none";
            };
        } else {
            proyectos.forEach((proy) => {
                proy.style.display = "block";
            });
            btnCargar.style.display = "none";
        }
    };

    actualizarProyectos();
    window.addEventListener("resize", () => {
        btnCargar.setAttribute("data-visibles", "3");
        actualizarProyectos();
    });
}

function initAboutMeAnimations() {
    const aboutSection = document.querySelector(".aboutme-section");
    if (!aboutSection || typeof window.gsap === "undefined") return;

    const gsap = window.gsap;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const kicker = aboutSection.querySelector(".aboutme-kicker");
    const heading = aboutSection.querySelector(".aboutme-heading");
    const paragraphs = [...aboutSection.querySelectorAll(".aboutme-text p")];
    const underlines = aboutSection.querySelectorAll(".aboutme-em--underline");

    if (reduceMotion) {
        underlines.forEach((el) => el.classList.add("is-revealed"));
        return;
    }

    if (typeof window.ScrollTrigger !== "undefined") {
        gsap.registerPlugin(ScrollTrigger);
    }

    const applyHighlights = () => {
        underlines.forEach((span, i) => {
            gsap.delayedCall(0.08 + i * 0.09, () => span.classList.add("is-revealed"));
        });
    };

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: aboutSection,
            start: "top 72%",
            once: true,
        },
        defaults: { ease: "power3.out" },
    });

    if (kicker) {
        tl.from(kicker, { autoAlpha: 0, y: 10, duration: 0.45 }, 0);
    }

    if (heading) {
        tl.from(heading, { yPercent: 110, duration: 0.8, ease: "power3.out" }, 0.1);
    }

    paragraphs.forEach((p, i) => {
        tl.from(
            p,
            {
                autoAlpha: 0,
                y: 18,
                duration: 0.65,
                ease: "power2.out",
            },
            0.35 + i * 0.14
        );
    });

    tl.call(applyHighlights, null, 0.35 + paragraphs.length * 0.14 + 0.15);
}

function initSkillsAnimations() {
    const section = document.querySelector("#NewSkillsSection");
    if (!section || typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const gsap = window.gsap;
    gsap.registerPlugin(ScrollTrigger);

    const rows = section.querySelectorAll(".skill-row");
    const chips = section.querySelectorAll(".skill-item");

    gsap.from(rows, {
        scrollTrigger: {
            trigger: section,
            start: "top 78%",
            toggleActions: "play none none none",
        },
        y: 20,
        autoAlpha: 0,
        duration: 0.55,
        stagger: 0.1,
        ease: "power3.out",
    });

    gsap.from(chips, {
        scrollTrigger: {
            trigger: section,
            start: "top 72%",
            toggleActions: "play none none none",
        },
        y: 10,
        autoAlpha: 0,
        duration: 0.4,
        stagger: { amount: 0.45, from: "start" },
        ease: "power2.out",
        delay: 0.15,
    });
}

function initUnicornStudio() {
    const embed = document.querySelector("[data-us-project]");
    if (!embed) return;

    const boot = () => {
        if (window.UnicornStudio?.isInitialized) return;
        if (typeof UnicornStudio !== "undefined" && typeof UnicornStudio.init === "function") {
            UnicornStudio.init();
            window.UnicornStudio.isInitialized = true;
        }
    };

    if (window.UnicornStudio) {
        boot();
        return;
    }

    window.UnicornStudio = { isInitialized: false };
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js";
    script.async = true;
    script.onload = boot;
    (document.head || document.body).appendChild(script);
}

function initGsapFeatures() {
    initHeroGsapAnimations();
    initProfileIntroAnimations();
    initAboutMeAnimations();
    initSkillsAnimations();
    initFloatingNavScrollSpy();
}

function scheduleGsapInit() {
    const run = async () => {
        try {
            await loadGsapBundle();
            initGsapFeatures();
        } catch (error) {
            // GSAP failed to load — still init scroll spy with native fallback
            initFloatingNavScrollSpy();
        }
    };

    // Run immediately after DOM is ready — no artificial delay.
    // The 100ms setTimeout was causing visible animation lag on mobile.
    run();
}

document.addEventListener("DOMContentLoaded", () => {
    initUnicornStudio();
    initDarkMode();
    initSmoothScroll();
    initHeaderScroll();
    initCarouselControls();
    initCertificateModal();
    initProjectsLoadMore();
    initFloatingNav();
    scheduleGsapInit();
});
