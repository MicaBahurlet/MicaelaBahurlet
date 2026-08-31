(() => {
    const API_URL = "https://github-contributions-api.jogruber.de/v4/MicaBahurlet?y=all";
    const CELL = 11;
    const GAP = 3;
    const LABEL_LEFT = 28;
    const LABEL_TOP = 18;
    const PAD = 2;

    const COPY = {
        es: {
            loading: "Cargando contribuciones…",
            error: "No se pudieron cargar las contribuciones.",
            lastYear: (count) => `${formatCount(count, "es")} contribuciones en el último año`,
            total: (count, year) => `${formatCount(count, "es")} contribuciones en ${year}`,
            weekdays: ["", "Lun", "", "Mié", "", "Vie", ""],
            tooltip: (date, count) => {
                const formatted = formatDate(date, "es");
                return count === 1
                    ? `${formatted}: 1 contribución`
                    : `${formatted}: ${count} contribuciones`;
            },
        },
        en: {
            loading: "Loading contributions…",
            error: "Could not load contributions.",
            lastYear: (count) => `${formatCount(count, "en")} contributions in the last year`,
            total: (count, year) => `${formatCount(count, "en")} contributions in ${year}`,
            weekdays: ["", "Mon", "", "Wed", "", "Fri", ""],
            tooltip: (date, count) => {
                const formatted = formatDate(date, "en");
                return count === 1
                    ? `${formatted}: 1 contribution`
                    : `${formatted}: ${count} contributions`;
            },
        },
    };

    let cache = null;
    let cachePromise = null;

    function formatCount(count, locale) {
        return new Intl.NumberFormat(locale === "en" ? "en-US" : "es-AR").format(count);
    }

    function formatDate(isoDate, locale) {
        const [year, month, day] = isoDate.split("-").map(Number);
        return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-AR", {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
        }).format(new Date(Date.UTC(year, month - 1, day)));
    }

    function monthLabel(isoDate, locale) {
        const [year, month, day] = isoDate.split("-").map(Number);
        return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-AR", {
            month: "short",
            timeZone: "UTC",
        }).format(new Date(Date.UTC(year, month - 1, day)));
    }

    function parseUtcDate(isoDate) {
        const [year, month, day] = isoDate.split("-").map(Number);
        return new Date(Date.UTC(year, month - 1, day));
    }

    function toIso(date) {
        return date.toISOString().slice(0, 10);
    }

    function todayIso() {
        const now = new Date();
        return toIso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
    }

    function fetchContributions() {
        if (cache) return Promise.resolve(cache);
        if (cachePromise) return cachePromise;

        cachePromise = fetch(API_URL)
            .then((response) => {
                if (!response.ok) throw new Error("github-contributions-failed");
                return response.json();
            })
            .then((data) => {
                cache = data;
                return data;
            })
            .finally(() => {
                cachePromise = null;
            });

        return cachePromise;
    }

    function yearsFromData(data) {
        const keys = Object.keys(data.total || {})
            .map(Number)
            .filter((year) => Number.isFinite(year))
            .sort((a, b) => b - a);
        return keys.length ? keys : [new Date().getFullYear()];
    }

    function lastYearRange() {
        const today = parseUtcDate(todayIso());
        const start = new Date(today);
        start.setUTCDate(start.getUTCDate() - 364);
        start.setUTCDate(start.getUTCDate() - start.getUTCDay());
        return { from: toIso(start), to: todayIso() };
    }

    function daysInRange(data, from, to) {
        return (data.contributions || []).filter((day) => day.date >= from && day.date <= to);
    }

    function daysForSelection(data, year) {
        const currentYear = new Date().getFullYear();
        const today = todayIso();

        if (year === currentYear) {
            const range = lastYearRange();
            return {
                days: daysInRange(data, range.from, range.to),
                isLastYear: true,
            };
        }

        return {
            days: daysInRange(data, `${year}-01-01`, `${year}-12-31`).filter((day) => day.date <= today),
            isLastYear: false,
        };
    }

    function computeLevels(days) {
        const nonzero = days
            .map((day) => Number(day.count) || 0)
            .filter((count) => count > 0)
            .sort((a, b) => a - b);

        if (!nonzero.length) {
            return (count) => (count > 0 ? 1 : 0);
        }

        const at = (ratio) => nonzero[Math.floor(ratio * (nonzero.length - 1))];
        const t1 = Math.max(1, at(0.25));
        const t2 = Math.max(t1 + 1, at(0.5));
        const t3 = Math.max(t2 + 1, at(0.75));

        return (count) => {
            if (count <= 0) return 0;
            if (count <= t1) return 1;
            if (count <= t2) return 2;
            if (count <= t3) return 3;
            return 4;
        };
    }

    function buildWeeks(days) {
        if (!days.length) return [];

        const byDate = new Map(days.map((day) => [day.date, day]));
        const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : 1));
        const first = parseUtcDate(sorted[0].date);
        const last = parseUtcDate(sorted[sorted.length - 1].date);
        first.setUTCDate(first.getUTCDate() - first.getUTCDay());

        const weeks = [];
        let cursor = new Date(first);

        while (cursor <= last) {
            const week = [];
            for (let weekday = 0; weekday < 7; weekday += 1) {
                const iso = toIso(cursor);
                if (iso > sorted[sorted.length - 1].date) {
                    week.push(null);
                } else {
                    week.push(byDate.get(iso) || { date: iso, count: 0, level: 0 });
                }
                cursor.setUTCDate(cursor.getUTCDate() + 1);
            }
            weeks.push(week);
        }

        return weeks;
    }

    function svgEl(name, attrs) {
        const node = document.createElementNS("http://www.w3.org/2000/svg", name);
        Object.entries(attrs).forEach(([key, value]) => {
            node.setAttribute(key, String(value));
        });
        return node;
    }

    function renderSvg(weeks, locale, levelOf) {
        const copy = COPY[locale] || COPY.es;
        const width = LABEL_LEFT + PAD + weeks.length * CELL + Math.max(0, weeks.length - 1) * GAP + PAD;
        const height = LABEL_TOP + PAD + 7 * CELL + 6 * GAP + PAD;
        const svg = svgEl("svg", {
            class: "github-graph-svg",
            viewBox: `0 0 ${width} ${height}`,
            width: String(width),
            height: String(height),
            role: "img",
        });

        copy.weekdays.forEach((label, dayIndex) => {
            if (!label) return;
            const text = svgEl("text", {
                class: "github-graph-weekday",
                x: "0",
                y: String(LABEL_TOP + PAD + dayIndex * (CELL + GAP) + CELL - 2),
            });
            text.textContent = label;
            svg.appendChild(text);
        });

        let lastLabelWeek = -10;
        weeks.forEach((week, weekIndex) => {
            const monthStart = week.find((day) => day && day.date.endsWith("-01"));
            const firstDay = week.find((day) => day);
            const shouldLabel = (weekIndex === 0 && firstDay) || monthStart;

            if (shouldLabel && weekIndex - lastLabelWeek >= 2) {
                const labelDay = monthStart || firstDay;
                lastLabelWeek = weekIndex;
                const label = svgEl("text", {
                    class: "github-graph-month",
                    x: String(LABEL_LEFT + PAD + weekIndex * (CELL + GAP)),
                    y: "12",
                });
                label.textContent = monthLabel(labelDay.date, locale);
                svg.appendChild(label);
            }

            week.forEach((day, dayIndex) => {
                if (!day) return;
                const count = Number(day.count) || 0;
                const level = levelOf(count);
                const rect = svgEl("rect", {
                    class: `github-graph-day github-graph-day--level-${level}`,
                    x: String(LABEL_LEFT + PAD + weekIndex * (CELL + GAP)),
                    y: String(LABEL_TOP + PAD + dayIndex * (CELL + GAP)),
                    width: String(CELL),
                    height: String(CELL),
                    rx: "2",
                    ry: "2",
                });
                const title = svgEl("title", {});
                title.textContent = copy.tooltip(day.date, count);
                rect.appendChild(title);
                svg.appendChild(rect);
            });
        });

        return svg;
    }

    function setStatus(root, message, isError = false) {
        const status = root.querySelector(".github-graph-status");
        const canvas = root.querySelector(".github-graph-canvas");
        if (!status || !canvas) return;
        status.textContent = message;
        status.hidden = !message;
        status.classList.toggle("is-error", isError);
        canvas.hidden = Boolean(message);
    }

    function renderYear(root, data, year) {
        const locale = root.dataset.locale === "en" ? "en" : "es";
        const copy = COPY[locale];
        const canvas = root.querySelector(".github-graph-canvas");
        const totalEl = root.querySelector(".github-graph-total");
        const yearsEl = root.querySelector(".github-graph-years");
        if (!canvas || !totalEl || !yearsEl) return;

        const selection = daysForSelection(data, year);
        const weeks = buildWeeks(selection.days);
        const total = selection.days.reduce((sum, day) => sum + (Number(day.count) || 0), 0);
        const levelOf = computeLevels(selection.days);

        canvas.replaceChildren(renderSvg(weeks, locale, levelOf));
        canvas.hidden = false;
        totalEl.textContent = selection.isLastYear ? copy.lastYear(total) : copy.total(total, year);

        yearsEl.querySelectorAll("[data-year]").forEach((button) => {
            const isActive = Number(button.dataset.year) === year;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-selected", isActive ? "true" : "false");
            button.tabIndex = isActive ? 0 : -1;
        });

        root.dataset.activeYear = String(year);
        setStatus(root, "");
    }

    function bindYearButtons(root, data, signal) {
        const yearsEl = root.querySelector(".github-graph-years");
        if (!yearsEl) return;

        yearsEl.replaceChildren();
        yearsFromData(data).forEach((year, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "github-graph-year";
            button.dataset.year = String(year);
            button.textContent = String(year);
            button.setAttribute("role", "tab");
            button.setAttribute("aria-selected", index === 0 ? "true" : "false");
            yearsEl.appendChild(button);
        });

        yearsEl.addEventListener(
            "click",
            (event) => {
                const button = event.target.closest("[data-year]");
                if (!button) return;
                renderYear(root, data, Number(button.dataset.year));
            },
            { signal }
        );
    }

    function mountGraph(root, signal) {
        const locale = root.dataset.locale === "en" ? "en" : "es";
        setStatus(root, COPY[locale].loading);

        fetchContributions()
            .then((data) => {
                if (signal?.aborted) return;
                bindYearButtons(root, data, signal);
                const years = yearsFromData(data);
                const currentYear = new Date().getFullYear();
                const initialYear = years.includes(currentYear) ? currentYear : years[0];
                renderYear(root, data, initialYear);
            })
            .catch(() => {
                if (signal?.aborted) return;
                setStatus(root, COPY[locale].error, true);
            });
    }

    function initGithubGraph(signal) {
        const root = document.querySelector(".github-graph");
        if (!root) return;

        const start = () => mountGraph(root, signal);

        if (!("IntersectionObserver" in window)) {
            start();
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return;
                observer.disconnect();
                start();
            },
            { rootMargin: "200px 0px" }
        );

        observer.observe(root);
        signal?.addEventListener("abort", () => observer.disconnect());
    }

    window.initGithubGraph = initGithubGraph;
})();
