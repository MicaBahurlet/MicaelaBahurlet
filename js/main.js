const GSAP_BASE = "https://cdn.jsdelivr.net/npm/gsap@3.14.1/dist";
const LENIS_SRC = "https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js";
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
let lenisInstance = null;
let lenisRafId = 0;
let lenisTickerCallback = null;
let lenisScrollTriggerUnsub = null;
let lenisToken = 0;
let lenisConditionsBound = false;

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

function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function shouldUseLenis() {
    return (
        window.matchMedia("(min-width: 992px)").matches &&
        window.matchMedia("(pointer: fine)").matches &&
        !prefersReducedMotion()
    );
}

function easePower3InOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function throttleRaf(callback) {
    let scheduled = false;
    let cancelled = false;

    const wrapped = () => {
        if (cancelled || scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            if (!cancelled) callback();
        });
    };

    wrapped.cancel = () => {
        cancelled = true;
    };

    return wrapped;
}

async function loadLenis() {
    if (typeof window.Lenis !== "undefined") return;
    await loadScript(LENIS_SRC);
}

function startLenisRaf() {
    if (!lenisInstance || lenisRafId || lenisTickerCallback) return;

    const loop = (time) => {
        if (!lenisInstance || lenisTickerCallback) {
            lenisRafId = 0;
            return;
        }
        lenisInstance.raf(time);
        lenisRafId = requestAnimationFrame(loop);
    };

    lenisRafId = requestAnimationFrame(loop);
}

function connectLenisToGsap() {
    if (!lenisInstance || typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") {
        return;
    }

    if (lenisRafId) {
        cancelAnimationFrame(lenisRafId);
        lenisRafId = 0;
    }

    if (!lenisScrollTriggerUnsub) {
        lenisScrollTriggerUnsub = lenisInstance.on("scroll", () => {
            window.ScrollTrigger.update();
        });
    }

    if (!lenisTickerCallback) {
        lenisTickerCallback = (time) => {
            lenisInstance?.raf(time * 1000);
        };
        window.gsap.ticker.add(lenisTickerCallback);
        window.gsap.ticker.lagSmoothing(0);
    }
}

function destroyLenis() {
    lenisToken += 1;

    if (lenisRafId) {
        cancelAnimationFrame(lenisRafId);
        lenisRafId = 0;
    }

    if (lenisTickerCallback && typeof window.gsap !== "undefined") {
        window.gsap.ticker.remove(lenisTickerCallback);
    }
    lenisTickerCallback = null;

    if (lenisScrollTriggerUnsub) {
        lenisScrollTriggerUnsub();
        lenisScrollTriggerUnsub = null;
    }

    const instance = lenisInstance;
    lenisInstance = null;

    if (instance) {
        window.dispatchEvent(new CustomEvent("lenis:destroy"));
        instance.destroy();
    }
}

async function initLenis() {
    if (!shouldUseLenis() || lenisInstance) return lenisInstance;

    const token = lenisToken;

    try {
        await loadLenis();
    } catch (_) {
        return null;
    }

    if (token !== lenisToken || !shouldUseLenis() || lenisInstance || typeof window.Lenis === "undefined") {
        return lenisInstance;
    }

    lenisInstance = new window.Lenis({
        smoothWheel: true,
        syncTouch: false,
        lerp: 0.08,
        wheelMultiplier: 0.9,
        touchMultiplier: 1,
        prevent: (node) => {
            if (!(node instanceof HTMLElement)) return false;
            if (node.scrollWidth <= node.clientWidth + 1) return false;
            const overflowX = window.getComputedStyle(node).overflowX;
            return overflowX === "auto" || overflowX === "scroll";
        },
    });

    startLenisRaf();
    window.dispatchEvent(new CustomEvent("lenis:ready"));

    if (typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined") {
        connectLenisToGsap();
    }

    lenisInstance.resize();
    return lenisInstance;
}

