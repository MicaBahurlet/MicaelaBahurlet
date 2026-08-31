const GSAP_BASE = "https://cdn.jsdelivr.net/npm/gsap@3.14.1/dist";
const DEVICON_CSS_URL =
    "https://cdn.jsdelivr.net/gh/devicons/devicon@2.17.0/devicon.min.css";

let nav = null;
let pageAbortController = null;
let heroFluidCleanup = null;
let heroFluidReady = false;
let heroFluidInitStarted = false;
let heroAnimationsReady = false;
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

async function runHeroNativeAnimations() {
    if (heroAnimationsReady) return;

    await waitForPaint();
    markHeroContentReady();
    heroAnimationsReady = true;
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

        navEl.style.bottom = `${requiredBottom}px`;
    };

    window.addEventListener("scroll", updatePosition, { passive: true, signal });
    window.addEventListener("resize", updatePosition, { signal });
    updatePosition();
}

function initProfileTitleRotate(signal) {
    const rotate = document.querySelector("#profile-intro .profile-title-rotate");
    if (!rotate) return;

    const items = [...rotate.querySelectorAll(".profile-title-rotate-item")];
    if (items.length < 2) return;

    const mobileRotateMq = window.matchMedia("(max-width: 768px)");

    // Desktop: lock width to the widest word so the line never shifts.
    // Mobile: full-width container + centered items (see StylesResponsive.css).
    const lockWidth = () => {
        if (mobileRotateMq.matches) {
            rotate.style.width = "";
            return;
        }

        const probe = document.createElement("span");
        probe.className = "profile-title-word profile-title-word--plain";
        probe.style.cssText =
            "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;pointer-events:none;";
        rotate.appendChild(probe);

        let widest = 0;
        items.forEach((item) => {
            probe.textContent = item.textContent?.trim() || "";
            widest = Math.max(widest, probe.offsetWidth);
        });

        probe.remove();
        if (widest > 0) {
            rotate.style.width = `${Math.ceil(widest + 4)}px`;
        }
    };

    const startRotation = () => {
        lockWidth();

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduceMotion) {
            items.forEach((item, index) => {
                item.classList.toggle("is-active", index === 0);
                item.classList.remove("is-leaving");
            });
            return;
        }

        let activeIndex = Math.max(
            0,
            items.findIndex((item) => item.classList.contains("is-active"))
        );
        let timerId = null;
        const holdMs = 3500;

        const showIndex = (nextIndex) => {
            const current = items[activeIndex];
            const next = items[nextIndex];
            if (!current || !next || current === next) return;

            current.classList.remove("is-active");
            current.classList.add("is-leaving");
            next.classList.add("is-active");
            next.classList.remove("is-leaving");

            window.setTimeout(() => {
                current.classList.remove("is-leaving");
            }, 360);

            activeIndex = nextIndex;
        };

        timerId = window.setInterval(() => {
            showIndex((activeIndex + 1) % items.length);
        }, holdMs);

        signal?.addEventListener("abort", () => {
            if (timerId) window.clearInterval(timerId);
        });
    };

    const fontsReady =
        document.fonts && typeof document.fonts.ready?.then === "function"
            ? document.fonts.ready
            : Promise.resolve();

    fontsReady.then(startRotation).catch(startRotation);

    let resizeRaf = null;
    const scheduleLockWidth = () => {
        if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
        resizeRaf = window.requestAnimationFrame(() => {
            resizeRaf = null;
            lockWidth();
        });
    };

    window.addEventListener("resize", scheduleLockWidth, { signal });
    mobileRotateMq.addEventListener?.("change", scheduleLockWidth, { signal });
}

