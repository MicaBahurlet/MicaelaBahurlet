(function () {
    const VERTEX_SHADER = `attribute vec4 p;void main(){gl_Position=p;}`;

    const FRAGMENT_SHADER = `
        precision highp float;
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform vec2 u_mouse;

        vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
        vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;}
        vec3 permute(vec3 x){return mod289(((x*34.)+1.)*x);}

        float snoise(vec2 v){
            const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
            vec2 i=floor(v+dot(v,C.yy));
            vec2 x0=v-i+dot(i,C.xx);
            vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
            vec4 x12=x0.xyxy+C.xxzz;
            x12.xy-=i1;
            i=mod289(i);
            vec3 pv=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
            vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
            m=m*m;m=m*m;
            vec3 x=2.*fract(pv*C.www)-1.;
            vec3 h=abs(x)-.5;
            vec3 ox=floor(x+.5);
            vec3 a0=x-ox;
            m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
            vec3 g;
            g.x=a0.x*x0.x+h.x*x0.y;
            g.yz=a0.yz*x12.xz+h.yz*x12.yw;
            return 130.*dot(m,g);
        }

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float filmGrain(vec2 coord, float time) {
            vec2 px = coord;
            float fine = hash(px + fract(time * 0.37));
            float coarse = hash(floor(px * 0.5) + fract(time * 0.11));
            float shimmer = hash(px * 1.7 - fract(time * 0.07));
            return fine * 0.55 + coarse * 0.3 + shimmer * 0.15;
        }

        void main(){
            vec2 st = gl_FragCoord.xy / u_resolution.xy;
            vec2 asp = st;
            asp.x *= u_resolution.x / u_resolution.y;
            float t = u_time * 0.31;

            vec2 m_asp = u_mouse;
            m_asp.x *= u_resolution.x / u_resolution.y;
            vec2 m_dir = asp - m_asp;
            float m_dist = length(m_dir);
            float m_influence = smoothstep(0.45, 0.0, m_dist);
            vec2 warp_offset = m_dir * m_influence * 0.28;

            vec2 uv = st;
            float w1 = snoise((asp - warp_offset) * 4.0 + vec2(t * 0.4, t * 0.3));
            float w2 = snoise((asp - warp_offset) * 5.32 - vec2(t * 0.2, t * 0.5));
            uv.x += w1 * 0.03 - warp_offset.x;
            uv.y += w2 * 0.03 - warp_offset.y;

            // Brand palette
            vec3 cDeepNavy = vec3(0.027, 0.059, 0.102); // #070f1a
            vec3 cDarkTeal  = vec3(0.071, 0.212, 0.255); // #123641
            vec3 cTealDeep  = vec3(0.184, 0.435, 0.420); // #2f6f6b
            vec3 cTealMid   = vec3(0.227, 0.490, 0.471); // #3a7d78
            vec3 cTealSoft  = vec3(0.561, 0.757, 0.745); // #8fc1be
            vec3 cAqua      = vec3(0.310, 0.839, 0.788); // #4fd6c9

            float n1 = snoise(uv * 1.2 + vec2(t, 0.0)) * 0.5 + 0.5;
            float n2 = snoise(uv * 1.5 - vec2(0.0, t * 0.6)) * 0.5 + 0.5;
            float n3 = snoise(uv * 1.3 + vec2(-t * 0.5, t * 0.3)) * 0.5 + 0.5;

            vec3 bg = mix(cDeepNavy, cDarkTeal, clamp(uv.x + n1 * 0.4, 0.0, 1.0));
            bg = mix(bg, cTealDeep, smoothstep(0.2, 0.9, n2 * (1.2 - uv.x) * uv.y));
            bg = mix(bg, cTealMid, smoothstep(0.1, 0.8, n1 * uv.x * (1.1 - uv.y)));
            bg = mix(bg, cTealSoft, smoothstep(0.3, 1.0, n3 * (1.0 - uv.y) * uv.x * 1.5));
            bg += mix(cTealSoft, cAqua, sin(t) * 0.5 + 0.5) * m_influence * 0.05;

            // Subtle premium grade: depth, soft bloom, film grain
            float lum = dot(bg, vec3(0.299, 0.587, 0.114));
            bg = pow(max(bg, 0.0), vec3(0.97));
            bg = mix(bg, bg * bg, 0.06);

            float vig = 1.0 - smoothstep(0.58, 1.28, length(st - 0.5) * 1.02);
            bg *= 0.93 + vig * 0.07;

            float bloom = smoothstep(0.3, 0.64, lum);
            bg += mix(cTealSoft, cAqua, 0.35) * bloom * 0.035;

            float grain = filmGrain(gl_FragCoord.xy, u_time);
            float grainMask = clamp(1.0 - abs(lum - 0.34) * 1.15, 0.38, 1.0);
            bg += (grain - 0.5) * 0.044 * grainMask;

            float staticNoise = hash(gl_FragCoord.xy * 0.85 + vec2(17.0, 31.0));
            bg += (staticNoise - 0.5) * 0.014;

            gl_FragColor = vec4(bg, 1.0);
        }
    `;

    let activeCleanup = null;

    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    function initHeroFluidBackground(options = {}) {
        if (activeCleanup) {
            activeCleanup();
            activeCleanup = null;
        }

        const canvas = options.canvas || document.getElementById("hero-fluid-canvas");
        const container = options.container || document.querySelector(".hero-fluid-bg");
        const hero = options.hero || document.querySelector("#home.hero-modern");
        const onReady = typeof options.onReady === "function" ? options.onReady : null;

        if (!canvas || !container) return null;

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "high-performance" });

        if (!gl) {
            container.classList.add("is-ready");
            onReady?.();
            return { destroy() {} };
        }

        const vs = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
        const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
        if (!vs || !fs) {
            container.classList.add("is-ready");
            onReady?.();
            return { destroy() {} };
        }

        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            container.classList.add("is-ready");
            onReady?.();
            return { destroy() {} };
        }

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, -1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);

        const attrib = gl.getAttribLocation(program, "p");
        const uResolution = gl.getUniformLocation(program, "u_resolution");
        const uTime = gl.getUniformLocation(program, "u_time");
        const uMouse = gl.getUniformLocation(program, "u_mouse");

        let rafId = null;
        let running = true;
        let ready = false;
        let mx = 0.5;
        let my = 0.5;
        let tx = 0.5;
        let ty = 0.5;
        const t0 = performance.now();

        const resize = () => {
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            if (!width || !height) return;

            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const nextW = Math.round(width * dpr);
            const nextH = Math.round(height * dpr);

            if (canvas.width !== nextW || canvas.height !== nextH) {
                canvas.width = nextW;
                canvas.height = nextH;
            }
        };

        const setPointer = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            tx = (clientX - rect.left) / rect.width;
            ty = 1 - (clientY - rect.top) / rect.height;
        };

        const onMouseMove = (event) => setPointer(event.clientX, event.clientY);
        const onTouchMove = (event) => {
            const touch = event.touches[0];
            if (touch) setPointer(touch.clientX, touch.clientY);
        };

        const markReady = () => {
            if (ready) return;
            ready = true;
            container.classList.add("is-ready");
            onReady?.();
        };

        const draw = () => {
            if (!running) return;

            resize();
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.useProgram(program);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.vertexAttribPointer(attrib, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(attrib);
            gl.uniform2f(uResolution, canvas.width, canvas.height);
            gl.uniform1f(uTime, reduceMotion ? 0 : (performance.now() - t0) / 1000);

            if (!reduceMotion) {
                mx += (tx - mx) * 0.08;
                my += (ty - my) * 0.08;
            }

            gl.uniform2f(uMouse, mx, my);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            markReady();
            rafId = requestAnimationFrame(draw);
        };

        const onVisibility = () => {
            const shouldRun = !document.hidden && running;
            if (shouldRun && rafId === null) {
                rafId = requestAnimationFrame(draw);
            }
        };

        let observer = null;
        if (hero && "IntersectionObserver" in window) {
            observer = new IntersectionObserver(
                ([entry]) => {
                    const visible = Boolean(entry?.isIntersecting) && !document.hidden;
                    if (visible && running && rafId === null) {
                        rafId = requestAnimationFrame(draw);
                    }
                },
                { threshold: 0.05 }
            );
            observer.observe(hero);
        }

        const target = hero || canvas;
        target.addEventListener("mousemove", onMouseMove, { passive: true });
        target.addEventListener("touchmove", onTouchMove, { passive: true });
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("resize", resize, { passive: true });

        resize();
        rafId = requestAnimationFrame(draw);

        const destroy = () => {
            running = false;
            if (rafId) cancelAnimationFrame(rafId);
            rafId = null;
            target.removeEventListener("mousemove", onMouseMove);
            target.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("resize", resize);
            observer?.disconnect();
            gl.deleteProgram(program);
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            gl.deleteBuffer(buffer);
            activeCleanup = null;
        };

        activeCleanup = destroy;
        return { destroy };
    }

    window.HeroFluidBg = {
        init: initHeroFluidBackground,
        destroy() {
            activeCleanup?.();
        },
    };
})();
