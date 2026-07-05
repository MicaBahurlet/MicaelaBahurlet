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

    await loadScript(`${GSAP_BASE}/gsap.min.js`);
    await loadScript(`${GSAP_BASE}/ScrollTrigger.min.js`);
    await loadScript(`${GSAP_BASE}/ScrollToPlugin.min.js`);
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
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) return;

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

    const bindMotion = (values) => {
        gsap.to(obj, { rotation: 360, duration: 40, ease: "none", repeat: -1 });
        gsap.to(obj, { y: values.y, duration: 4, ease: "sine.inOut", repeat: -1, yoyo: true });
        gsap.to(obj, { z: values.z, scale: values.scale, duration: 5.5, ease: "sine.inOut", repeat: -1, yoyo: true });
        gsap.to(obj, { rotationY: values.rotationY, rotationX: values.rotationX, duration: 7, ease: "sine.inOut", repeat: -1, yoyo: true });
        gsap.to(obj, { x: values.x, duration: 6, ease: "sine.inOut", repeat: -1, yoyo: true });
    };

    mm.add("(max-width: 767px)", () => {
        bindMotion({ y: -10, z: 18, scale: 1.015, rotationY: 10, rotationX: -6, x: 6 });
        return () => gsap.set(obj, { clearProps: "transform" });
    });

    mm.add("(min-width: 768px)", () => {
        bindMotion({ y: -16, z: 32, scale: 1.025, rotationY: 14, rotationX: -8, x: 10 });
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
    const accentWord = section.querySelector(".profile-title-word--accent");
    const connector = section.querySelector(".profile-title-connector");
    const snapInner = section.querySelector(".profile-title-snap-inner");
    const paragraph = section.querySelector(".profile-intro-text > p");
    const emWords = section.querySelectorAll(".profile-text-em:not(.profile-text-em--underline)");
    const underlineHighlights = section.querySelectorAll(".profile-text-em--underline");
    const portrait = section.querySelector(".ImgHero");

    if (reduceMotion) {
        underlineHighlights.forEach((span) => span.classList.add("is-revealed"));
        return;
    }

    const resetHighlights = () => {
        underlineHighlights.forEach((span) => span.classList.remove("is-revealed"));
    };

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: section,
            start: "top 80%",
            end: "bottom 75%",
            toggleActions: "play reverse play reverse",
            onLeave: resetHighlights,
            onLeaveBack: resetHighlights,
        },
        defaults: { ease: "power3.out" },
    });

    if (portrait) tl.from(portrait, { opacity: 0, y: 24, duration: 0.75 }, 0);
    if (accentWord) tl.from(accentWord, { opacity: 0, y: 28, scale: 0.94, duration: 0.75 }, 0.08);
    if (connector) tl.from(connector, { opacity: 0, duration: 0.35 }, 0.35);
    if (snapInner) tl.from(snapInner, { yPercent: -115, duration: 0.9, ease: "back.out(1.85)" }, 0.42);
    if (paragraph) tl.from(paragraph, { opacity: 0, y: 18, duration: 0.7, ease: "power2.out" }, 0.55);

    if (emWords.length) {
        tl.from(emWords, { opacity: 0.35, duration: 0.55, stagger: 0.08, ease: "power2.out" }, 0.78);
    }

    if (underlineHighlights.length) {
        tl.to(underlineHighlights, {
            duration: 0.55,
            stagger: {
                each: 0.14,
                onStart() {
                    this.targets()[0].classList.add("is-revealed");
                },
            },
            ease: "power2.out",
        }, 0.85);
    }
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

function initGsapFeatures() {
    initHeroGsapAnimations();
    initProfileIntroAnimations();
    initFloatingNavScrollSpy();
}

function scheduleGsapInit() {
    const run = async () => {
        try {
            await loadGsapBundle();
            initGsapFeatures();
        } catch (error) {
            initFloatingNavScrollSpy();
        }
    };

    if ("requestIdleCallback" in window) {
        requestIdleCallback(run, { timeout: 2000 });
    } else {
        window.addEventListener("load", () => setTimeout(run, 150), { once: true });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initDarkMode();
    initSmoothScroll();
    initHeaderScroll();
    initCarouselControls();
    initCertificateModal();
    initProjectsLoadMore();
    initFloatingNav();
    scheduleGsapInit();
});