function initProfileIntroAnimations(signal) {
    const section = document.querySelector("#profile-intro");
    if (!section) return;

    const emphasisWords = [...section.querySelectorAll(".profile-text-em--underline")];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    section.classList.add("profile-intro--ready");

    if (reduceMotion) {
        section.classList.add("is-inview");
        return;
    }

    emphasisWords.forEach((span, index) => {
        span.style.setProperty("--intro-delay", `${0.16 + index * 0.08}s`);
    });

    let revealed = false;

    const reveal = () => {
        if (revealed) return;
        revealed = true;
        section.classList.add("is-inview");
        observer.disconnect();
    };

    const observer = new IntersectionObserver(
        (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                reveal();
            }
        },
        { threshold: 0.18, rootMargin: "0px 0px -10% 0px" }
    );

    observer.observe(section);
    signal?.addEventListener("abort", () => observer.disconnect());

    const rect = section.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.85 && rect.bottom > 0) {
        reveal();
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

    // Precarga para evitar flash en blanco al cambiar de slide.
    items.forEach((item) => {
        const img = item.querySelector("img");
        if (!img) return;
        img.loading = "eager";
        img.decoding = "async";
        if (img.complete) return;
        const preload = new Image();
        preload.src = img.currentSrc || img.src;
    });

    let currentIndex = items.findIndex((item) => item.classList.contains("active"));
    if (currentIndex < 0) currentIndex = 0;
    let isAnimating = false;

    const showSlide = (index) => {
        if (index === currentIndex && items[index]?.classList.contains("active")) {
            if (prevBtn) prevBtn.hidden = index <= 0;
            if (nextBtn) nextBtn.hidden = index >= items.length - 1;
            return;
        }

        items.forEach((item, i) => {
            item.classList.toggle("active", i === index);
        });

        if (prevBtn) prevBtn.hidden = index <= 0;
        if (nextBtn) nextBtn.hidden = index >= items.length - 1;
        currentIndex = index;
    };

    prevBtn?.addEventListener(
        "click",
        () => {
            if (isAnimating || currentIndex <= 0) return;
            isAnimating = true;
            showSlide(currentIndex - 1);
            window.setTimeout(() => {
                isAnimating = false;
            }, 280);
        },
        { signal }
    );

    nextBtn?.addEventListener(
        "click",
        () => {
            if (isAnimating || currentIndex >= items.length - 1) return;
            isAnimating = true;
            showSlide(currentIndex + 1);
            window.setTimeout(() => {
                isAnimating = false;
            }, 280);
        },
        { signal }
    );

    showSlide(currentIndex);
}

