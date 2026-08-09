const GSAP_BASE = "https://cdn.jsdelivr.net/npm/gsap@3.14.1/dist";
const UNICORN_SDK_URL =
    "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js";
const DEVICON_CSS_URL =
    "https://cdn.jsdelivr.net/gh/devicons/devicon@2.17.0/devicon.min.css";

let nav = null;
let pageAbortController = null;
let heroAmbientMotionCleanup = null;
let unicornVisibilityCleanup = null;
let unicornSceneActive = false;
let unicornInitInFlight = false;
let unicornInitFailed = false;
let unicornInitDone = false;
let heroGsapReady = false;
let scrollGsapReady = false;
let scrollGsapLoading = false;
let languageSwitchInFlight = false;
let popstateBound = false;

function getPageSignal() {
    if (pageAbortController) pageAbortController.abort();
    pageAbortController = new AbortController();
    return pageAbortController.signal;
}

function refreshNavRef() {
    nav = document.querySelector("#nav");
    return nav;
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

async function loadGsapCore() {
    if (typeof window.gsap !== "undefined") return;
    await loadScript(`${GSAP_BASE}/gsap.min.js`);
}

async function loadGsapScrollPlugins() {
    await loadGsapCore();
    await Promise.all([
        loadScript(`${GSAP_BASE}/ScrollTrigger.min.js`),
        loadScript(`${GSAP_BASE}/ScrollToPlugin.min.js`),
    ]);
}

function isTouchMobileDevice() {
    return (
        window.matchMedia("(max-width: 767px)").matches ||
        window.matchMedia("(pointer: coarse)").matches
    );
}

function scheduleIdleTask(task, timeout = 1800) {
    // requestIdleCallback puede no dispararse a tiempo en móvil con WebGL activo.
    if ("requestIdleCallback" in window && !isTouchMobileDevice()) {
        requestIdleCallback(() => task(), { timeout });
        return;
    }

    setTimeout(task, Math.min(timeout, 500));
}

function refreshScrollTriggers() {
    if (typeof window.ScrollTrigger === "undefined") return;
    window.ScrollTrigger.refresh();
    window.requestAnimationFrame(() => {
        window.ScrollTrigger.update();
    });
}

function waitForPaint() {
    return new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
}

function killScrollTriggers() {
    if (typeof window.ScrollTrigger === "undefined") return;
    window.ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
}

function getScrollOffset() {
    const header = document.querySelector("header");
    return header ? header.offsetHeight + 16 : 90;
}

function smoothScrollToTarget(target, duration = 1.2) {
    if (!target) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const offset = getScrollOffset();

    if (reduceMotion || typeof window.gsap === "undefined" || typeof window.ScrollToPlugin === "undefined") {
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
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

function initMobileNav(signal) {
    refreshNavRef();
    const abrir = document.querySelector("#abrir");
    const cerrar = document.querySelector("#cerrar");
    const navEl = nav;

    if (abrir && navEl) {
        abrir.addEventListener("click", () => navEl.classList.add("visible"), { signal });
    }

    if (cerrar && navEl) {
        cerrar.addEventListener("click", () => navEl.classList.remove("visible"), { signal });
    }
}

function initSmoothScroll(signal) {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');

    anchorLinks.forEach((link) => {
        link.addEventListener(
            "click",
            (e) => {
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

                const navEl = refreshNavRef();
                if (link.closest(".nav-list") && navEl) {
                    navEl.classList.remove("visible");
                }
            },
            { signal }
        );
    });
}

function initDarkMode(signal) {
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

    darkModeToggle.addEventListener(
        "click",
        () => {
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
        },
        { signal }
    );
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

    mm.add("(max-width: 767px)", () => {
        gsap.to(obj, { rotation: 360, duration: 55, ease: "none", repeat: -1 });
        gsap.to(obj, { y: -8, duration: 5, ease: "sine.inOut", repeat: -1, yoyo: true });
        gsap.to(obj, { z: 14, scale: 1.012, duration: 7, ease: "sine.inOut", repeat: -1, yoyo: true });
        gsap.to(obj, { rotationY: 8, rotationX: -4, duration: 9, ease: "sine.inOut", repeat: -1, yoyo: true });
        gsap.to(obj, { x: 5, duration: 8, ease: "sine.inOut", repeat: -1, yoyo: true });
        return () => gsap.set(obj, { clearProps: "transform" });
    });

    mm.add("(min-width: 768px)", () => {
        gsap.to(obj, { rotation: 360, duration: 40, ease: "none", repeat: -1 });
        gsap.to(obj, { y: -16, duration: 4, ease: "sine.inOut", repeat: -1, yoyo: true });
        gsap.to(obj, { z: 32, scale: 1.025, duration: 5.5, ease: "sine.inOut", repeat: -1, yoyo: true });
        gsap.to(obj, { rotationY: 14, rotateX: -8, duration: 7, ease: "sine.inOut", repeat: -1, yoyo: true });
        gsap.to(obj, { x: 10, duration: 6, ease: "sine.inOut", repeat: -1, yoyo: true });
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

function initFloatingNav(signal) {
    const navEl = document.querySelector(".floating-nav");
    if (!navEl) return;

    const footer = document.querySelector("footer");
    const contact = document.querySelector("#contact");
    const isMobileNav = () => window.matchMedia("(max-width: 767px)").matches;

    const minBottom = () => (isMobileNav() ? 16 : 26);
    const contentGap = () => (isMobileNav() ? 20 : 16);

    const updatePosition = () => {
        let requiredBottom = minBottom();

        if (footer) {
            const footerTop = footer.getBoundingClientRect().top;
            if (footerTop < window.innerHeight) {
                requiredBottom = Math.max(requiredBottom, window.innerHeight - footerTop + contentGap());
            }
        }

        if (isMobileNav() && contact) {
            const contactRect = contact.getBoundingClientRect();
            const navHeight = navEl.offsetHeight || 52;
            const navZoneTop = window.innerHeight - minBottom() - navHeight - contentGap();
            const contactVisible = contactRect.top < window.innerHeight && contactRect.bottom > 0;

            if (contactVisible && contactRect.bottom > navZoneTop) {
                requiredBottom = Math.max(requiredBottom, minBottom() + (contactRect.bottom - navZoneTop));
            }
        }

        navEl.style.bottom = `${requiredBottom}px`;
    };

    window.addEventListener("scroll", updatePosition, { passive: true, signal });
    window.addEventListener("resize", updatePosition, { signal });
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
        gsap.set(paragraph, { autoAlpha: 1, y: 0, filter: "none" });
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
        if (paragraph) gsap.set(paragraph, { autoAlpha: 0, y: 14, filter: "blur(4px)" });
        gsap.set(emphasisWords, { autoAlpha: 0.35, y: 6 });
        underlineHighlights.forEach((span) => gsap.set(span, { backgroundSize: "0% 0.88em" }));
    };

    const playIntro = () => {
        if (introTl) introTl.kill();
        resetIntro();

        introTl = gsap.timeline({ defaults: { ease: "power3.out" } });

        introTl.to(
            titleReveals,
            {
                yPercent: 0,
                duration: 0.82,
                stagger: 0.14,
                ease: "power3.out",
            },
            0
        );

        if (paragraph) {
            introTl.to(
                paragraph,
                {
                    autoAlpha: 1,
                    y: 0,
                    filter: "blur(0px)",
                    duration: 0.75,
                    ease: "power2.out",
                },
                0.34
            );
        }

        introTl.to(
            emphasisWords,
            {
                autoAlpha: 1,
                y: 0,
                duration: 0.48,
                stagger: 0.07,
                ease: "back.out(1.35)",
            },
            0.52
        );

        underlineHighlights.forEach((span, i) => {
            introTl.to(
                span,
                {
                    backgroundSize: "100% 0.88em",
                    duration: 0.46,
                    ease: "power2.inOut",
                },
                0.78 + i * 0.11
            );
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

    const rect = section.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.82 && rect.bottom > 0) {
        playIntro();
    }
}

function initHeaderScroll(signal) {
    const header = document.querySelector("header");
    const hero = document.querySelector("#home.hero-modern");
    if (!header || !hero) return;

    const update = () => {
        const pastHero = hero.getBoundingClientRect().bottom <= header.offsetHeight + 8;
        header.classList.toggle("header--solid", pastHero);
    };

    window.addEventListener("scroll", update, { passive: true, signal });
    window.addEventListener("resize", update, { signal });
    update();
}

function initCarouselControls(signal) {
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

    prevBtn?.addEventListener(
        "click",
        () => {
            if (currentIndex > 0) {
                currentIndex -= 1;
                showSlide(currentIndex);
            }
        },
        { signal }
    );

    nextBtn?.addEventListener(
        "click",
        () => {
            if (currentIndex < items.length - 1) {
                currentIndex += 1;
                showSlide(currentIndex);
            }
        },
        { signal }
    );

    showSlide(currentIndex);
}

function initCertificateModal(signal) {
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
        img.addEventListener(
            "click",
            () => {
                openModal(img.currentSrc || img.src);
            },
            { signal }
        );
    });

    if (closeBtn) {
        closeBtn.addEventListener("click", closeModal, { signal });
    }

    modal.addEventListener(
        "click",
        (event) => {
            if (event.target === modal) closeModal();
        },
        { signal }
    );

    document.addEventListener(
        "keydown",
        (event) => {
            if (event.key === "Escape" && modal.classList.contains("is-open")) {
                closeModal();
            }
        },
        { signal }
    );
}

function initFormacionLoadMore(signal) {
    const cards = [...document.querySelectorAll("#FormacionAcademica .formacion-card")];
    const btn = document.getElementById("btnCargarMasFormacion");
    if (!btn || !cards.length) return;

    const isMobileFormacionView = () => window.matchMedia("(max-width: 767px)").matches;

    const updateFormacionCards = () => {
        const expanded = btn.getAttribute("data-expanded") === "true";

        if (!isMobileFormacionView()) {
            cards.forEach((card) => card.classList.remove("is-hidden-mobile"));
            btn.style.display = "none";
            return;
        }

        if (expanded) {
            cards.forEach((card) => card.classList.remove("is-hidden-mobile"));
            btn.style.display = "none";
            return;
        }

        cards.forEach((card, index) => {
            card.classList.toggle("is-hidden-mobile", index >= 3);
        });
        btn.style.display = cards.length > 3 ? "flex" : "none";
    };

    btn.addEventListener(
        "click",
        () => {
            btn.setAttribute("data-expanded", "true");
            updateFormacionCards();
        },
        { signal }
    );

    window.addEventListener(
        "resize",
        () => {
            if (!isMobileFormacionView()) {
                btn.setAttribute("data-expanded", "false");
            }
            updateFormacionCards();
        },
        { signal }
    );

    updateFormacionCards();
}

function initProjectsLoadMore(signal) {
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
    window.addEventListener(
        "resize",
        () => {
            btnCargar.setAttribute("data-visibles", "3");
            actualizarProyectos();
        },
        { signal }
    );
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

function isSkillsMobileView() {
    return window.matchMedia("(max-width: 768px)").matches;
}

function resetSkillsMarquees() {
    document.querySelectorAll(".skills-marquee").forEach((marquee) => {
        const track = marquee.querySelector(".skills-marquee-track");
        if (!track) return;

        const groups = [...track.querySelectorAll(".skills-marquee-group")];
        const firstGroup = groups[0];
        if (!firstGroup) return;

        if (!firstGroup.dataset.originalCount) {
            firstGroup.dataset.originalCount = String(firstGroup.children.length);
        }

        const originalCount = parseInt(firstGroup.dataset.originalCount, 10) || firstGroup.children.length;
        const originals = [...firstGroup.children].slice(0, originalCount).map((node) => node.cloneNode(true));

        firstGroup.replaceChildren(...originals.map((node) => node.cloneNode(true)));

        const secondGroup = groups[1];
        if (secondGroup) {
            secondGroup.replaceChildren(...originals.map((node) => node.cloneNode(true)));
        }

        groups.slice(2).forEach((group) => group.remove());
    });
}

function inflateSkillsMarquees() {
    if (isSkillsMobileView()) return;

    document.querySelectorAll(".skills-marquee").forEach((marquee) => {
        const track = marquee.querySelector(".skills-marquee-track");
        if (!track) return;

        const groups = [...track.querySelectorAll(".skills-marquee-group")];
        if (!groups.length) return;

        const firstGroup = groups[0];
        const secondGroup = groups[1];

        if (!firstGroup.dataset.originalCount) {
            firstGroup.dataset.originalCount = String(firstGroup.children.length);
        }

        const originalCount = parseInt(firstGroup.dataset.originalCount, 10) || firstGroup.children.length;
        const originals = [...firstGroup.children].slice(0, originalCount).map((node) => node.cloneNode(true));

        firstGroup.replaceChildren(...originals.map((node) => node.cloneNode(true)));

        const containerWidth = window.innerWidth;
        const minGroupWidth = Math.max(containerWidth, 320);

        let guard = 0;
        while (firstGroup.scrollWidth < minGroupWidth && guard < 48) {
            originals.forEach((node) => firstGroup.appendChild(node.cloneNode(true)));
            guard += 1;
        }

        if (secondGroup) {
            secondGroup.replaceChildren(...[...firstGroup.children].map((node) => node.cloneNode(true)));
        } else {
            const clone = firstGroup.cloneNode(true);
            clone.setAttribute("aria-hidden", "true");
            track.appendChild(clone);
        }

        [...track.querySelectorAll(".skills-marquee-group")].slice(2).forEach((group) => group.remove());
    });
}

function initSkillsAccordion(signal) {
    const items = [...document.querySelectorAll(".skills-accordion-item")];
    if (!items.length) return;

    const syncMarquees = () => {
        if (isSkillsMobileView()) {
            resetSkillsMarquees();
            return;
        }
        inflateSkillsMarquees();
        requestAnimationFrame(() => inflateSkillsMarquees());
    };

    syncMarquees();

    let resizeTimer = null;
    window.addEventListener(
        "resize",
        () => {
            if (resizeTimer) window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => {
                syncMarquees();
            }, 150);
        },
        { signal }
    );

    const mobileMq = window.matchMedia("(max-width: 768px)");
    mobileMq.addEventListener(
        "change",
        () => {
            closeAll();
            syncMarquees();
        },
        { signal }
    );

    const setItemState = (item, active) => {
        const trigger = item.querySelector(".skills-accordion-trigger");
        const panel = item.querySelector(".skills-accordion-panel");
        item.classList.toggle("is-active", active);
        if (trigger) trigger.setAttribute("aria-expanded", active ? "true" : "false");
        if (panel) panel.setAttribute("aria-hidden", active ? "false" : "true");
    };

    const closeAll = () => {
        items.forEach((item) => setItemState(item, false));
    };

    items.forEach((item) => {
        const trigger = item.querySelector(".skills-accordion-trigger");
        if (!trigger) return;

        trigger.addEventListener(
            "click",
            () => {
                if (!isSkillsMobileView()) return;
                const willOpen = !item.classList.contains("is-active");
                closeAll();
                if (willOpen) setItemState(item, true);
            },
            { signal }
        );

        item.addEventListener(
            "mouseenter",
            () => {
                if (isSkillsMobileView()) return;
                closeAll();
                setItemState(item, true);
            },
            { signal }
        );

        item.addEventListener(
            "mouseleave",
            () => {
                if (isSkillsMobileView()) return;
                setItemState(item, false);
            },
            { signal }
        );

        item.addEventListener(
            "focusin",
            () => {
                if (isSkillsMobileView()) return;
                closeAll();
                setItemState(item, true);
            },
            { signal }
        );

        item.addEventListener(
            "focusout",
            (event) => {
                if (isSkillsMobileView()) return;
                if (!item.contains(event.relatedTarget)) {
                    setItemState(item, false);
                }
            },
            { signal }
        );
    });

    document.addEventListener(
        "keydown",
        (event) => {
            if (event.key === "Escape") closeAll();
        },
        { signal }
    );
}

function initSkillsAnimations() {
    const section = document.querySelector("#NewSkillsSection");
    if (!section || typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const gsap = window.gsap;
    gsap.registerPlugin(ScrollTrigger);

    const items = section.querySelectorAll(".skills-accordion-item");

    gsap.from(items, {
        scrollTrigger: {
            trigger: section,
            start: "top 82%",
            once: true,
        },
        y: 28,
        autoAlpha: 0,
        duration: 0.65,
        stagger: 0.09,
        ease: "power3.out",
    });
}

function loadStylesheet(href, id) {
    if (id && document.getElementById(id)) {
        return Promise.resolve();
    }

    if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        if (id) link.id = id;
        link.media = "print";
        link.onload = () => {
            link.media = "all";
            resolve();
        };
        link.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`));
        document.head.appendChild(link);
    });
}

function scheduleDeviconLoad() {
    const triggers = [
        document.querySelector("#timeline"),
        document.querySelector("#NewSkillsSection"),
    ].filter(Boolean);

    const load = () => {
        loadStylesheet(DEVICON_CSS_URL, "devicon-css").catch(() => {});
    };

    if (!triggers.length || !("IntersectionObserver" in window)) {
        scheduleIdleTask(load, 2200);
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                load();
                observer.disconnect();
            }
        },
        { rootMargin: "320px 0px", threshold: 0.01 }
    );

    triggers.forEach((node) => observer.observe(node));
}

function loadUnicornSdk() {
    if (typeof UnicornStudio !== "undefined") {
        return Promise.resolve();
    }

    const existing = document.querySelector(`script[src="${UNICORN_SDK_URL}"]`);
    if (existing) {
        return new Promise((resolve, reject) => {
            if (typeof UnicornStudio !== "undefined") {
                resolve();
                return;
            }

            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener(
                "error",
                () => reject(new Error("Unicorn SDK failed to load")),
                { once: true }
            );
        });
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = UNICORN_SDK_URL;
        script.async = true;
        script.crossOrigin = "anonymous";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Unicorn SDK failed to load"));
        (document.head || document.body).appendChild(script);
    });
}

function setUnicornScenesPaused(paused) {
    if (typeof UnicornStudio === "undefined" || !Array.isArray(UnicornStudio.scenes)) return;

    UnicornStudio.scenes.forEach((scene) => {
        scene.paused = paused;
        if (paused) {
            scene.rendering = false;
        }
    });
}

function setupUnicornVisibilityPause() {
    if (unicornVisibilityCleanup) {
        unicornVisibilityCleanup();
    }

    const hero = document.querySelector("#home.hero-modern");
    if (!hero || !("IntersectionObserver" in window)) return;

    let heroVisible = true;

    const apply = () => {
        const shouldPause = !heroVisible || document.hidden;
        setUnicornScenesPaused(shouldPause);
    };

    const observer = new IntersectionObserver(
        ([entry]) => {
            heroVisible = Boolean(entry?.isIntersecting);
            apply();
        },
        { threshold: 0.12, rootMargin: "0px" }
    );

    const onVisibility = () => apply();

    observer.observe(hero);
    document.addEventListener("visibilitychange", onVisibility);
    apply();

    unicornVisibilityCleanup = () => {
        observer.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        unicornVisibilityCleanup = null;
    };
}

function dispatchHeroPointer(clientX, clientY) {
    window.dispatchEvent(
        new MouseEvent("mousemove", {
            clientX,
            clientY,
            bubbles: true,
            cancelable: true,
        })
    );
}

function startHeroAmbientMotion(hero, canvas) {
    if (heroAmbientMotionCleanup) {
        heroAmbientMotionCleanup();
    }

    let rafId = null;
    let t = 0;
    let touchActive = false;
    let paused = true;
    let lastFrame = 0;

    const tick = (now) => {
        if (!paused && !touchActive && now - lastFrame >= 32) {
            lastFrame = now;
            t += 0.007;
            const rect = canvas.getBoundingClientRect();
            const x = rect.left + rect.width * (0.5 + Math.sin(t) * 0.25);
            const y = rect.top + rect.height * (0.5 + Math.cos(t * 0.73) * 0.2);
            dispatchHeroPointer(x, y);
        }

        if (!paused || touchActive) {
            rafId = requestAnimationFrame(tick);
        } else {
            rafId = null;
        }
    };

    const resumeLoop = () => {
        if (rafId === null && (!paused || touchActive)) {
            rafId = requestAnimationFrame(tick);
        }
    };

    const onTouchStart = () => {
        touchActive = true;
        resumeLoop();
    };
    const onTouchEnd = () => {
        touchActive = false;
        if (paused) {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = null;
        }
    };
    const onTouchMove = (event) => {
        const touch = event.touches[0];
        if (!touch) return;
        dispatchHeroPointer(touch.clientX, touch.clientY);
    };
    const onVisibilityChange = () => {
        paused = !heroIsIntersecting() || document.hidden;
        if (paused && !touchActive) {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = null;
        } else {
            resumeLoop();
        }
    };

    let heroIsIntersecting = () => true;
    const observer = new IntersectionObserver(
        ([entry]) => {
            paused = !entry.isIntersecting || document.hidden;
            heroIsIntersecting = () => entry.isIntersecting;
            if (paused && !touchActive) {
                if (rafId) cancelAnimationFrame(rafId);
                rafId = null;
            } else {
                resumeLoop();
            }
        },
        { threshold: 0.08 }
    );

    hero.addEventListener("touchstart", onTouchStart, { passive: true });
    hero.addEventListener("touchend", onTouchEnd, { passive: true });
    hero.addEventListener("touchcancel", onTouchEnd, { passive: true });
    hero.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    observer.observe(hero);

    paused = false;
    rafId = requestAnimationFrame(tick);

    heroAmbientMotionCleanup = () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        observer.disconnect();
        hero.removeEventListener("touchstart", onTouchStart);
        hero.removeEventListener("touchend", onTouchEnd);
        hero.removeEventListener("touchcancel", onTouchEnd);
        hero.removeEventListener("touchmove", onTouchMove);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        heroAmbientMotionCleanup = null;
    };
}

function ensureHeroAmbientMotion(hero, embed) {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (hero && embed && (isMobile || isCoarsePointer) && !reduceMotion) {
        startHeroAmbientMotion(hero, embed);
    }
}

async function initUnicornStudio() {
    const embed = document.querySelector("[data-us-project]");
    const hero = document.querySelector("#home.hero-modern");

    if (!embed || unicornInitInFlight) return;

    if (embed.hasAttribute("data-us-initialized") || unicornSceneActive) {
        unicornSceneActive = true;
        unicornInitDone = true;
        ensureHeroAmbientMotion(hero, embed);
        setupUnicornVisibilityPause();
        return;
    }

    unicornInitInFlight = true;

    try {
        await loadUnicornSdk();
        // Yield so first paint / input get a turn before WebGL setup.
        await new Promise((resolve) => setTimeout(resolve, 0));

        if (typeof UnicornStudio?.init !== "function") {
            throw new Error("UnicornStudio.init is unavailable");
        }

        await UnicornStudio.init();
        embed.setAttribute("data-us-initialized", "true");
        unicornSceneActive = true;
        unicornInitFailed = false;
        ensureHeroAmbientMotion(hero, embed);
        setupUnicornVisibilityPause();
    } catch (error) {
        unicornSceneActive = false;
        unicornInitFailed = true;
    } finally {
        unicornInitInFlight = false;
        unicornInitDone = true;
    }
}

function scheduleUnicornInit() {
    // After first paint + short calm period so LCP/text aren't fighting WebGL boot.
    waitForPaint().then(() => {
        scheduleIdleTask(() => {
            initUnicornStudio();
        }, 900);
    });
}

async function runScrollGsapFeatures() {
    if (scrollGsapReady) {
        killScrollTriggers();
        initProfileIntroAnimations();
        initAboutMeAnimations();
        initSkillsAnimations();
        initFloatingNavScrollSpy();
        refreshScrollTriggers();
        return;
    }

    if (scrollGsapLoading) return;
    scrollGsapLoading = true;

    try {
        await loadGsapScrollPlugins();

        if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") {
            initFloatingNavScrollSpy();
            return;
        }

        initProfileIntroAnimations();
        initAboutMeAnimations();
        initSkillsAnimations();
        initFloatingNavScrollSpy();
        refreshScrollTriggers();
        scrollGsapReady = true;
    } catch (error) {
        initFloatingNavScrollSpy();
    } finally {
        scrollGsapLoading = false;
    }
}

async function runHeroGsapFeatures() {
    if (heroGsapReady) return;

    try {
        await loadGsapCore();
        await waitForPaint();
        initHeroGsapAnimations();
        heroGsapReady = true;
    } catch (error) {
        // Hero animations are non-critical
    }
}

function scheduleGsapInit({ skipHero = false, signal } = {}) {
    if (!skipHero) {
        // Hero GSAP after Unicorn settles — longer gap keeps main thread free during WebGL boot.
        const startHero = () => {
            const heroDelay = isTouchMobileDevice() ? 600 : 1400;
            const pollTimeout = isTouchMobileDevice() ? 2200 : 3200;
            const idleAfterPoll = isTouchMobileDevice() ? 500 : 1200;

            if (unicornInitDone || unicornSceneActive || unicornInitFailed) {
                scheduleIdleTask(() => {
                    runHeroGsapFeatures();
                }, heroDelay);
                return;
            }

            const started = performance.now();
            const poll = () => {
                if (unicornInitDone || unicornSceneActive || unicornInitFailed || performance.now() - started > pollTimeout) {
                    scheduleIdleTask(() => {
                        runHeroGsapFeatures();
                    }, idleAfterPoll);
                    return;
                }
                requestAnimationFrame(poll);
            };
            requestAnimationFrame(poll);
        };

        startHero();
    }

    if (scrollGsapReady) {
        scheduleIdleTask(() => {
            runScrollGsapFeatures();
        }, 200);
        return;
    }

    const requestScrollGsap = () => {
        if (scrollGsapReady) return;
        scheduleIdleTask(() => {
            runScrollGsapFeatures();
        }, isTouchMobileDevice() ? 150 : 300);
    };

    // Cargar ScrollTrigger tras interacción; en móvil también con touch y fallback.
    ["scroll", "pointerdown", "touchstart", "wheel", "keydown"].forEach((eventName) => {
        const options = eventName === "keydown" ? { once: true, signal } : { once: true, passive: true, signal };
        window.addEventListener(eventName, requestScrollGsap, options);
    });

    window.setTimeout(requestScrollGsap, isTouchMobileDevice() ? 2500 : 5000);
}

function isLanguageSwitchLink(anchor) {
    if (!anchor || !anchor.getAttribute("href")) return false;
    if (!anchor.closest(".lenguage")) return false;

    try {
        const url = new URL(anchor.href, location.href);
        if (url.origin !== location.origin) return false;
        const path = url.pathname.replace(/\/+$/, "") || "/";
        return /(?:^|\/)(index\.html|en\.html)$/i.test(path) || /\/EN$/i.test(path);
    } catch (_) {
        return false;
    }
}

function absolutizeAttribute(el, attr, base) {
    const value = el.getAttribute(attr);
    if (!value) return;
    if (
        value.startsWith("#") ||
        value.startsWith("mailto:") ||
        value.startsWith("tel:") ||
        value.startsWith("javascript:") ||
        value.startsWith("data:") ||
        value.startsWith("blob:")
    ) {
        return;
    }

    try {
        el.setAttribute(attr, new URL(value, base).href);
    } catch (_) {
        // keep original
    }
}

function prepareImportedDocument(doc, pageUrl) {
    const base = new URL(pageUrl, location.href);

    doc.querySelectorAll("script").forEach((node) => node.remove());
    doc.querySelectorAll("[src]").forEach((el) => absolutizeAttribute(el, "src", base));
    doc.querySelectorAll("[href]").forEach((el) => absolutizeAttribute(el, "href", base));
    doc.querySelectorAll("[srcset]").forEach((el) => {
        const srcset = el.getAttribute("srcset");
        if (!srcset) return;
        const rewritten = srcset
            .split(",")
            .map((part) => {
                const trimmed = part.trim();
                if (!trimmed) return trimmed;
                const bits = trimmed.split(/\s+/);
                const url = bits[0];
                const descriptor = bits.slice(1).join(" ");
                try {
                    const abs = new URL(url, base).href;
                    return descriptor ? `${abs} ${descriptor}` : abs;
                } catch (_) {
                    return trimmed;
                }
            })
            .join(", ");
        el.setAttribute("srcset", rewritten);
    });
}

function syncDocumentMeta(doc) {
    document.documentElement.lang = doc.documentElement.lang || document.documentElement.lang;
    document.title = doc.title || document.title;

    ["og:description", "og:locale", "og:url", "og:title"].forEach((property) => {
        const next = doc.querySelector(`meta[property="${property}"]`);
        const current = document.querySelector(`meta[property="${property}"]`);
        if (next && current) {
            current.setAttribute("content", next.getAttribute("content") || "");
        }
    });
}

function withPinnedBodyContains(element, fn) {
    if (!element) return fn();

    const body = document.body;
    const originalContains = body.contains;

    body.contains = function pinnedContains(node) {
        if (node === element || (typeof element.contains === "function" && element.contains(node))) {
            return true;
        }
        return originalContains.call(this, node);
    };

    try {
        return fn();
    } finally {
        body.contains = originalContains;
    }
}

async function softSwitchLanguage(url, { push = true } = {}) {
    if (languageSwitchInFlight) return;
    languageSwitchInFlight = true;

    try {
        const res = await fetch(url, { credentials: "same-origin" });
        if (!res.ok) throw new Error(`Language page fetch failed: ${res.status}`);

        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        prepareImportedDocument(doc, url);

        if (heroAmbientMotionCleanup) {
            heroAmbientMotionCleanup();
        }
        if (unicornVisibilityCleanup) {
            unicornVisibilityCleanup();
        }

        const liveUnicorn = document.querySelector(".hero-unicorn-bg");
        const incomingUnicorn = doc.body.querySelector(".hero-unicorn-bg");
        const hadLiveScene =
            unicornSceneActive &&
            typeof UnicornStudio !== "undefined" &&
            Array.isArray(UnicornStudio.scenes) &&
            UnicornStudio.scenes.length > 0;

        setUnicornScenesPaused(true);

        withPinnedBodyContains(liveUnicorn, () => {
            if (liveUnicorn && incomingUnicorn) {
                incomingUnicorn.replaceWith(liveUnicorn);
            }

            syncDocumentMeta(doc);
            document.body.replaceChildren(...doc.body.childNodes);
        });

        if (push) {
            history.pushState({ softLang: true }, "", url);
        }

        killScrollTriggers();

        const hero = document.querySelector("#home.hero-modern");
        const embed = document.querySelector("[data-us-project]");
        const sceneStillAlive =
            typeof UnicornStudio !== "undefined" &&
            Array.isArray(UnicornStudio.scenes) &&
            UnicornStudio.scenes.length > 0;

        if (hadLiveScene && !sceneStillAlive) {
            // Scene was GC'd during transplant — rebuild once without full reload.
            unicornSceneActive = false;
            unicornInitDone = false;
            if (embed) {
                embed.removeAttribute("data-us-initialized");
                embed.replaceChildren();
            }
            bindPageInteractions({ skipHeroGsap: true, skipUnicornInit: false });
        } else {
            bindPageInteractions({ skipHeroGsap: true, skipUnicornInit: true });
            if (embed && sceneStillAlive) {
                embed.setAttribute("data-us-initialized", "true");
                unicornSceneActive = true;
                ensureHeroAmbientMotion(hero, embed);
                setupUnicornVisibilityPause();
                setUnicornScenesPaused(false);
            }
        }

        window.scrollTo(0, 0);
    } catch (error) {
        window.location.href = url;
    } finally {
        languageSwitchInFlight = false;
    }
}

function prefetchLanguageAlternate() {
    const link = document.querySelector(".lenguage a[href]");
    if (!link || !isLanguageSwitchLink(link)) return;

    const href = link.href;
    if (document.querySelector(`link[rel="prefetch"][href="${href}"]`)) return;

    const prefetch = document.createElement("link");
    prefetch.rel = "prefetch";
    prefetch.href = href;
    prefetch.as = "document";
    document.head.appendChild(prefetch);
}

function initLanguageSwitch(signal) {
    document.querySelectorAll(".lenguage a[href]").forEach((anchor) => {
        if (!isLanguageSwitchLink(anchor)) return;

        anchor.addEventListener(
            "click",
            (event) => {
                if (event.defaultPrevented) return;
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                    return;
                }

                event.preventDefault();
                softSwitchLanguage(anchor.href, { push: true });
            },
            { signal }
        );
    });

    scheduleIdleTask(prefetchLanguageAlternate, 1200);

    if (!popstateBound) {
        popstateBound = true;
        window.addEventListener("popstate", () => {
            softSwitchLanguage(location.href, { push: false });
        });
    }
}

function bindPageInteractions({ skipHeroGsap = false, skipUnicornInit = false } = {}) {
    const signal = getPageSignal();

    initMobileNav(signal);
    initDarkMode(signal);
    initSmoothScroll(signal);
    initHeaderScroll(signal);
    initCarouselControls(signal);
    initCertificateModal(signal);
    initProjectsLoadMore(signal);
    initFormacionLoadMore(signal);
    initFloatingNav(signal);
    initLanguageSwitch(signal);
    initSkillsAccordion(signal);
    scheduleDeviconLoad();

    if (!skipUnicornInit) {
        scheduleUnicornInit();
    }

    scheduleGsapInit({ skipHero: skipHeroGsap, signal });
}

document.addEventListener("DOMContentLoaded", () => {
    bindPageInteractions();
});