function watchLenisConditions() {
    if (lenisConditionsBound) return;
    lenisConditionsBound = true;

    const sync = () => {
        if (shouldUseLenis()) {
            initLenis();
            return;
        }
        destroyLenis();
    };

    ["(min-width: 992px)", "(pointer: fine)", "(prefers-reduced-motion: reduce)"].forEach((query) => {
        window.matchMedia(query).addEventListener("change", sync);
    });
}

function subscribeScroll(callback, signal) {
    const throttled = throttleRaf(callback);
    let unsubscribeLenis = null;

    const unbindLenis = () => {
        if (!unsubscribeLenis) return;
        unsubscribeLenis();
        unsubscribeLenis = null;
    };

    const bindNative = () => {
        unbindLenis();
        window.addEventListener("scroll", throttled, { passive: true });
    };

    const bindLenis = () => {
        if (!lenisInstance || unsubscribeLenis) return;
        window.removeEventListener("scroll", throttled);
        unsubscribeLenis = lenisInstance.on("scroll", throttled);
    };

    if (lenisInstance) bindLenis();
    else bindNative();

    const onReady = () => bindLenis();
    const onDestroy = () => bindNative();

    window.addEventListener("lenis:ready", onReady);
    window.addEventListener("lenis:destroy", onDestroy);

    signal?.addEventListener("abort", () => {
        throttled.cancel();
        unbindLenis();
        window.removeEventListener("scroll", throttled);
        window.removeEventListener("lenis:ready", onReady);
        window.removeEventListener("lenis:destroy", onDestroy);
    });
}