function initCertificateModal(signal) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("imgModal");
    const closeBtn = modal.querySelector(".close");
    if (!modal || !modalImg) return;

    const openModal = (src, alt) => {
        modalImg.removeAttribute("width");
        modalImg.removeAttribute("height");
        modalImg.style.width = "";
        modalImg.style.height = "";
        modalImg.alt = alt || "";
        modalImg.src = src;
        modal.classList.add("is-open");
        modal.style.display = "flex";
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        closeBtn?.focus();
    };

    const closeModal = () => {
        modal.classList.remove("is-open");
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
        modalImg.removeAttribute("src");
        modalImg.alt = "";
        document.body.style.overflow = "";
    };

    document.querySelectorAll(".certificado-img").forEach((img) => {
        img.addEventListener(
            "click",
            () => {
                openModal(img.currentSrc || img.src, img.alt);
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

function initAboutMeCursor(signal) {
    const section = document.querySelector("#about.aboutme-section");
    if (!section) return;

    const cursor = section.querySelector(".aboutme-cursor");
    if (!cursor) return;

    const desktopMq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduceMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    let active = false;
    let rafId = null;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const setVisible = (visible) => {
        active = visible;
        section.classList.toggle("is-cursor-active", visible);
        cursor.classList.toggle("is-visible", visible);
        if (!visible && rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    };

    const render = () => {
        const ease = reduceMotionMq.matches ? 1 : 0.22;
        currentX += (targetX - currentX) * ease;
        currentY += (targetY - currentY) * ease;
        cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;

        if (
            active &&
            (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1)
        ) {
            rafId = requestAnimationFrame(render);
        } else {
            rafId = null;
            if (active) {
                cursor.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
            }
        }
    };

    const onMove = (event) => {
        if (!desktopMq.matches) return;

        const rect = section.getBoundingClientRect();
        targetX = event.clientX - rect.left;
        targetY = event.clientY - rect.top;

        if (!active) {
            currentX = targetX;
            currentY = targetY;
            setVisible(true);
            cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        }

        if (!rafId) {
            rafId = requestAnimationFrame(render);
        }
    };

    const onLeave = () => {
        setVisible(false);
    };

    const onMqChange = () => {
        if (!desktopMq.matches) setVisible(false);
    };

    section.addEventListener("mousemove", onMove, { passive: true, signal });
    section.addEventListener("mouseleave", onLeave, { passive: true, signal });
    desktopMq.addEventListener("change", onMqChange, { signal });
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

function initSkillsAccordion(signal) {
    const items = [...document.querySelectorAll(".skills-accordion-item")];
    if (!items.length) return;

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
                const willOpen = !item.classList.contains("is-active");
                closeAll();
                if (willOpen) setItemState(item, true);
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

    setItemState(items[0], true);
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

function markHeroBackgroundReady() {
    const bg = document.querySelector(".hero-fluid-bg");
    if (bg) bg.classList.add("is-ready");
}

function markHeroContentReady() {
    const hero = document.querySelector("#home.hero-modern");
    if (hero) hero.classList.add("is-hero-ready");
}

function initHeroFluidBackground() {
    if (heroFluidInitStarted || typeof window.HeroFluidBg === "undefined") return;

    heroFluidInitStarted = true;

    const instance = window.HeroFluidBg.init({
        onReady: () => {
            heroFluidReady = true;
            markHeroBackgroundReady();
        },
    });

    if (instance?.destroy) {
        heroFluidCleanup = instance.destroy;
    }
}

function waitForHeroBackgroundReady(timeoutMs = 900) {
    return new Promise((resolve) => {
        const started = performance.now();

        const finish = () => {
            markHeroBackgroundReady();
            resolve();
        };

        const check = () => {
            const bg = document.querySelector(".hero-fluid-bg.is-ready");
            const canvas = document.querySelector("#hero-fluid-canvas");

            if (bg && canvas && canvas.width > 0 && canvas.height > 0) {
                requestAnimationFrame(() => requestAnimationFrame(finish));
                return;
            }

            if (performance.now() - started >= timeoutMs) {
                finish();
                return;
            }

            requestAnimationFrame(check);
        };

        check();
    });
}

function destroyHeroFluidBackground() {
    if (heroFluidCleanup) {
        heroFluidCleanup();
        heroFluidCleanup = null;
    } else if (typeof window.HeroFluidBg !== "undefined") {
        window.HeroFluidBg.destroy();
    }

    heroFluidReady = false;
    heroFluidInitStarted = false;
    document.querySelector(".hero-fluid-bg")?.classList.remove("is-ready");
}

async function startHeroTextAfterBackground() {
    const timeoutMs = isTouchMobileDevice() ? 700 : 900;

    if (!heroFluidReady) {
        initHeroFluidBackground();
    }

    await waitForHeroBackgroundReady(timeoutMs);
    await runHeroNativeAnimations();
}

async function runScrollGsapFeatures() {
    if (scrollGsapReady) {
        killScrollTriggers();
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

function scheduleGsapInit({ skipHero = false, signal } = {}) {
    if (!skipHero) {
        startHeroTextAfterBackground();
    } else {
        markHeroContentReady();
        markHeroBackgroundReady();
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

async function softSwitchLanguage(url, { push = true } = {}) {
    if (languageSwitchInFlight) return;
    languageSwitchInFlight = true;

    try {
        const res = await fetch(url, { credentials: "same-origin" });
        if (!res.ok) throw new Error(`Language page fetch failed: ${res.status}`);

        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        prepareImportedDocument(doc, url);

        destroyHeroFluidBackground();
        heroAnimationsReady = false;
        document.querySelector("#home.hero-modern")?.classList.remove("is-hero-ready");

        syncDocumentMeta(doc);
        document.body.replaceChildren(...doc.body.childNodes);

        if (push) {
            history.pushState({ softLang: true }, "", url);
        }

        killScrollTriggers();
        bindPageInteractions({ skipHero: true, skipHeroBgInit: false });
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

function bindPageInteractions({ skipHero = false, skipHeroBgInit = false } = {}) {
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
    if (typeof window.initGithubGraph === "function") {
        initGithubGraph(signal);
    }
    initAboutMeCursor(signal);
    initProfileTitleRotate(signal);
    initProfileIntroAnimations(signal);
    scheduleDeviconLoad();

    if (!skipHeroBgInit) {
        initHeroFluidBackground();
    }

    scheduleGsapInit({ skipHero, signal });
}

function bootHeroCriticalPath() {
    if (document.querySelector("#hero-fluid-canvas")) {
        initHeroFluidBackground();
    }
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        () => {
            bootHeroCriticalPath();
            bindPageInteractions();
        },
        { once: true }
    );
} else {
    bootHeroCriticalPath();
    bindPageInteractions();
}
