window.__loadedPagePath ??= window.location.pathname;
      window.loadPageWithoutReload = async (url, addHistory = true) => {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error("Page could not be loaded");
          const nextDocument = new DOMParser().parseFromString(
            await response.text(),
            "text/html",
          );
          const pageScripts = [...nextDocument.body.querySelectorAll("script")];
          pageScripts.forEach((script) => script.remove());
          document.querySelectorAll("style[data-page-style]").forEach((style) => style.remove());
          nextDocument.head.querySelectorAll("style").forEach((style) => {
            const pageStyle = document.createElement("style");
            pageStyle.dataset.pageStyle = "true";
            pageStyle.textContent = style.textContent;
            document.head.append(pageStyle);
          });
          document.title = nextDocument.title;
          document.body.replaceWith(nextDocument.body);
          for (const source of pageScripts) {
            let scriptText = source.textContent;
            if (source.hasAttribute("src")) {
              const scriptUrl = new URL(
                source.getAttribute("src"),
                new URL(url, window.location.href),
              );
              const scriptResponse = await fetch(scriptUrl);
              if (!scriptResponse.ok) throw new Error("Page script could not be loaded");
              scriptText = await scriptResponse.text();
            }
            if (!scriptText.trim()) continue;
            const script = document.createElement("script");
            script.textContent = `(() => {\n${scriptText}\n})();`;
            document.body.append(script);
          }
          window.__loadedPagePath = new URL(url, window.location.href).pathname;
          if (addHistory) history.pushState({}, "", url);
          window.scrollTo(0, 0);
        } catch (error) {
          window.location.href = url;
        }
      };

      if (!window.__pageNavigationEventsInstalled) {
        window.__pageNavigationEventsInstalled = true;
        window.addEventListener("popstate", () => {
          if (window.location.pathname !== window.__loadedPagePath) {
            window.loadPageWithoutReload(window.location.href, false);
          }
        });
        document.addEventListener("click", (event) => {
          if (event.defaultPrevented) return;
          const pageLink = event.target.closest("a[href]");
          if (!pageLink) return;
          const destination = new URL(pageLink.href, window.location.href);
          if (
            destination.origin !== window.location.origin ||
            !destination.pathname.endsWith(".html") ||
            destination.pathname === window.location.pathname
          ) return;
          event.preventDefault();
          window.loadPageWithoutReload(destination.href);
        });
      }

      const body = document.body;
      const password = document.getElementById("password");
      const passwordToggle = document.getElementById("toggle-password");
      const form = document.getElementById("sign-in-form");
      const formMessage = document.getElementById("form-message");
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      passwordToggle.addEventListener("click", () => {
        const isVisible = password.type === "text";
        password.type = isVisible ? "password" : "text";
        passwordToggle.textContent = isVisible ? "Show" : "Hide";
        passwordToggle.setAttribute("aria-pressed", String(!isVisible));
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        window.loadPageWithoutReload("expense-dashboard.html");
      });

      const dotCanvas = document.getElementById("dot-field");
      const dotContext = dotCanvas.getContext("2d");
      const dotSpacing = 24;
      const dots = [];
      let pointerX = -1000;
      let pointerY = -1000;
      let targetX = -1000;
      let targetY = -1000;
      let lensStrength = 0;
      let targetLensStrength = 0;
      let animationFrame = null;
      let canvasWidth = 0;
      let canvasHeight = 0;
      let pixelRatio = 1;

      const randomAt = (column, row) => {
        const value = Math.sin(column * 127.1 + row * 311.7) * 43758.5453;
        return value - Math.floor(value);
      };

      const clusterDensity = (x, y, centerX, centerY, spreadX, spreadY, weight) => {
        const dx = (x - centerX) / spreadX;
        const dy = (y - centerY) / spreadY;
        return weight * Math.exp(-0.5 * (dx * dx + dy * dy));
      };

      const buildDots = () => {
        canvasWidth = window.innerWidth;
        canvasHeight = window.innerHeight;
        pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        dotCanvas.width = Math.round(canvasWidth * pixelRatio);
        dotCanvas.height = Math.round(canvasHeight * pixelRatio);
        dotCanvas.style.width = `${canvasWidth}px`;
        dotCanvas.style.height = `${canvasHeight}px`;
        dotContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        dots.length = 0;

        const columns = Math.ceil(canvasWidth / dotSpacing);
        const rows = Math.ceil(canvasHeight / dotSpacing);

        for (let row = 0; row <= rows; row += 1) {
          for (let column = 0; column <= columns; column += 1) {
            const x = column * dotSpacing + dotSpacing / 2;
            const y = row * dotSpacing + dotSpacing / 2;
            const nx = x / canvasWidth;
            const ny = y / canvasHeight;
            const density = Math.min(
              0.9,
              0.015 +
                clusterDensity(nx, ny, 0.06, 0.43, 0.2, 0.32, 0.65) +
                clusterDensity(nx, ny, 0.96, 0.32, 0.17, 0.34, 0.76) +
                clusterDensity(nx, ny, 0.55, 1.02, 0.38, 0.2, 0.52),
            );

            if (randomAt(column, row) < density) {
              dots.push({
                x,
                y,
                size: 6 + randomAt(column + 17, row + 31) * 3,
              });
            }
          }
        }
      };

      const drawDots = () => {
        dotContext.clearRect(0, 0, canvasWidth, canvasHeight);

        for (const dot of dots) {
          const dx = dot.x - pointerX;
          const dy = dot.y - pointerY;
          const distance = Math.hypot(dx, dy);
          const influence = Math.max(0, 1 - distance / 190) * lensStrength;
          const scale = 1 + influence * 0.9;
          const spread = 1 + influence * 0.3;
          const size = dot.size * scale;
          const x = pointerX + dx * spread - size / 2;
          const y = pointerY + dy * spread - size / 2;

          dotContext.fillStyle = `rgba(100, 116, 139, ${0.2 + influence * 0.5})`;
          dotContext.fillRect(x, y, size, size);
        }
      };

      const animateDots = () => {
        pointerX += (targetX - pointerX) * 0.18;
        pointerY += (targetY - pointerY) * 0.18;
        lensStrength += (targetLensStrength - lensStrength) * 0.16;
        drawDots();

        if (
          Math.abs(targetX - pointerX) > 0.2 ||
          Math.abs(targetY - pointerY) > 0.2 ||
          Math.abs(targetLensStrength - lensStrength) > 0.005
        ) {
          animationFrame = window.requestAnimationFrame(animateDots);
        } else {
          pointerX = targetX;
          pointerY = targetY;
          lensStrength = targetLensStrength;
          drawDots();
          animationFrame = null;
        }
      };

      const requestDotFrame = () => {
        if (animationFrame === null) {
          animationFrame = window.requestAnimationFrame(animateDots);
        }
      };

      buildDots();
      drawDots();
      window.addEventListener("resize", () => {
        buildDots();
        drawDots();
      });

      if (!reduceMotion) {
        window.addEventListener("pointermove", (event) => {
          targetX = event.clientX;
          targetY = event.clientY;
          targetLensStrength = 1;
          requestDotFrame();
        });

        document.documentElement.addEventListener("pointerleave", () => {
          targetLensStrength = 0;
          requestDotFrame();
        });
      }