function scrollToPosition(top, { duration = 1.2, immediate = false } = {}) {
    const reduceMotion = prefersReducedMotion();

    if (reduceMotion || immediate) {
        if (lenisInstance) {
            lenisInstance.scrollTo(top, { immediate: true, force: true });
        } else {
            window.scrollTo({ top, behavior: "auto" });
        }
        return;
    }

    if (lenisInstance) {
        lenisInstance.scrollTo(top, {
            duration,
            easing: easePower3InOut,
            onComplete: () => {
                if (typeof window.ScrollTrigger !== "undefined") {
                    window.ScrollTrigger.update();
                }
            },
        });
        return;
    }

    if (typeof window.gsap === "undefined" || typeof window.ScrollToPlugin === "undefined") {
        window.scrollTo({ top, behavior: "smooth" });
        return;
    }

    window.gsap.registerPlugin(window.ScrollToPlugin);
    window.gsap.to(window, {
        duration,
        scrollTo: { y: top, autoKill: true },
        ease: "power3.inOut",
        onComplete: () => {
            if (typeof window.ScrollTrigger !== "undefined") {
                window.ScrollTrigger.update();
            }
        },
    });
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

function resolveScrollTop(target) {
    if (!target) return 0;

    const headerOffset = getScrollOffset();
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const anchor =
        target.id === "contact"
            ? target.querySelector(".contact-kicker") || target.querySelector(".contact-hero") || target
            : target;
    const top = anchor.getBoundingClientRect().top + window.pageYOffset - headerOffset;

    return Math.min(Math.max(0, top), maxScroll);
}

function smoothScrollToTarget(target, duration = 1.2) {
    if (!target) return;
    scrollToPosition(resolveScrollTop(target), { duration });
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

                if (href === "#") {
                    scrollToPosition(0);
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

    subscribeScroll(updatePosition, signal);
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

    subscribeScroll(update, signal);
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

function initCertificatesLoadMore(signal) {
    const gallery = document.querySelector("#Certificates .certificates-gallery");
    const btn = document.getElementById("btnCargarMasCertificados");
    if (!gallery || !btn) return;

    const items = [...gallery.querySelectorAll(".certificate-item")];
    items.forEach((item, index) => {
        if (!item.dataset.certOrder) item.dataset.certOrder = String(index);
    });

    const desktopQuery = window.matchMedia("(min-width: 992px)");
    let rowsShown = 2;
    let wasDesktop = desktopQuery.matches;

    const orderedItems = (newestFirst) => {
        const sorted = [...items].sort((a, b) => {
            const diff = Number(a.dataset.certOrder) - Number(b.dataset.certOrder);
            return newestFirst ? -diff : diff;
        });
        sorted.forEach((item) => gallery.appendChild(item));
        return sorted;
    };

    const columnCount = () => {
        const tracks = getComputedStyle(gallery).gridTemplateColumns.split(" ").filter(Boolean);
        return Math.max(tracks.length, 1);
    };

    const updateCertificates = () => {
        if (!desktopQuery.matches) {
            orderedItems(false);
            items.forEach((item) => item.classList.remove("is-cert-hidden"));
            btn.hidden = true;
            return;
        }

        const ordered = orderedItems(true);
        const visibleCount = columnCount() * rowsShown;
        ordered.forEach((item, index) => {
            item.classList.toggle("is-cert-hidden", index >= visibleCount);
        });
        btn.hidden = visibleCount >= ordered.length;
    };

    btn.addEventListener(
        "click",
        () => {
            rowsShown += 2;
            updateCertificates();
            refreshScrollTriggers();
        },
        { signal }
    );

    desktopQuery.addEventListener(
        "change",
        () => {
            rowsShown = 2;
            wasDesktop = desktopQuery.matches;
            updateCertificates();
            refreshScrollTriggers();
        },
        { signal }
    );

    window.addEventListener(
        "resize",
        () => {
            const isDesktop = desktopQuery.matches;
            if (isDesktop && !wasDesktop) rowsShown = 2;
            wasDesktop = isDesktop;
            updateCertificates();
        },
        { signal }
    );

    updateCertificates();
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

let experienceMedia = null;

function clearExperienceActiveState() {
    document.querySelectorAll("#timeline .timeline-item.is-active").forEach((item) => {
        item.classList.remove("is-active");
    });
}

function initContactCopy(signal) {
    const button = document.querySelector("#contact .contact-copy");
    if (!button) return;

    const email = button.getAttribute("data-copy") || "";
    const idleLabel = button.textContent;
    const copiedLabel = button.getAttribute("data-copied") || idleLabel;

    button.addEventListener(
        "click",
        async () => {
            try {
                await navigator.clipboard.writeText(email);
            } catch (error) {
                const field = document.createElement("textarea");
                field.value = email;
                field.setAttribute("readonly", "");
                field.style.position = "fixed";
                field.style.left = "-999px";
                document.body.appendChild(field);
                field.select();
                document.execCommand("copy");
                field.remove();
            }

            button.textContent = copiedLabel;
            window.setTimeout(() => {
                button.textContent = idleLabel;
            }, 1600);
        },
        { signal }
    );
}

let contactMarkMedia = null;

function initContactMark() {
    if (contactMarkMedia) {
        contactMarkMedia.revert();
        contactMarkMedia = null;
    }

    const mark = document.querySelector("#contact .contact-trisquel");
    const section = document.querySelector("#contact");
    if (!mark || !section || typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;

    const gsap = window.gsap;
    gsap.registerPlugin(ScrollTrigger);
    contactMarkMedia = gsap.matchMedia();

    contactMarkMedia.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(mark, { transformOrigin: "50% 50%" });
        gsap.fromTo(
            mark,
            { rotation: 0 },
            {
                rotation: 360,
                transformOrigin: "50% 50%",
                ease: "none",
                scrollTrigger: {
                    trigger: section,
                    start: "top bottom",
                    end: "top 20%",
                    scrub: 0.35,
                    id: "contact-trisquel",
                },
            }
        );
    });
}

function initExperienceScroll() {
    if (experienceMedia) {
        experienceMedia.revert();
        experienceMedia = null;
    }
    clearExperienceActiveState();

    if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;

    const gsap = window.gsap;
    gsap.registerPlugin(ScrollTrigger);
    experienceMedia = gsap.matchMedia();

    experienceMedia.add("(min-width: 992px) and (prefers-reduced-motion: no-preference)", () => {
        const timeline = document.querySelector("#timeline .timeline");
        const progress = timeline ? timeline.querySelector(".timeline-progress") : null;
        const items = timeline ? gsap.utils.toArray(timeline.querySelectorAll(".timeline-item")) : [];
        if (!timeline || !progress || !items.length) return;

        const section = document.querySelector("#timeline");
        gsap.set(progress, { scaleY: 0, transformOrigin: "top center" });
        gsap.to(progress, {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
                trigger: section,
                start: "top center",
                end: "bottom center",
                scrub: true,
                id: "experience-line",
            },
        });

        items.forEach((item, index) => {
            const sync = (self) => {
                item.classList.toggle("is-active", self.progress > 0 || self.isActive);
            };

            ScrollTrigger.create({
                trigger: item,
                start: "top center",
                end: "bottom top",
                id: `experience-item-${index}`,
                onUpdate: sync,
                onRefresh: sync,
            });
        });

        return () => {
            clearExperienceActiveState();
        };
    });
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
        initExperienceScroll();
        initContactMark();
        initFloatingNavScrollSpy();
        refreshScrollTriggers();
        connectLenisToGsap();
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
        initExperienceScroll();
        initContactMark();
        initFloatingNavScrollSpy();
        refreshScrollTriggers();
        connectLenisToGsap();
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

        destroyLenis();
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

function initProfileStats(signal) {
    const stats = document.querySelector("#profile-intro .profile-stats");
    if (!stats) return;

    const numbers = [...stats.querySelectorAll(".profile-stat-number")];
    if (!numbers.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frameIds = new Map();

    const setFinal = () => {
        numbers.forEach((el) => {
            el.textContent = String(Number(el.dataset.count) || 0);
        });
    };

    const reset = () => {
        numbers.forEach((el) => {
            el.textContent = "0";
        });
    };

    const stop = () => {
        frameIds.forEach((id) => cancelAnimationFrame(id));
        frameIds.clear();
    };

    signal?.addEventListener("abort", stop);

    if (reduceMotion) {
        setFinal();
        return;
    }

    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const run = () => {
        stop();
        const start = performance.now();
        numbers.forEach((el) => {
            const target = Number(el.dataset.count) || 0;
            const duration = 700 + target * 55;
            el.textContent = "0";

            const tick = (now) => {
                const progress = Math.min(1, (now - start) / duration);
                el.textContent = String(progress < 1 ? Math.round(easeOut(progress) * target) : target);
                if (progress < 1) {
                    frameIds.set(el, requestAnimationFrame(tick));
                    return;
                }
                frameIds.delete(el);
            };

            frameIds.set(el, requestAnimationFrame(tick));
        });
    };

    let onScreen = false;
    const observer = new IntersectionObserver(
        (entries) => {
            const entry = entries[0];
            if (!entry) return;
            if (entry.intersectionRatio >= 0.35) {
                if (onScreen) return;
                onScreen = true;
                run();
                return;
            }
            if (entry.isIntersecting || !onScreen) return;
            onScreen = false;
            stop();
            reset();
        },
        { threshold: [0, 0.35] }
    );

    observer.observe(stats);
    signal?.addEventListener("abort", () => observer.disconnect());
}

function bindPageInteractions({ skipHero = false, skipHeroBgInit = false } = {}) {
    const signal = getPageSignal();
    signal.addEventListener("abort", () => {
        destroyLenis();
    });

    initMobileNav(signal);
    initDarkMode(signal);
    initSmoothScroll(signal);
    initHeaderScroll(signal);
    initCarouselControls(signal);
    initCertificateModal(signal);
    initCertificatesLoadMore(signal);
    initProjectsLoadMore(signal);
    initFormacionLoadMore(signal);
    initFloatingNav(signal);
    initLanguageSwitch(signal);
    initSkillsAccordion(signal);
    if (typeof window.initGithubGraph === "function") {
        initGithubGraph(signal);
    }
    initContactCopy(signal);
    initAboutMeCursor(signal);
    initProfileTitleRotate(signal);
    initProfileIntroAnimations(signal);
    initProfileStats(signal);
    scheduleDeviconLoad();

    if (!skipHeroBgInit) {
        initHeroFluidBackground();
    }

    scheduleGsapInit({ skipHero, signal });
    watchLenisConditions();
    initLenis();
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
