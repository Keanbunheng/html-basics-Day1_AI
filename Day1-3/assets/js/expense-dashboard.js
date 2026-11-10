(async () => {
      const savingsGoalPlaceholder = document.getElementById("savings-goal-page");
      if (savingsGoalPlaceholder) {
        try {
          const savingsPageResponse = await fetch(
            new URL("partials/savings-goal.html", document.baseURI),
          );
          if (!savingsPageResponse.ok) throw new Error("Savings Goal view could not be loaded.");
          const savingsPageDocument = new DOMParser().parseFromString(
            await savingsPageResponse.text(),
            "text/html",
          );
          const savingsPage = savingsPageDocument.querySelector("#savings-goal-page");
          if (!savingsPage) throw new Error("Savings Goal view is missing its page section.");
          savingsGoalPlaceholder.replaceWith(savingsPage);
        } catch (error) {
          console.error("Savings Goal view could not be loaded.", error);
          savingsGoalPlaceholder.innerHTML = '<div class="rounded-xl bg-rose-50 p-5 text-sm text-rose-700">Savings Goal could not load. Refresh the dashboard and try again.</div>';
          return;
        }
      }

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
          document
            .querySelectorAll("style[data-page-style]")
            .forEach((style) => style.remove());
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
          )
            return;
          event.preventDefault();
          window.loadPageWithoutReload(destination.href);
        });
      }

      document.querySelectorAll(".cash-flow-chart span[aria-label]").forEach((bar) => {
        bar.dataset.tooltip = "Loading financial data";
        bar.tabIndex = 0;
      });

      document
        .querySelectorAll(".cash-flow-chart > div")
        .forEach((monthColumn) => {
          const month = monthColumn.lastElementChild.textContent.trim();
          monthColumn.dataset.month = month;
          monthColumn.querySelectorAll("[data-tooltip]").forEach((bar) => {
            bar.dataset.month = month;
            bar.dataset.series = bar
              .getAttribute("aria-label")
              .toLowerCase()
              .includes("expenses")
              ? "expenses"
              : "income";
            bar.setAttribute("role", "button");
            bar.setAttribute("aria-pressed", "false");
            bar.setAttribute(
              "aria-label",
              `${bar.getAttribute("aria-label")}. Select to view ${month} transactions.`,
            );
            bar.addEventListener("click", () => filterReportForMonth(month));
            bar.addEventListener("keydown", (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                filterReportForMonth(month);
              }
            });
          });
        });

      const sidebar = document.getElementById("sidebar");
      const overlay = document.getElementById("sidebar-overlay");
      const menuToggle = document.getElementById("menu-toggle");
      document.getElementById("dashboard-local-date").textContent =
        new Intl.DateTimeFormat(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        }).format(new Date());
      const accountMenu = document.getElementById("account-menu");
      const accountMenuToggle = document.getElementById("account-menu-toggle");
      const profileDialog = document.getElementById("profile-dialog");
      const expenseDialog = document.getElementById("expense-dialog");
      const expenseForm = document.getElementById("expense-form");
      const expenseTotal = document.getElementById("expense-total");
      const transactionList = document.getElementById("transaction-list");
      const allTransactionsList = document.getElementById(
        "all-transactions-list",
      );
      const transactionMonthFilter = document.getElementById(
        "transaction-month-filter",
      );
      const reportTableHeading = document.getElementById(
        "report-table-heading",
      );
      const reportTransactionsList = document.getElementById(
        "report-transactions-list",
      );
      const transactionHistoryPagination = document.getElementById(
        "all-transactions-pagination",
      );
      const reportTransactionsPagination = document.getElementById(
        "report-transactions-pagination",
      );
      const transactionIncomeSummary = document.getElementById(
        "transaction-income-summary",
      );
      const transactionExpenseSummary = document.getElementById(
        "transaction-expense-summary",
      );
      const transactionNetSummary = document.getElementById(
        "transaction-net-summary",
      );
      const toastRegion = document.getElementById("toast-region");
      const backToTopButton = document.getElementById("back-to-top");
      const pageLoader = document.getElementById("page-loader");
      const periodSelect = document.getElementById("period");
      const incomeTotal = document.getElementById("income-total");
      const savingsRate = document.getElementById("savings-rate");
      const workspaceNavLinks = [
        ...sidebar.querySelectorAll(".workspace-nav-link"),
      ];
      const reportsContent = document.getElementById("reports-content");
      document.getElementById("reports-content-target").append(reportsContent);
      let totalExpenses = 0;
      let budgetLimit = 2400;
      let accountBalance = 0;
      let categoryBudgetData = [];
      let financialCategories = [];
      let activeSavingsGoal = null;
      let savingsGoalHistory = [];
      let averageMonthlySurplus = 0;
      let financialDataReady = false;
      let lastSavingsTransferWarningDate = "";
      let browserTransactions = [];
      let toastTimeout = null;
      let pageLoaderTimeout = null;
      const sampleTransactions = [];

      const sleepWellCanvas = document.getElementById("sleep-well-dots");
      const sleepWellContext = sleepWellCanvas.getContext("2d");
      const sleepWellMask = document.createElement("canvas");
      const sleepWellMaskContext = sleepWellMask.getContext("2d", {
        willReadFrequently: true,
      });
      const sleepWellWidth = 420;
      const sleepWellHeight = 96;
      const sleepWellDotSpacing = 6;
      const sleepWellDots = [];
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      let sleepPointerX = -1000;
      let sleepPointerY = -1000;
      let targetSleepPointerX = -1000;
      let targetSleepPointerY = -1000;
      let sleepLensStrength = 0;
      let targetSleepLensStrength = 0;
      let sleepAnimationFrame = null;

      sleepWellCanvas.width = sleepWellWidth;
      sleepWellCanvas.height = sleepWellHeight;
      sleepWellMask.width = sleepWellWidth;
      sleepWellMask.height = sleepWellHeight;
      sleepWellMaskContext.font = "600 57px Arial, sans-serif";
      sleepWellMaskContext.textAlign = "center";
      sleepWellMaskContext.textBaseline = "middle";
      sleepWellMaskContext.fillStyle = "#000";
      sleepWellMaskContext.fillText(
        "Sleep Well",
        sleepWellWidth / 2,
        sleepWellHeight / 2,
      );

      const sleepWellPixels = sleepWellMaskContext.getImageData(
        0,
        0,
        sleepWellWidth,
        sleepWellHeight,
      );

      for (
        let y = sleepWellDotSpacing / 2;
        y < sleepWellHeight;
        y += sleepWellDotSpacing
      ) {
        for (
          let x = sleepWellDotSpacing / 2;
          x < sleepWellWidth;
          x += sleepWellDotSpacing
        ) {
          const pixel = (Math.floor(y) * sleepWellWidth + Math.floor(x)) * 4;
          if (sleepWellPixels.data[pixel + 3] > 100) {
            sleepWellDots.push({ x, y });
          }
        }
      }

      const drawSleepWellDots = () => {
        sleepWellContext.clearRect(0, 0, sleepWellWidth, sleepWellHeight);

        for (const dot of sleepWellDots) {
          const dx = dot.x - sleepPointerX;
          const dy = dot.y - sleepPointerY;
          const distance = Math.hypot(dx, dy);
          const influence = Math.max(0, 1 - distance / 105) * sleepLensStrength;
          const scale = 1 + influence * 0.75;
          const radius = 2.1 * scale;
          const x = sleepPointerX + dx * (1 + influence * 0.18);
          const y = sleepPointerY + dy * (1 + influence * 0.18);

          sleepWellContext.fillStyle = `rgba(51, 91, 143, ${0.62 + influence * 0.34})`;
          sleepWellContext.beginPath();
          sleepWellContext.arc(x, y, radius, 0, Math.PI * 2);
          sleepWellContext.fill();
        }
      };

      const animateSleepWellDots = () => {
        sleepPointerX += (targetSleepPointerX - sleepPointerX) * 0.2;
        sleepPointerY += (targetSleepPointerY - sleepPointerY) * 0.2;
        sleepLensStrength +=
          (targetSleepLensStrength - sleepLensStrength) * 0.16;
        drawSleepWellDots();

        if (
          Math.abs(targetSleepPointerX - sleepPointerX) > 0.2 ||
          Math.abs(targetSleepPointerY - sleepPointerY) > 0.2 ||
          Math.abs(targetSleepLensStrength - sleepLensStrength) > 0.005
        ) {
          sleepAnimationFrame =
            window.requestAnimationFrame(animateSleepWellDots);
        } else {
          sleepPointerX = targetSleepPointerX;
          sleepPointerY = targetSleepPointerY;
          sleepLensStrength = targetSleepLensStrength;
          drawSleepWellDots();
          sleepAnimationFrame = null;
        }
      };

      const requestSleepWellFrame = () => {
        if (sleepAnimationFrame === null) {
          sleepAnimationFrame =
            window.requestAnimationFrame(animateSleepWellDots);
        }
      };

      drawSleepWellDots();

      if (!reduceMotion) {
        window.addEventListener("pointermove", (event) => {
          const bounds = sleepWellCanvas.getBoundingClientRect();
          const pointerInsideWordmark =
            event.clientX >= bounds.left &&
            event.clientX <= bounds.right &&
            event.clientY >= bounds.top &&
            event.clientY <= bounds.bottom;

          targetSleepPointerX = event.clientX - bounds.left;
          targetSleepPointerY = event.clientY - bounds.top;
          targetSleepLensStrength = pointerInsideWordmark ? 1 : 0;
          requestSleepWellFrame();
        });
      }

      const updateBackToTopButton = () => {
        const activePage = document.querySelector(
          ".dashboard-page:not(.hidden)",
        );
        const pageIsLong =
          activePage && activePage.scrollHeight > window.innerHeight * 1.5;
        const shouldShow =
          pageIsLong && window.scrollY > window.innerHeight * 0.5;
        backToTopButton.classList.toggle("invisible", !shouldShow);
        backToTopButton.classList.toggle("visible", shouldShow);
        backToTopButton.classList.toggle("pointer-events-none", !shouldShow);
        backToTopButton.classList.toggle("pointer-events-auto", shouldShow);
        backToTopButton.classList.toggle("translate-y-3", !shouldShow);
        backToTopButton.classList.toggle("translate-y-0", shouldShow);
        backToTopButton.classList.toggle("opacity-0", !shouldShow);
        backToTopButton.classList.toggle("opacity-100", shouldShow);
        backToTopButton.setAttribute("aria-hidden", String(!shouldShow));
        backToTopButton.tabIndex = shouldShow ? 0 : -1;
      };

      window.addEventListener("scroll", updateBackToTopButton, {
        passive: true,
      });
      window.addEventListener("resize", updateBackToTopButton);
      backToTopButton.addEventListener("click", () => {
        window.scrollTo({
          top: 0,
          behavior: reduceMotion ? "auto" : "smooth",
        });
      });

      const setActiveNav = (hash) => {
        const pageHash = [
          "#transactions-page",
          "#budgets-page",
          "#savings-goal-page",
          "#about-page",
          "#reports-page",
        ].includes(hash)
          ? hash
          : hash === "#portfolio-projects"
            ? "#about-page"
            : "#overview";
        const activePageId =
          pageHash === "#overview" ? "overview-page" : pageHash.slice(1);
        const pageTitles = {
          "#overview": "Overview",
          "#transactions-page": "Transactions",
          "#budgets-page": "Budgets",
          "#savings-goal-page": "Savings Goal",
          "#about-page": "About Us",
          "#reports-page": "Reports",
        };
        document.title = `${pageTitles[pageHash]} · Ledger`;
        const pages = [...document.querySelectorAll(".dashboard-page")];
        const previousPage = pages.find(
          (page) => !page.classList.contains("hidden"),
        );
        const nextPage = pages.find((page) => page.id === activePageId);
        const isPageChange = previousPage && previousPage.id !== activePageId;
        const shouldShowLoader =
          isPageChange && nextPage?.dataset.fetching === "true";
        if (shouldShowLoader) {
          window.clearTimeout(pageLoaderTimeout);
          pageLoader.classList.remove("hidden");
          pageLoader.classList.add("flex");
        }
        pages.forEach((page) => {
          page.classList.toggle("hidden", page.id !== activePageId);
        });
        updateBackToTopButton();
        if (
          nextPage &&
          previousPage !== nextPage &&
          !reduceMotion &&
          nextPage.animate
        ) {
          nextPage.animate(
            [
              {
                opacity: 0,
                filter: "blur(3px)",
                transform: "translateY(8px) scale(0.99)",
              },
              {
                opacity: 1,
                filter: "blur(0)",
                transform: "translateY(0) scale(1)",
              },
            ],
            { duration: 230, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
          );
          [...nextPage.children].forEach((item, index) => {
            item.animate(
              [
                { opacity: 0, transform: "translateY(7px)" },
                { opacity: 1, transform: "translateY(0)" },
              ],
              {
                duration: 220,
                delay: Math.min(index * 28, 112),
                easing: "cubic-bezier(0.2, 0.7, 0.3, 1)",
                fill: "backwards",
              },
            );
          });
        }
        if (shouldShowLoader) {
          pageLoaderTimeout = window.setTimeout(() => {
            pageLoader.classList.add("hidden");
            pageLoader.classList.remove("flex");
          }, 320);
        }

        const activeLink = workspaceNavLinks.find(
          (link) => link.getAttribute("href") === pageHash,
        );

        workspaceNavLinks.forEach((link) => {
          const isActive = link === activeLink;
          link.classList.toggle("bg-sky-50", isActive);
          link.classList.toggle("text-sky-700", isActive);
          link.classList.toggle("font-semibold", isActive);
          link.classList.toggle("text-slate-500", !isActive);
          link.classList.toggle("font-medium", !isActive);
          if (isActive) {
            link.setAttribute("aria-current", "page");
          } else {
            link.removeAttribute("aria-current");
          }
        });

        document.querySelectorAll(".dashboard-tab").forEach((link) => {
          const isActive = link.getAttribute("href") === pageHash;
          link.classList.toggle("bg-sky-50", isActive);
          link.classList.toggle("text-sky-700", isActive);
          link.classList.toggle("font-semibold", isActive);
          link.classList.toggle("shadow-sm", isActive);
          link.classList.toggle("text-slate-500", !isActive);
          link.classList.toggle("font-medium", !isActive);
          if (isActive) link.setAttribute("aria-current", "page");
          else link.removeAttribute("aria-current");
        });
      };

      const money = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      });

      const showToast = (message, type = "success") => {
        window.clearTimeout(toastTimeout);
        toastRegion.replaceChildren();

        const toast = document.createElement("div");
        const indicator = document.createElement("span");
        const text = document.createElement("p");
        const close = document.createElement("button");
        const isWarning = type !== "success";
        const isDanger = type === "danger";
        toast.className = `toast-enter pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-xl shadow-slate-900/10 ${isDanger ? "border-rose-200" : isWarning ? "border-amber-200" : "border-emerald-200"}`;
        toast.setAttribute("role", isWarning ? "alert" : "status");
        indicator.className = `mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${isDanger ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"}`;
        indicator.setAttribute("aria-hidden", "true");
        text.className =
          "min-w-0 flex-1 text-sm font-medium leading-5 text-slate-700";
        text.textContent = message;
        close.type = "button";
        close.className =
          "-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700";
        close.setAttribute("aria-label", "Dismiss notification");
        close.textContent = "×";
        close.addEventListener("click", () => {
          window.clearTimeout(toastTimeout);
          toast.remove();
        });
        toast.append(indicator, text, close);
        toastRegion.append(toast);
        toastTimeout = window.setTimeout(() => toast.remove(), 5200);
      };

      const updateBudgetStatus = () => {
        const usage = (totalExpenses / budgetLimit) * 100;
        const progress = document.getElementById("sidebar-budget-progress");
        const usageLabel = document.getElementById("sidebar-budget-usage");
        const warning = document.getElementById("sidebar-budget-warning");
        const spent = document.getElementById("budget-page-spent");
        const remaining = document.getElementById("budget-page-remaining");

        document.getElementById("sidebar-budget-total").textContent = money.format(budgetLimit);
        document.getElementById("budget-page-limit").textContent = money.format(budgetLimit);
        usageLabel.textContent = `${Math.round(usage)}% of your plan used`;
        progress.style.width = `${Math.min(usage, 100)}%`;
        progress.classList.toggle("bg-sky-500", usage < 80);
        progress.classList.toggle("bg-amber-500", usage >= 80 && usage <= 100);
        progress.classList.toggle("bg-rose-500", usage > 100);
        spent.textContent = money.format(totalExpenses);
        remaining.textContent = money.format(
          Math.max(0, budgetLimit - totalExpenses),
        );

        if (totalExpenses > budgetLimit) {
          warning.textContent = `${money.format(totalExpenses - budgetLimit)} over budget`;
          warning.classList.remove("hidden", "text-amber-700");
          warning.classList.add("text-rose-700");
          return "over";
        }
        if (usage >= 80) {
          warning.textContent = "You're getting close to your limit";
          warning.classList.remove("hidden", "text-rose-700");
          warning.classList.add("text-amber-700");
          return "near";
        }
        warning.textContent = "";
        warning.classList.add("hidden");
        warning.classList.remove("text-amber-700", "text-rose-700");
        return "safe";
      };

      const formatLocalDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const parseLocalDate = (value) => new Date(`${value}T12:00:00`);

      const addMonths = (date, months) => {
        const result = new Date(date);
        const day = result.getDate();
        result.setDate(1);
        result.setMonth(result.getMonth() + months);
        const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
        result.setDate(Math.min(day, lastDay));
        return result;
      };

      const buildMonthlySampleDeposits = (totalAmount, startDate, throughDate) => {
        const months = [];
        const monthCursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const lastMonth = new Date(throughDate.getFullYear(), throughDate.getMonth(), 1);
        while (monthCursor <= lastMonth) {
          const isCurrentMonth = monthCursor.getFullYear() === throughDate.getFullYear() &&
            monthCursor.getMonth() === throughDate.getMonth();
          months.push(new Date(
            monthCursor.getFullYear(),
            monthCursor.getMonth(),
            isCurrentMonth ? Math.min(10, throughDate.getDate()) : 10,
          ));
          monthCursor.setMonth(monthCursor.getMonth() + 1);
        }
        if (!months.length || totalAmount <= 0) return [];

        const weights = months.map((date, index) => {
          const yearlyAmountFactor = date.getFullYear() === throughDate.getFullYear() ? 1.25 : 0.75;
          return [0.65, 1.15, 0.8, 1.35, 0.7, 1.5, 0.9, 1.2, 0.75, 1.4, 0.85, 1.05][index % 12] * yearlyAmountFactor;
        });
        const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
        let allocatedCents = 0;
        return months.map((date, index) => {
          const cents = index === months.length - 1
            ? Math.round(totalAmount * 100) - allocatedCents
            : Math.round((totalAmount * 100 * weights[index]) / weightTotal);
          allocatedCents += cents;
          return { amount: cents / 100, date: formatLocalDate(date), type: "scheduled" };
        }).filter((deposit) => deposit.amount > 0);
      };

      const displayDate = (date) => new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date);

      const getMonthlyContribution = () => {
        const amountChoice = document.getElementById("goal-monthly-amount").value;
        if (amountChoice === "custom") {
          return Number(document.getElementById("goal-custom-amount").value);
        }
        return Number(amountChoice);
      };

      const calculateAverageMonthlySurplus = () => {
        const monthTotals = new Map();
        sampleTransactions.forEach((transaction) => {
          const monthKey = transaction.date.slice(0, 7);
          const totals = monthTotals.get(monthKey) || { income: 0, expenses: 0 };
          if (transaction.amount > 0) totals.income += transaction.amount;
          else totals.expenses += Math.abs(transaction.amount);
          monthTotals.set(monthKey, totals);
        });
        if (!monthTotals.size) return 0;
        const totalSurplus = [...monthTotals.values()].reduce(
          (sum, month) => sum + month.income - month.expenses,
          0,
        );
        return totalSurplus / monthTotals.size;
      };

      const calculateGoalProjection = (targetAmount, monthlyAmount, savedAmount, firstTransferDate, targetDate) => {
        const remaining = Math.max(0, targetAmount - savedAmount);
        const transferStart = new Date(firstTransferDate);
        const monthsNeeded = monthlyAmount > 0
          ? Math.ceil(remaining / monthlyAmount)
          : Infinity;
        const estimatedDate = monthsNeeded === 0
          ? new Date()
          : Number.isFinite(monthsNeeded)
            ? addMonths(transferStart, Math.max(0, monthsNeeded - 1))
            : null;
        let requiredMonthlyAmount = null;
        let depositsBeforeDeadline = 0;
        if (targetDate) {
          const deadline = parseLocalDate(targetDate);
          let transferDate = new Date(transferStart);
          while (transferDate <= deadline && depositsBeforeDeadline < 1200) {
            depositsBeforeDeadline += 1;
            transferDate = addMonths(transferDate, 1);
          }
          if (depositsBeforeDeadline > 0) {
            requiredMonthlyAmount = Math.ceil(remaining / depositsBeforeDeadline);
          }
        }
        return { remaining, monthsNeeded, estimatedDate, requiredMonthlyAmount, depositsBeforeDeadline };
      };

      const updateSavingsPlanPreview = () => {
        const message = document.getElementById("goal-capacity-message");
        const monthlyAmount = getMonthlyContribution();
        const targetAmount = Number(document.getElementById("goal-price").value);
        const targetDate = document.getElementById("goal-deadline").value;
        const customAmountWrap = document.getElementById("goal-custom-amount-wrap");
        customAmountWrap.classList.toggle(
          "hidden",
          document.getElementById("goal-monthly-amount").value !== "custom",
        );
        if (!financialDataReady || !Number.isFinite(monthlyAmount) || monthlyAmount <= 0) {
          message.classList.add("hidden");
          return;
        }
        if (monthlyAmount < 850) {
          message.textContent = "The monthly contribution must be at least $850 for this savings plan.";
          message.className = "rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800";
          return;
        }

        const notes = [];
        if (monthlyAmount > averageMonthlySurplus) {
          notes.push(`This is above your estimated average monthly surplus of ${money.format(averageMonthlySurplus)}. You may need to reduce expenses or choose a lower amount.`);
        } else {
          notes.push(`This fits within your estimated average monthly surplus of ${money.format(averageMonthlySurplus)}.`);
        }
        if (targetAmount > 0 && targetDate) {
          const nextTransfer = activeSavingsGoal?.nextTransferDate
            ? parseLocalDate(activeSavingsGoal.nextTransferDate)
            : addMonths(new Date(), 1);
          const projection = calculateGoalProjection(
            targetAmount,
            monthlyAmount,
            activeSavingsGoal?.savedAmount || 0,
            nextTransfer,
            targetDate,
          );
          if (projection.requiredMonthlyAmount === null) {
            notes.push("That deadline is too soon for a monthly transfer to reach the target.");
          } else {
            notes.push(`To meet that date, plan for about ${money.format(projection.requiredMonthlyAmount)} per month over ${projection.depositsBeforeDeadline} transfer${projection.depositsBeforeDeadline === 1 ? "" : "s"}.`);
            if (monthlyAmount < projection.requiredMonthlyAmount) {
              notes.push("Your selected monthly amount would reach the goal after the desired date.");
            }
          }
        }
        message.textContent = notes.join(" ");
        message.className = `rounded-xl border px-3 py-2.5 text-sm ${monthlyAmount > averageMonthlySurplus ? "border-amber-200 bg-amber-50 text-amber-800" : "border-sky-100 bg-sky-50 text-sky-800"}`;
      };

      const persistSavingsGoal = () => {
        try {
          if (activeSavingsGoal) {
            localStorage.setItem("ledger-savings-goal", JSON.stringify(activeSavingsGoal));
          } else {
            localStorage.removeItem("ledger-savings-goal");
          }
        } catch (storageError) {
          console.warn("Savings goal could not be saved in browser storage.", storageError);
        }
      };

      const persistSavingsGoalHistory = () => {
        try {
          localStorage.setItem("ledger-savings-goal-history", JSON.stringify(savingsGoalHistory));
        } catch (storageError) {
          console.warn("Savings goal history could not be saved in browser storage.", storageError);
        }
      };

      const renderSavingsGoalHistory = () => {
        const list = document.getElementById("goal-history-list");
        const empty = document.getElementById("goal-history-empty");
        if (!list || !empty) return;
        list.replaceChildren();
        empty.classList.toggle("hidden", savingsGoalHistory.length > 0);
        const latestChange = [...savingsGoalHistory].reverse().find((entry) => !entry.rolledBack);
        [...savingsGoalHistory].reverse().forEach((entry) => {
          const row = document.createElement("li");
          row.className = "flex flex-col gap-3 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between";
          const detail = document.createElement("div");
          const title = document.createElement("p");
          title.className = "text-sm font-semibold text-slate-800";
          title.textContent = `${entry.action === "cancelled" ? "Canceled" : "Restarted"}: ${entry.goal.name}`;
          const description = document.createElement("p");
          description.className = "mt-1 text-xs leading-5 text-slate-500";
          description.textContent = `${money.format(entry.refundAmount)} returned to balance on ${displayDate(parseLocalDate(entry.date))}`;
          detail.append(title, description);
          const action = document.createElement("button");
          action.type = "button";
          action.dataset.goalHistoryUndo = entry.id;
          action.className = "shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50";
          action.textContent = entry.rolledBack
            ? "Undone"
            : entry.id === latestChange?.id
              ? "Undo change"
              : "Undo newer first";
          action.disabled = Boolean(entry.rolledBack) || entry.id !== latestChange?.id;
          row.append(detail, action);
          list.append(row);
        });
      };

      const updateAccountBalance = (persist = true) => {
        document.getElementById("account-balance").textContent = money.format(accountBalance);
        if (!persist) return;
        try {
          localStorage.setItem("ledger-account-balance", String(accountBalance));
        } catch (storageError) {
          console.warn("Account balance could not be saved in browser storage.", storageError);
        }
      };

      const renderSavingsGoal = () => {
        const emptyState = document.getElementById("goal-empty-state");
        const details = document.getElementById("goal-plan-details");
        const heading = document.getElementById("goal-progress-heading");
        const badge = document.getElementById("goal-status-badge");
        const sampleNotice = document.getElementById("goal-sample-notice");
        const form = document.getElementById("savings-goal-form");
        const openButton = document.getElementById("goal-open-dialog");
        if (!activeSavingsGoal) {
          emptyState.classList.remove("hidden");
          details.classList.add("hidden");
          heading.textContent = "No savings goal yet";
          badge.classList.add("hidden");
          sampleNotice.classList.add("hidden");
          openButton.textContent = "Create a savings goal";
          form.reset();
          renderSavingsGoalHistory();
          updateSavingsPlanPreview();
          return;
        }

        document.getElementById("goal-name").value = activeSavingsGoal.name;
        document.getElementById("goal-price").value = activeSavingsGoal.targetAmount;
        document.getElementById("goal-deadline").value = activeSavingsGoal.targetDate || "";
        document.getElementById("goal-auto-transfer").checked = activeSavingsGoal.autoTransfer;
        const standardAmounts = [850, 1000, 1200];
        const amountSelect = document.getElementById("goal-monthly-amount");
        if (standardAmounts.includes(activeSavingsGoal.monthlyContribution)) {
          amountSelect.value = String(activeSavingsGoal.monthlyContribution);
        } else {
          amountSelect.value = "custom";
          document.getElementById("goal-custom-amount").value = activeSavingsGoal.monthlyContribution;
        }

        const savedAmount = Math.max(0, Number(activeSavingsGoal.savedAmount) || 0);
        activeSavingsGoal.deposits = Array.isArray(activeSavingsGoal.deposits)
          ? activeSavingsGoal.deposits.filter((deposit) =>
              Number.isFinite(Number(deposit.amount)) &&
              Number(deposit.amount) > 0 &&
              typeof deposit.date === "string" &&
              Number.isFinite(parseLocalDate(deposit.date).getTime()),
            )
          : [];
        const deposits = activeSavingsGoal.deposits;
        const startDate = activeSavingsGoal.startDate || deposits[0]?.date || formatLocalDate(new Date());
        const timelineStart = parseLocalDate(startDate);
        const today = new Date();
        const elapsedMonths = Math.max(
          0,
          (today.getFullYear() - timelineStart.getFullYear()) * 12 +
            today.getMonth() - timelineStart.getMonth() -
            (today.getDate() < timelineStart.getDate() ? 1 : 0),
        );
        const monthYearFormatter = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" });
        const elapsedYears = elapsedMonths / 12;
        document.getElementById("goal-timeline-duration").textContent = elapsedMonths >= 12
          ? `${elapsedYears.toFixed(1)} years`
          : `${elapsedMonths} month${elapsedMonths === 1 ? "" : "s"}`;
        document.getElementById("goal-timeline-dates").textContent = `${monthYearFormatter.format(timelineStart)} - ${monthYearFormatter.format(today)}`;
        const averageDeposit = deposits.length
          ? deposits.reduce((sum, deposit) => sum + Number(deposit.amount), 0) / deposits.length
          : 0;
        const extraDeposits = deposits.filter((deposit) => deposit.type === "extra");
        const extraTotal = extraDeposits.reduce((sum, deposit) => sum + Number(deposit.amount), 0);
        openButton.textContent = "Edit savings goal";
        const targetAmount = Number(activeSavingsGoal.targetAmount) || 0;
        const completed = targetAmount > 0 && savedAmount >= targetAmount;
        sampleNotice.classList.toggle("hidden", !activeSavingsGoal.isSample);
        if (activeSavingsGoal.isSample && !activeSavingsGoal.sampleHistoryAvailable) {
          sampleNotice.textContent = "Sample plan: RTX 5090 at $4,200 with an $850 monthly minimum. The available balance was below $3,700, so no demo deposits were added. Create deposits from your own balance or edit the plan.";
        } else if (activeSavingsGoal.isSample) {
          const sampleDates = activeSavingsGoal.deposits
            .map((deposit) => deposit.date)
            .sort();
          const latestSampleDate = sampleDates[sampleDates.length - 1];
          const latestMonth = latestSampleDate
            ? new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(parseLocalDate(latestSampleDate))
            : "the current month";
          sampleNotice.textContent = `Sample plan: RTX 5090 at $4,200 with an $850 monthly minimum. Sample deposits span April 2025 through ${latestMonth}, with a varied deposit for each month. The goal has been active for about ${elapsedYears.toFixed(1)} years; ${money.format(Math.max(0, targetAmount - savedAmount))} remains to reach the target.`;
        }
        const nextTransferDate = activeSavingsGoal.nextTransferDate
          ? parseLocalDate(activeSavingsGoal.nextTransferDate)
          : addMonths(new Date(), 1);
        const projection = calculateGoalProjection(
          targetAmount,
          Number(activeSavingsGoal.monthlyContribution),
          savedAmount,
          nextTransferDate,
          activeSavingsGoal.targetDate,
        );
        emptyState.classList.add("hidden");
        details.classList.remove("hidden");
        heading.textContent = activeSavingsGoal.name;
        badge.textContent = completed ? "Goal funded" : activeSavingsGoal.autoTransfer ? "Auto-saving" : "Manual plan";
        badge.className = `rounded-full px-3 py-1 text-xs font-semibold ${completed ? "bg-emerald-100 text-emerald-700" : activeSavingsGoal.autoTransfer ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-600"}`;
        document.getElementById("goal-saved-amount").textContent = money.format(savedAmount);
        document.getElementById("goal-monthly-summary").textContent = money.format(activeSavingsGoal.monthlyContribution);
        document.getElementById("goal-average-deposit").textContent = money.format(averageDeposit);
        document.getElementById("goal-deposit-count").textContent = `${deposits.length} recorded deposit${deposits.length === 1 ? "" : "s"}`;
        document.getElementById("goal-extra-total").textContent = money.format(extraTotal);
        document.getElementById("goal-deposit-stat-note").textContent = deposits.length
          ? `Average across ${deposits.length} scheduled and extra deposits`
          : "Average begins after the next recorded deposit";
        const depositHistory = document.getElementById("goal-deposit-history");
        depositHistory.replaceChildren();
        const recentDeposits = [...deposits].reverse();
        if (!recentDeposits.length) {
          const emptyRow = document.createElement("li");
          emptyRow.className = "text-slate-500";
          emptyRow.textContent = "No deposits recorded for this goal yet.";
          depositHistory.append(emptyRow);
        } else {
          recentDeposits.forEach((deposit) => {
            const row = document.createElement("li");
            row.className = "flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2";
            const typeLabel = document.createElement("span");
            typeLabel.className = "text-slate-600";
            typeLabel.textContent = deposit.type === "extra" ? "Extra deposit" : "Scheduled deposit";
            const value = document.createElement("span");
            value.className = "text-right font-semibold text-slate-800";
            value.textContent = `${money.format(Number(deposit.amount))} - ${displayDate(parseLocalDate(deposit.date))}`;
            row.append(typeLabel, value);
            depositHistory.append(row);
          });
        }
        window.renderSavingsDepositChart?.(
          document.getElementById("goal-deposit-chart"),
          deposits,
          (amount) => money.format(amount),
          startDate,
          targetAmount,
          savedAmount,
        );
        const progressPercent = targetAmount ? Math.min(100, (savedAmount / targetAmount) * 100) : 0;
        document.getElementById("goal-progress-label").textContent = `${progressPercent.toFixed(0)}%`;
        document.getElementById("goal-progress-bar").style.width = `${progressPercent}%`;
        document.getElementById("goal-target-caption").textContent = `${money.format(savedAmount)} of ${money.format(targetAmount)} saved`;
        document.getElementById("goal-estimated-date").textContent = completed
          ? "Ready to purchase"
          : projection.estimatedDate
            ? displayDate(projection.estimatedDate)
            : "Choose a monthly amount";
        document.getElementById("goal-next-transfer").textContent = completed
          ? "Goal funded"
          : activeSavingsGoal.autoTransfer
            ? displayDate(nextTransferDate)
            : "Automatic transfer is off";
        const deadlineAnalysis = document.getElementById("goal-deadline-analysis");
        if (activeSavingsGoal.targetDate) {
          deadlineAnalysis.textContent = projection.requiredMonthlyAmount === null
            ? `Desired date: ${displayDate(parseLocalDate(activeSavingsGoal.targetDate))}. The first planned transfer is after that date.`
            : `To reach this goal by ${displayDate(parseLocalDate(activeSavingsGoal.targetDate))}, save about ${money.format(projection.requiredMonthlyAmount)} each month. Your selected amount is ${money.format(activeSavingsGoal.monthlyContribution)}.`;
        } else {
          deadlineAnalysis.textContent = "No desired date set. The estimated date is based on your selected monthly transfer.";
        }
        document.getElementById("goal-surplus-analysis").textContent = `Estimated average monthly surplus: ${money.format(averageMonthlySurplus)}`;
        renderSavingsGoalHistory();
        updateSavingsPlanPreview();
      };

      const processDueSavingsTransfers = () => {
        if (!activeSavingsGoal?.autoTransfer || !financialDataReady) return;
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        let transferred = 0;
        let completed = false;
        let dueDate = parseLocalDate(activeSavingsGoal.nextTransferDate);
        while (
          dueDate <= today &&
          activeSavingsGoal.savedAmount < activeSavingsGoal.targetAmount
        ) {
          const amount = Math.min(
            activeSavingsGoal.monthlyContribution,
            activeSavingsGoal.targetAmount - activeSavingsGoal.savedAmount,
          );
          if (accountBalance < amount) {
            const todayKey = formatLocalDate(new Date());
            if (lastSavingsTransferWarningDate !== todayKey) {
              showToast(`Automatic savings transfer skipped. Your available balance is ${money.format(accountBalance)}, below the planned ${money.format(amount)} deposit.`, "warning");
              lastSavingsTransferWarningDate = todayKey;
            }
            break;
          }
          accountBalance -= amount;
          activeSavingsGoal.savedAmount += amount;
          activeSavingsGoal.deposits = Array.isArray(activeSavingsGoal.deposits)
            ? activeSavingsGoal.deposits
            : [];
          activeSavingsGoal.deposits.push({
            amount,
            date: formatLocalDate(dueDate),
            type: "scheduled",
          });
          transferred += amount;
          dueDate = addMonths(dueDate, 1);
          activeSavingsGoal.nextTransferDate = formatLocalDate(dueDate);
          if (activeSavingsGoal.savedAmount >= activeSavingsGoal.targetAmount) {
            activeSavingsGoal.autoTransfer = false;
            completed = true;
          }
        }
        if (!transferred) return;
        updateAccountBalance();
        persistSavingsGoal();
        renderSavingsGoal();
        showToast(
          completed
            ? `${money.format(transferred)} transferred. Your ${activeSavingsGoal.name} goal is fully funded.`
            : `${money.format(transferred)} transferred to your ${activeSavingsGoal.name} goal.`,
          "success",
        );
      };

      const rowsPerPage = 15;
      let transactionHistoryPage = 1;
      let reportTransactionsPage = 1;
      const renderTablePagination = (
        container,
        totalRows,
        currentPage,
        onPageChange,
      ) => {
        const pageCount = Math.ceil(totalRows / rowsPerPage);
        container.replaceChildren();
        container.classList.toggle("hidden", pageCount <= 1);
        container.classList.toggle("flex", pageCount > 1);
        if (pageCount <= 1) return;

        const status = document.createElement("span");
        status.className = "rounded-lg border border-sky-100 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm sm:text-sm";
        status.setAttribute("aria-live", "polite");
        status.textContent = `Showing ${(currentPage - 1) * rowsPerPage + 1}–${Math.min(currentPage * rowsPerPage, totalRows)} of ${totalRows}`;
        const buttons = document.createElement("div");
        buttons.className = "flex items-center gap-1.5";
        const makeButton = (label, page, disabled, active = false) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = active
            ? "grid h-9 min-w-9 place-items-center rounded-lg border border-sky-600 bg-sky-600 px-2 text-xs font-bold text-white shadow-sm shadow-sky-600/20"
            : "grid h-9 min-w-9 place-items-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40";
          button.textContent = label;
          button.disabled = disabled;
          if (active) button.setAttribute("aria-current", "page");
          button.addEventListener("click", () => onPageChange(page));
          return button;
        };
        buttons.append(makeButton("‹", currentPage - 1, currentPage === 1));
        for (let page = 1; page <= pageCount; page += 1) {
          buttons.append(makeButton(String(page), page, false, page === currentPage));
        }
        buttons.append(makeButton("›", currentPage + 1, currentPage === pageCount));
        container.append(status, buttons);
      };

      const renderTransactionHistory = (
        month = transactionMonthFilter.value,
      ) => {
        const transactions = sampleTransactions
          .filter(
            (transaction) => month === "all" || transaction.month === month,
          )
          .sort((first, second) => second.date.localeCompare(first.date));
        const income = transactions
          .filter((transaction) => transaction.amount > 0)
          .reduce((sum, transaction) => sum + transaction.amount, 0);
        const expenses = transactions
          .filter((transaction) => transaction.amount < 0)
          .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
        const net = income - expenses;

        transactionIncomeSummary.textContent = money.format(income);
        transactionExpenseSummary.textContent = money.format(expenses);
        transactionNetSummary.textContent = `${net >= 0 ? "+" : "−"}${money.format(Math.abs(net))}`;
        allTransactionsList.replaceChildren();
        transactionHistoryPage = Math.min(
          transactionHistoryPage,
          Math.max(1, Math.ceil(transactions.length / rowsPerPage)),
        );
        renderTablePagination(
          transactionHistoryPagination,
          transactions.length,
          transactionHistoryPage,
          (page) => {
            transactionHistoryPage = page;
            renderTransactionHistory(month);
          },
        );

        if (!transactions.length) {
          const row = document.createElement("tr");
          const cell = document.createElement("td");
          cell.className = "px-5 py-8 text-center text-sm text-slate-400";
          cell.colSpan = 4;
          cell.textContent = "No sample transactions for this month.";
          row.append(cell);
          allTransactionsList.append(row);
          return;
        }

        const visibleTransactions = transactions.slice(
          (transactionHistoryPage - 1) * rowsPerPage,
          transactionHistoryPage * rowsPerPage,
        );
        visibleTransactions.forEach((transaction) => {
          const row = document.createElement("tr");
          const name = document.createElement("td");
          const category = document.createElement("td");
          const date = document.createElement("td");
          const amount = document.createElement("td");
          const transactionDate = new Date(`${transaction.date}T12:00:00`);
          name.className = "px-5 py-4 font-medium text-slate-800";
          category.className = "px-5 py-4 text-slate-500";
          date.className = "px-5 py-4 text-slate-500";
          amount.className = `px-5 py-4 text-right font-semibold ${transaction.amount > 0 ? "text-emerald-600" : "text-slate-800"}`;
          name.textContent = transaction.name;
          category.textContent = transaction.category;
          date.textContent = new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          }).format(transactionDate);
          amount.textContent = `${transaction.amount > 0 ? "+" : "−"}${money.format(Math.abs(transaction.amount))}`;
          row.append(name, category, date, amount);
          allTransactionsList.append(row);
        });
      };

      let selectedReportMonth = "all";
      const renderReportTransactions = (month = selectedReportMonth) => {
        const monthNames = {
          Jun: "June",
          Jul: "July",
          Aug: "August",
          Sep: "September",
          Oct: "October",
          Nov: "November",
        };
        const transactions = sampleTransactions
          .filter(
            (transaction) => month === "all" || transaction.month === month,
          )
          .sort((first, second) => second.date.localeCompare(first.date));
        document
          .querySelectorAll(".cash-flow-chart > [data-month]")
          .forEach((column) => {
            const isSelected =
              month !== "all" && column.dataset.month === month;
            column.classList.toggle("is-selected", isSelected);
            column.querySelectorAll("[data-tooltip]").forEach((bar) => {
              bar.setAttribute("aria-pressed", String(isSelected));
            });
          });
        const monthInstruction = document.getElementById(
          "cash-flow-instruction",
        );
        monthInstruction.textContent =
          month === "all"
            ? "Select a month bar to explore its transactions"
            : `${monthNames[month]} selected · click another month to switch`;
        reportTableHeading.textContent =
          month === "all"
            ? "All sample transactions"
            : `${monthNames[month]} 2026 transactions`;
        reportTransactionsList.replaceChildren();
        reportTransactionsPage = Math.min(
          reportTransactionsPage,
          Math.max(1, Math.ceil(transactions.length / rowsPerPage)),
        );
        renderTablePagination(
          reportTransactionsPagination,
          transactions.length,
          reportTransactionsPage,
          (page) => {
            reportTransactionsPage = page;
            renderReportTransactions(month);
          },
        );

        const categoryTotals = new Map();
        let selectedExpenses = 0;
        transactions.forEach((transaction) => {
          if (transaction.amount < 0) {
            const amount = Math.abs(transaction.amount);
            selectedExpenses += amount;
            categoryTotals.set(
              transaction.category,
              (categoryTotals.get(transaction.category) || 0) + amount,
            );
          }
        });
        document.getElementById("category-period-label").textContent =
          month === "all" ? "All months" : monthNames[month];
        renderSpendingCategories(categoryTotals, selectedExpenses);

        if (!transactions.length) {
          const row = document.createElement("tr");
          const cell = document.createElement("td");
          cell.className = "px-5 py-8 text-center text-sm text-slate-400";
          cell.colSpan = 4;
          cell.textContent = "No sample transactions for this month.";
          row.append(cell);
          reportTransactionsList.append(row);
          return;
        }

        const visibleReportTransactions = transactions.slice(
          (reportTransactionsPage - 1) * rowsPerPage,
          reportTransactionsPage * rowsPerPage,
        );
        visibleReportTransactions.forEach((transaction) => {
          const row = document.createElement("tr");
          const name = document.createElement("td");
          const category = document.createElement("td");
          const date = document.createElement("td");
          const amount = document.createElement("td");
          name.className = "px-5 py-4 font-medium text-slate-800";
          category.className = "px-5 py-4 text-slate-500";
          date.className = "px-5 py-4 text-slate-500";
          amount.className = `px-5 py-4 text-right font-semibold ${transaction.amount > 0 ? "text-emerald-600" : "text-slate-800"}`;
          name.textContent = transaction.name;
          category.textContent = transaction.category;
          date.textContent = new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          }).format(new Date(`${transaction.date}T12:00:00`));
          amount.textContent = `${transaction.amount > 0 ? "+" : "-"}${money.format(Math.abs(transaction.amount))}`;
          row.append(name, category, date, amount);
          reportTransactionsList.append(row);
        });
      };

      const updateReportingPeriod = () => {
        const period = periodSelect.value;
        const monthForPeriod = {
          "this-month": "Nov",
          "last-month": "Oct",
        };
        const selectedTransactions = sampleTransactions.filter(
          (transaction) => {
            if (period === "this-year")
              return transaction.date.startsWith("2026-");
            return transaction.month === monthForPeriod[period];
          },
        );
        const monthNames = {
          Jun: "June",
          Jul: "July",
          Aug: "August",
          Sep: "September",
          Oct: "October",
          Nov: "November",
        };
        const selectedMonths = new Set(
          selectedTransactions.map((transaction) => transaction.month),
        );
        const income = selectedTransactions
          .filter((transaction) => transaction.amount > 0)
          .reduce((sum, transaction) => sum + transaction.amount, 0);
        const expenses = selectedTransactions
          .filter((transaction) => transaction.amount < 0)
          .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
        const net = income - expenses;
        const caption =
          period === "this-year"
            ? "June-November 2026 sample data"
            : `${monthNames[monthForPeriod[period]]} 2026 sample data`;

        incomeTotal.textContent = money.format(income);
        expenseTotal.textContent = money.format(expenses);
        savingsRate.textContent = `${income ? ((net / income) * 100).toFixed(1) : "0.0"}%`;
        document.getElementById("income-period-caption").textContent = caption;
        document.getElementById("expense-period-caption").textContent = caption;
        document.getElementById("savings-period-caption").textContent = caption;
        document
          .querySelectorAll(".cash-flow-chart > div")
          .forEach((monthColumn) => {
            monthColumn.hidden = !selectedMonths.has(monthColumn.dataset.month);
          });
        if (
          selectedReportMonth !== "all" &&
          !selectedMonths.has(selectedReportMonth)
        ) {
          selectedReportMonth = "all";
          reportTransactionsPage = 1;
          renderReportTransactions();
        }
      };

      const renderRecentTransactions = () => {
        transactionList.replaceChildren();
        const recentTransactions = [...sampleTransactions]
          .sort((first, second) => second.date.localeCompare(first.date))
          .slice(0, 5);
        recentTransactions.forEach((transaction) => {
          const row = document.createElement("tr");
          const name = document.createElement("td");
          const category = document.createElement("td");
          const date = document.createElement("td");
          const amount = document.createElement("td");
          name.className = "px-6 py-4 font-medium text-slate-800";
          category.className = "px-4 py-4 text-slate-500";
          date.className = "px-4 py-4 text-slate-500";
          amount.className = `px-6 py-4 text-right font-semibold ${transaction.amount > 0 ? "text-emerald-600" : "text-slate-800"}`;
          name.textContent = transaction.name;
          category.textContent = transaction.category;
          date.textContent = new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "2-digit",
            year: "numeric",
          }).format(new Date(`${transaction.date}T12:00:00`));
          amount.textContent = `${transaction.amount > 0 ? "+" : "−"}${money.format(Math.abs(transaction.amount))}`;
          row.append(name, category, date, amount);
          transactionList.append(row);
        });
      };

      const renderCashFlowChart = () => {
        const columns = [...document.querySelectorAll(".cash-flow-chart > [data-month]")];
        const totals = new Map(
          columns.map((column) => [column.dataset.month, { income: 0, expenses: 0 }]),
        );
        sampleTransactions.forEach((transaction) => {
          const monthTotals = totals.get(transaction.month);
          if (!monthTotals) return;
          if (transaction.amount > 0) monthTotals.income += transaction.amount;
          else monthTotals.expenses += Math.abs(transaction.amount);
        });
        const average = { income: 0, expenses: 0 };
        totals.forEach((value) => {
          average.income += value.income;
          average.expenses += value.expenses;
        });
        const monthCount = Math.max(totals.size, 1);
        average.income /= monthCount;
        average.expenses /= monthCount;
        const maximum = {
          income: Math.max(...[...totals.values()].map((value) => value.income), 1),
          expenses: Math.max(...[...totals.values()].map((value) => value.expenses), 1),
        };
        const monthNames = {
          Jun: "June", Jul: "July", Aug: "August", Sep: "September", Oct: "October", Nov: "November",
        };

        columns.forEach((column) => {
          const month = column.dataset.month;
          const monthTotals = totals.get(month);
          column.querySelectorAll("[data-tooltip]").forEach((bar) => {
            const series = bar.dataset.series;
            const amount = monthTotals[series];
            const percent = average[series]
              ? Math.round((amount / average[series]) * 100)
              : 0;
            const label = series === "expenses" ? "Expenses" : "Income";
            bar.style.height = `${amount ? Math.max(5, (amount / maximum[series]) * 100) : 0}%`;
            bar.dataset.tooltip = `${label}: ${money.format(amount)}\n${percent}% of 6-month average`;
            bar.setAttribute(
              "aria-label",
              `${monthNames[month]} ${label.toLowerCase()} ${money.format(amount)}, ${percent} percent of 6-month average. Select to view ${month} transactions.`,
            );
          });
        });
      };

      const renderSpendingCategories = (categoryTotals, selectedExpenses) => {
        const container = document.getElementById("category-spending-list");
        const colors = {
          "sky-500": { dot: "bg-sky-500", bar: "bg-sky-500" },
          "indigo-400": { dot: "bg-indigo-400", bar: "bg-indigo-400" },
          "amber-400": { dot: "bg-amber-400", bar: "bg-amber-400" },
          "emerald-400": { dot: "bg-emerald-400", bar: "bg-emerald-400" },
          "violet-400": { dot: "bg-violet-400", bar: "bg-violet-400" },
          "slate-400": { dot: "bg-slate-400", bar: "bg-slate-400" },
        };
        container.replaceChildren();
        financialCategories.forEach((category) => {
          const total = categoryTotals.get(category.name) || 0;
          const color = colors[category.color] || colors["slate-400"];
          const row = document.createElement("div");
          const summary = document.createElement("div");
          const label = document.createElement("span");
          const dot = document.createElement("i");
          const totalLabel = document.createElement("span");
          const track = document.createElement("div");
          const progress = document.createElement("div");
          row.className = "category-row";
          row.dataset.category = category.name;
          summary.className = "mb-2 flex items-center justify-between text-sm";
          label.className = "flex items-center gap-2 text-slate-600";
          dot.className = `h-2.5 w-2.5 rounded-full ${color.dot}`;
          dot.setAttribute("aria-hidden", "true");
          label.append(dot, document.createTextNode(category.name));
          totalLabel.className = "category-total font-semibold text-slate-800";
          totalLabel.textContent = money.format(total);
          track.className = "h-1.5 rounded-full bg-slate-100";
          progress.className = `category-progress h-1.5 rounded-full ${color.bar}`;
          progress.style.width = `${selectedExpenses ? (total / selectedExpenses) * 100 : 0}%`;
          summary.append(label, totalLabel);
          track.append(progress);
          row.append(summary, track);
          container.append(row);
        });
      };

      const renderExpenseCategories = () => {
        const select = document.getElementById("expense-category");
        const selected = select.value;
        select.replaceChildren();
        financialCategories.forEach((category) => {
          const option = document.createElement("option");
          option.value = category.name;
          option.textContent = category.name;
          select.append(option);
        });
        if (financialCategories.some((category) => category.name === selected)) {
          select.value = selected;
        }
      };

      const renderBudgetCategories = (categoryBudgets) => {
        const container = document.getElementById("category-budget-list");
        const currentMonth = new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date());
        const colorClasses = {
          sky: "bg-sky-500",
          indigo: "bg-indigo-400",
          amber: "bg-amber-400",
          emerald: "bg-emerald-500",
        };
        container.replaceChildren();

        categoryBudgets.forEach((budget) => {
          const categories = budget.matches || [budget.category];
          const spent = sampleTransactions
            .filter((transaction) =>
              transaction.month === currentMonth &&
              transaction.amount < 0 &&
              categories.includes(transaction.category),
            )
            .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
          const remaining = budget.limit - spent;
          const row = document.createElement("div");
          const summary = document.createElement("div");
          const categoryName = document.createElement("span");
          const amountLabel = document.createElement("span");
          const track = document.createElement("div");
          const progress = document.createElement("div");
          const remainingLabel = document.createElement("p");
          row.className = "space-y-2";
          summary.className = "flex flex-wrap justify-between gap-2 text-sm";
          categoryName.className = "font-medium text-slate-800";
          amountLabel.className = "text-slate-500";
          categoryName.textContent = budget.category;
          amountLabel.textContent = `${money.format(spent)} spent / ${money.format(budget.limit)}`;
          track.className = "h-2 overflow-hidden rounded-full bg-slate-100";
          progress.className = `h-full rounded-full transition-all duration-500 ${colorClasses[budget.color] || "bg-sky-500"}`;
          progress.style.width = `${Math.min(100, budget.limit ? (spent / budget.limit) * 100 : 0)}%`;
          remainingLabel.className = `text-xs ${remaining < 0 ? "text-rose-600" : "text-slate-400"}`;
          remainingLabel.textContent = remaining < 0
            ? `${money.format(Math.abs(remaining))} over budget`
            : `${money.format(remaining)} remaining`;
          summary.append(categoryName, amountLabel);
          track.append(progress);
          row.append(summary, track, remainingLabel);
          container.append(row);
        });
      };

      const loadDashboardData = async () => {
        try {
          const response = await fetch(new URL("../data/expense-data.json", document.baseURI));
          if (!response.ok) throw new Error(`Data request failed (${response.status})`);
          const data = await response.json();
          if (!Array.isArray(data.transactions)) {
            throw new Error("The financial data file has an invalid transactions list.");
          }
          if (!Array.isArray(data.categoryBudgets)) {
            throw new Error("The financial data file has an invalid category budgets list.");
          }
          if (!Array.isArray(data.categories)) {
            throw new Error("The financial data file has an invalid categories list.");
          }
          sampleTransactions.push(...data.transactions);
          budgetLimit = Number(data.monthlyBudget) || 2400;
          categoryBudgetData = data.categoryBudgets;
          financialCategories = data.categories;
          accountBalance = Number(data.accountSummary?.balance) || 0;
          const balanceChange = Number(data.accountSummary?.monthlyChangePercent) || 0;
          const balanceChangeLabel = document.getElementById("balance-change");
          balanceChangeLabel.textContent = `${balanceChange > 0 ? "+" : ""}${balanceChange}%`;
          balanceChangeLabel.classList.toggle("text-emerald-600", balanceChange >= 0);
          balanceChangeLabel.classList.toggle("text-rose-600", balanceChange < 0);

          try {
            const savedTransactions = JSON.parse(
              localStorage.getItem("ledger-user-transactions") || "[]",
            );
            if (Array.isArray(savedTransactions)) {
              browserTransactions = savedTransactions;
              sampleTransactions.push(...browserTransactions);
            }
          } catch (storageError) {
            console.warn("Saved browser transactions could not be loaded.", storageError);
          }

          try {
            const savedBalanceValue = localStorage.getItem("ledger-account-balance");
            if (savedBalanceValue !== null) {
              const savedBalance = Number(savedBalanceValue);
              if (Number.isFinite(savedBalance) && savedBalance >= 0) accountBalance = savedBalance;
            } else {
              accountBalance -= browserTransactions
                .filter((transaction) => transaction.amount < 0)
                .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
            }
            const storedGoalValue = localStorage.getItem("ledger-savings-goal");
            const savedGoal = JSON.parse(storedGoalValue || "null");
            if (
              savedGoal &&
              typeof savedGoal.name === "string" &&
              Number(savedGoal.targetAmount) > 0 &&
              Number(savedGoal.monthlyContribution) > 0
            ) {
              activeSavingsGoal = {
                ...savedGoal,
                targetAmount: Number(savedGoal.targetAmount),
                monthlyContribution: Number(savedGoal.monthlyContribution),
                savedAmount: Math.max(0, Number(savedGoal.savedAmount) || 0),
                autoTransfer: Boolean(savedGoal.autoTransfer),
                nextTransferDate: savedGoal.nextTransferDate || formatLocalDate(addMonths(new Date(), 1)),
              };
              if (activeSavingsGoal.savedAmount >= activeSavingsGoal.targetAmount) {
                activeSavingsGoal.autoTransfer = false;
              }
            } else if (
              storedGoalValue === null &&
              localStorage.getItem("ledger-savings-goal-history") === null
            ) {
              const today = new Date();
              const sampleApril = new Date(2025, 3, 10);
              const sampleCurrentMonth = new Date(
                today.getFullYear(),
                today.getMonth(),
                Math.min(today.getDate(), 10),
              );
              const sampleSavedAmount = accountBalance >= 3700 ? 3700 : 0;
              const sampleDeposits = buildMonthlySampleDeposits(
                sampleSavedAmount,
                sampleApril,
                sampleCurrentMonth,
              );
              accountBalance = Math.max(0, accountBalance - sampleSavedAmount);
              activeSavingsGoal = {
                name: "RTX 5090",
                targetAmount: 4200,
                monthlyContribution: 850,
                startDate: formatLocalDate(sampleApril),
                targetDate: formatLocalDate(addMonths(today, 1)),
                autoTransfer: true,
                savedAmount: sampleSavedAmount,
                deposits: sampleDeposits,
                nextTransferDate: formatLocalDate(addMonths(today, 1)),
                isSample: true,
                sampleHistoryAvailable: sampleSavedAmount > 0,
                sampleVariationVersion: 8,
                historyTimelineVersion: 2,
              };
              persistSavingsGoal();
            }
            if (
              activeSavingsGoal?.isSample &&
              !activeSavingsGoal.sampleVariationVersion &&
              activeSavingsGoal.savedAmount === 3400 &&
              Array.isArray(activeSavingsGoal.deposits) &&
              activeSavingsGoal.deposits.length === 4 &&
              activeSavingsGoal.deposits.every((deposit) => deposit.amount === 850 && deposit.type === "scheduled") &&
              accountBalance >= 300
            ) {
              const sampleStartDate = parseLocalDate(activeSavingsGoal.deposits[0].date);
              activeSavingsGoal.deposits = [
                { amount: 850, date: formatLocalDate(addMonths(sampleStartDate, 0)), type: "scheduled" },
                { amount: 850, date: formatLocalDate(addMonths(sampleStartDate, 1)), type: "scheduled" },
                { amount: 150, date: formatLocalDate(addMonths(sampleStartDate, 1)), type: "extra" },
                { amount: 850, date: formatLocalDate(addMonths(sampleStartDate, 2)), type: "scheduled" },
                { amount: 850, date: formatLocalDate(addMonths(sampleStartDate, 3)), type: "scheduled" },
                { amount: 150, date: formatLocalDate(addMonths(sampleStartDate, 3)), type: "extra" },
              ];
              activeSavingsGoal.savedAmount = 3700;
              activeSavingsGoal.sampleVariationVersion = 2;
              accountBalance -= 300;
              persistSavingsGoal();
            }
            if (
              activeSavingsGoal?.isSample &&
              activeSavingsGoal.sampleVariationVersion === 2 &&
              activeSavingsGoal.savedAmount === 3700 &&
              Array.isArray(activeSavingsGoal.deposits) &&
              activeSavingsGoal.deposits.length === 6
            ) {
              const sampleStartDate = parseLocalDate(activeSavingsGoal.deposits[0].date);
              activeSavingsGoal.deposits = [
                { amount: 850, date: formatLocalDate(addMonths(sampleStartDate, 0)), type: "scheduled" },
                { amount: 850, date: formatLocalDate(addMonths(sampleStartDate, 1)), type: "scheduled" },
                { amount: 100, date: formatLocalDate(addMonths(sampleStartDate, 1)), type: "extra" },
                { amount: 50, date: formatLocalDate(addMonths(sampleStartDate, 1)), type: "extra" },
                { amount: 850, date: formatLocalDate(addMonths(sampleStartDate, 2)), type: "scheduled" },
                { amount: 50, date: formatLocalDate(addMonths(sampleStartDate, 2)), type: "extra" },
                { amount: 850, date: formatLocalDate(addMonths(sampleStartDate, 3)), type: "scheduled" },
                { amount: 75, date: formatLocalDate(addMonths(sampleStartDate, 3)), type: "extra" },
                { amount: 25, date: formatLocalDate(addMonths(sampleStartDate, 3)), type: "extra" },
              ];
              activeSavingsGoal.sampleVariationVersion = 3;
              persistSavingsGoal();
            }
            if (
              activeSavingsGoal?.isSample &&
              activeSavingsGoal.sampleVariationVersion === 3 &&
              activeSavingsGoal.savedAmount === 3700 &&
              Array.isArray(activeSavingsGoal.deposits) &&
              activeSavingsGoal.deposits.length === 9
            ) {
              const today = new Date();
              const sampleApril = new Date(2026, 3, 10);
              const sampleJuly = new Date(2026, 6, 10);
              const sampleSeptember = new Date(2026, 8, 10);
              const sampleCurrentMonth = new Date(
                today.getFullYear(),
                today.getMonth(),
                Math.min(today.getDate(), 10),
              );
              activeSavingsGoal.deposits = [
                { amount: 850, date: formatLocalDate(sampleApril), type: "scheduled" },
                { amount: 850, date: formatLocalDate(sampleJuly), type: "scheduled" },
                { amount: 100, date: formatLocalDate(sampleJuly), type: "extra" },
                { amount: 50, date: formatLocalDate(sampleJuly), type: "extra" },
                { amount: 850, date: formatLocalDate(sampleSeptember), type: "scheduled" },
                { amount: 50, date: formatLocalDate(sampleSeptember), type: "extra" },
                { amount: 850, date: formatLocalDate(sampleCurrentMonth), type: "scheduled" },
                { amount: 75, date: formatLocalDate(sampleCurrentMonth), type: "extra" },
                { amount: 25, date: formatLocalDate(sampleCurrentMonth), type: "extra" },
              ];
              activeSavingsGoal.targetDate = formatLocalDate(addMonths(today, 1));
              activeSavingsGoal.nextTransferDate = formatLocalDate(addMonths(today, 1));
              activeSavingsGoal.sampleVariationVersion = 4;
              persistSavingsGoal();
            }
            if (
              activeSavingsGoal?.isSample &&
              activeSavingsGoal.sampleVariationVersion === 4
            ) {
              const today = new Date();
              activeSavingsGoal.startDate = "2026-04-10";
              activeSavingsGoal.targetDate = formatLocalDate(addMonths(today, 1));
              activeSavingsGoal.nextTransferDate = formatLocalDate(addMonths(today, 1));
              activeSavingsGoal.sampleVariationVersion = 5;
              persistSavingsGoal();
            }
            if (
              activeSavingsGoal?.isSample &&
              activeSavingsGoal.sampleHistoryAvailable &&
              activeSavingsGoal.sampleVariationVersion === 5 &&
              activeSavingsGoal.savedAmount === 3700
            ) {
              const today = new Date();
              const sampleApril = new Date(2026, 3, 10);
              const sampleJuly = new Date(2026, 6, 10);
              const sampleSeptember = new Date(2026, 8, 10);
              const sampleCurrentMonth = new Date(
                today.getFullYear(),
                today.getMonth(),
                Math.min(today.getDate(), 10),
              );
              activeSavingsGoal.startDate = formatLocalDate(sampleApril);
              activeSavingsGoal.deposits = [
                { amount: 850, date: formatLocalDate(sampleApril), type: "scheduled" },
                { amount: 850, date: formatLocalDate(sampleJuly), type: "scheduled" },
                { amount: 100, date: formatLocalDate(sampleJuly), type: "extra" },
                { amount: 50, date: formatLocalDate(sampleJuly), type: "extra" },
                { amount: 850, date: formatLocalDate(sampleSeptember), type: "scheduled" },
                { amount: 50, date: formatLocalDate(sampleSeptember), type: "extra" },
                { amount: 850, date: formatLocalDate(sampleCurrentMonth), type: "scheduled" },
                { amount: 75, date: formatLocalDate(sampleCurrentMonth), type: "extra" },
                { amount: 25, date: formatLocalDate(sampleCurrentMonth), type: "extra" },
              ];
              activeSavingsGoal.sampleVariationVersion = 6;
              persistSavingsGoal();
            }
            if (
              activeSavingsGoal?.isSample &&
              activeSavingsGoal.sampleHistoryAvailable &&
              activeSavingsGoal.sampleVariationVersion === 6 &&
              activeSavingsGoal.savedAmount === 3700
            ) {
              const today = new Date();
              const currentMonth = new Date(
                today.getFullYear(),
                today.getMonth(),
                Math.min(today.getDate(), 10),
              );
              const dates = {
                april2025: formatLocalDate(new Date(2025, 3, 10)),
                june2025: formatLocalDate(new Date(2025, 5, 10)),
                august2025: formatLocalDate(new Date(2025, 7, 10)),
                december2025: formatLocalDate(new Date(2025, 11, 10)),
                april2026: formatLocalDate(new Date(2026, 3, 10)),
                september2026: formatLocalDate(new Date(2026, 8, 10)),
                currentMonth: formatLocalDate(currentMonth),
              };
              activeSavingsGoal.startDate = dates.april2025;
              activeSavingsGoal.deposits = [
                { amount: 850, date: dates.april2025, type: "scheduled" },
                { amount: 100, date: dates.june2025, type: "extra" },
                { amount: 50, date: dates.june2025, type: "extra" },
                { amount: 850, date: dates.august2025, type: "scheduled" },
                { amount: 850, date: dates.december2025, type: "scheduled" },
                { amount: 50, date: dates.december2025, type: "extra" },
                { amount: 850, date: dates.april2026, type: "scheduled" },
                { amount: 75, date: dates.september2026, type: "extra" },
                { amount: 25, date: dates.currentMonth, type: "extra" },
              ];
              activeSavingsGoal.sampleVariationVersion = 7;
              persistSavingsGoal();
            }
            if (
              activeSavingsGoal?.isSample &&
              activeSavingsGoal.sampleVariationVersion <= 7 &&
              activeSavingsGoal.savedAmount > 0
            ) {
              const today = new Date();
              const sampleStart = new Date(2025, 3, 10);
              const sampleThrough = new Date(
                today.getFullYear(),
                today.getMonth(),
                Math.min(today.getDate(), 10),
              );
              activeSavingsGoal.startDate = formatLocalDate(sampleStart);
              activeSavingsGoal.deposits = buildMonthlySampleDeposits(
                activeSavingsGoal.savedAmount,
                sampleStart,
                sampleThrough,
              );
              activeSavingsGoal.sampleHistoryAvailable = true;
              activeSavingsGoal.sampleVariationVersion = 8;
              activeSavingsGoal.historyTimelineVersion = 2;
              persistSavingsGoal();
            }
            const legacyGoalStart = activeSavingsGoal?.startDate
              ? parseLocalDate(activeSavingsGoal.startDate)
              : null;
            const currentDate = new Date();
            const legacyDeposits = Array.isArray(activeSavingsGoal?.deposits)
              ? activeSavingsGoal.deposits
              : [];
            const hasFutureDeposit = legacyDeposits.some((deposit) =>
              parseLocalDate(deposit.date) > currentDate,
            );
            const startsThisMonth = legacyGoalStart &&
              legacyGoalStart.getFullYear() === currentDate.getFullYear() &&
              legacyGoalStart.getMonth() === currentDate.getMonth();
            if (
              activeSavingsGoal &&
              !activeSavingsGoal.historyTimelineVersion &&
              activeSavingsGoal.savedAmount > 0 &&
              legacyDeposits.length <= 2 &&
              startsThisMonth &&
              hasFutureDeposit
            ) {
              const timelineStart = new Date(2025, 3, 10);
              const timelineEnd = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                Math.min(currentDate.getDate(), 10),
              );
              activeSavingsGoal.startDate = formatLocalDate(timelineStart);
              activeSavingsGoal.deposits = buildMonthlySampleDeposits(
                activeSavingsGoal.savedAmount,
                timelineStart,
                timelineEnd,
              );
              activeSavingsGoal.nextTransferDate = formatLocalDate(addMonths(currentDate, 1));
              activeSavingsGoal.historyTimelineVersion = 1;
              persistSavingsGoal();
            }
            if (
              activeSavingsGoal?.historyTimelineVersion === 1 &&
              activeSavingsGoal.savedAmount > 0
            ) {
              const today = new Date();
              const timelineStart = new Date(2025, 3, 10);
              const timelineEnd = new Date(
                today.getFullYear(),
                today.getMonth(),
                Math.min(today.getDate(), 10),
              );
              activeSavingsGoal.startDate = formatLocalDate(timelineStart);
              activeSavingsGoal.deposits = buildMonthlySampleDeposits(
                activeSavingsGoal.savedAmount,
                timelineStart,
                timelineEnd,
              );
              activeSavingsGoal.historyTimelineVersion = 2;
              persistSavingsGoal();
            }
            const savedGoalHistory = JSON.parse(
              localStorage.getItem("ledger-savings-goal-history") || "[]",
            );
            if (Array.isArray(savedGoalHistory)) {
              savingsGoalHistory = savedGoalHistory.filter((entry) =>
                entry &&
                typeof entry.id === "string" &&
                ["cancelled", "reset"].includes(entry.action) &&
                entry.goal &&
                typeof entry.goal.name === "string" &&
                Number.isFinite(Number(entry.refundAmount)) &&
                Number(entry.refundAmount) >= 0 &&
                typeof entry.date === "string" &&
                Number.isFinite(parseLocalDate(entry.date).getTime()),
              );
            }
          } catch (storageError) {
            console.warn("Savings plan or balance could not be restored.", storageError);
          }

          const currentMonth = new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date());
          totalExpenses = sampleTransactions
            .filter((transaction) => transaction.month === currentMonth && transaction.amount < 0)
            .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
          averageMonthlySurplus = calculateAverageMonthlySurplus();
          financialDataReady = true;
          updateAccountBalance();
          renderCashFlowChart();
          renderRecentTransactions();
          renderExpenseCategories();
          renderBudgetCategories(categoryBudgetData);
          updateBudgetStatus();
          renderTransactionHistory();
          renderReportTransactions();
          updateReportingPeriod();
          renderSavingsGoal();
          processDueSavingsTransfers();
        } catch (error) {
          console.error("Dashboard financial data could not be loaded.", error);
          showToast("Could not load the dashboard data. Open this page through a local web server.", "danger");
        }
      };

      const filterReportForMonth = (month) => {
        selectedReportMonth = month;
        reportTransactionsPage = 1;
        renderReportTransactions(month);
      };

      const savingsGoalForm = document.getElementById("savings-goal-form");
      const savingsGoalDialog = document.getElementById("savings-goal-dialog");
      const goalCancelDialog = document.getElementById("goal-cancel-dialog");
      const goalAmountSelect = document.getElementById("goal-monthly-amount");
      const goalCustomAmount = document.getElementById("goal-custom-amount");
      const goalPriceInput = document.getElementById("goal-price");
      const goalDeadlineInput = document.getElementById("goal-deadline");
      document.getElementById("goal-open-dialog").addEventListener("click", () => {
        savingsGoalDialog.showModal();
        document.getElementById("goal-name").focus();
      });
      document.getElementById("goal-close-dialog").addEventListener("click", () => savingsGoalDialog.close());
      goalDeadlineInput.min = formatLocalDate(new Date());
      [goalAmountSelect, goalCustomAmount, goalPriceInput, goalDeadlineInput].forEach((input) => {
        input.addEventListener("input", updateSavingsPlanPreview);
        input.addEventListener("change", updateSavingsPlanPreview);
      });

      savingsGoalForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!savingsGoalForm.reportValidity()) return;
        const name = document.getElementById("goal-name").value.trim();
        const targetAmount = Number(goalPriceInput.value);
        const monthlyContribution = getMonthlyContribution();
        if (!financialDataReady) {
          showToast("Wait for the account data to load before saving a goal.", "warning");
          return;
        }
        if (!name || !Number.isFinite(targetAmount) || targetAmount <= 0 || !Number.isFinite(monthlyContribution) || monthlyContribution < 850) {
          showToast("Enter a valid target price and a monthly amount of at least $850.", "warning");
          return;
        }
        const previousGoal = activeSavingsGoal;
        activeSavingsGoal = {
          name,
          targetAmount,
          monthlyContribution,
          startDate: previousGoal?.startDate || formatLocalDate(new Date()),
          targetDate: goalDeadlineInput.value,
          autoTransfer:
            document.getElementById("goal-auto-transfer").checked &&
            (previousGoal?.savedAmount || 0) < targetAmount,
          savedAmount: previousGoal?.savedAmount || 0,
          deposits: previousGoal?.deposits || [],
          isSample: Boolean(previousGoal?.isSample),
          nextTransferDate: previousGoal?.nextTransferDate || formatLocalDate(addMonths(new Date(), 1)),
        };
        persistSavingsGoal();
        renderSavingsGoal();
        savingsGoalDialog.close();
        showToast(`Savings plan for ${name} was saved.`, "success");
        processDueSavingsTransfers();
      });

      document.getElementById("goal-add-extra").addEventListener("click", () => {
        if (!financialDataReady) {
          showToast("Wait for the account data to load before adding a deposit.", "warning");
          return;
        }
        if (!activeSavingsGoal) {
          showToast("Create a savings goal before adding a deposit.", "warning");
          return;
        }
        const amountInput = document.getElementById("goal-extra-amount");
        const requestedAmount = Number(amountInput.value);
        if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
          amountInput.focus();
          showToast("Enter an extra deposit amount greater than zero.", "warning");
          return;
        }
        const remaining = Math.max(0, activeSavingsGoal.targetAmount - activeSavingsGoal.savedAmount);
        if (!remaining) {
          showToast("This savings goal is already fully funded.", "warning");
          return;
        }
        const depositAmount = Math.min(requestedAmount, remaining);
        if (depositAmount > accountBalance) {
          showToast(`Your available balance is ${money.format(accountBalance)}. The extra deposit cannot exceed it.`, "danger");
          return;
        }
        accountBalance -= depositAmount;
        activeSavingsGoal.savedAmount += depositAmount;
        activeSavingsGoal.deposits = Array.isArray(activeSavingsGoal.deposits)
          ? activeSavingsGoal.deposits
          : [];
        activeSavingsGoal.deposits.push({
          amount: depositAmount,
          date: formatLocalDate(new Date()),
          type: "extra",
        });
        if (activeSavingsGoal.savedAmount >= activeSavingsGoal.targetAmount) {
          activeSavingsGoal.autoTransfer = false;
        }
        updateAccountBalance();
        persistSavingsGoal();
        renderSavingsGoal();
        amountInput.value = "";
        showToast(
          requestedAmount > remaining
            ? `Added ${money.format(depositAmount)}. The goal is now fully funded.`
            : `${money.format(depositAmount)} extra deposit added to ${activeSavingsGoal.name}.`,
          "success",
        );
      });

      const finalizeGoalChange = (action) => {
        if (!activeSavingsGoal) return;
        const savedAmount = Math.round(Math.max(0, Number(activeSavingsGoal.savedAmount) || 0) * 100) / 100;
        const goalSnapshot = JSON.parse(JSON.stringify(activeSavingsGoal));
        savingsGoalHistory.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          action,
          goal: goalSnapshot,
          refundAmount: savedAmount,
          date: formatLocalDate(new Date()),
          rolledBack: false,
        });
        accountBalance = Math.round((accountBalance + savedAmount) * 100) / 100;
        if (action === "cancelled") {
          activeSavingsGoal = null;
        } else {
          activeSavingsGoal = {
            ...activeSavingsGoal,
            startDate: formatLocalDate(new Date()),
            savedAmount: 0,
            deposits: [],
            isSample: false,
            nextTransferDate: formatLocalDate(addMonths(new Date(), 1)),
          };
        }
        persistSavingsGoalHistory();
        persistSavingsGoal();
        updateAccountBalance();
        renderSavingsGoal();
        goalCancelDialog.close();
        showToast(
          action === "cancelled"
            ? `${money.format(savedAmount)} returned to your balance. The goal was canceled.`
            : `${money.format(savedAmount)} returned to your balance. The goal is ready to start over.`,
          "success",
        );
      };

      document.getElementById("cancel-savings-goal").addEventListener("click", () => {
        if (!activeSavingsGoal) return;
        const refundAmount = Math.max(0, Number(activeSavingsGoal.savedAmount) || 0);
        const formattedRefund = money.format(refundAmount);
        document.getElementById("goal-cancel-amount").textContent = formattedRefund;
        document.getElementById("goal-cancel-return-label").textContent = `Return ${formattedRefund} and cancel`;
        document.getElementById("goal-reset-return-label").textContent = `Return ${formattedRefund} and start over`;
        goalCancelDialog.showModal();
      });
      document.getElementById("goal-keep-plan").addEventListener("click", () => goalCancelDialog.close());
      document.getElementById("goal-confirm-cancel").addEventListener("click", () => finalizeGoalChange("cancelled"));
      document.getElementById("goal-confirm-reset").addEventListener("click", () => finalizeGoalChange("reset"));

      document.getElementById("goal-history-list").addEventListener("click", (event) => {
        const undoButton = event.target.closest("[data-goal-history-undo]");
        if (!undoButton) return;
        const historyEntry = savingsGoalHistory.find((entry) => entry.id === undoButton.dataset.goalHistoryUndo);
        if (!historyEntry || historyEntry.rolledBack) return;
        const latestChange = [...savingsGoalHistory].reverse().find((entry) => !entry.rolledBack);
        if (latestChange !== historyEntry) {
          showToast("Undo newer goal changes first, then you can roll this one back.", "warning");
          return;
        }
        if (historyEntry.action === "cancelled" && activeSavingsGoal) {
          showToast("Cancel or finish the current goal before restoring this one.", "warning");
          return;
        }
        if (historyEntry.action === "reset" && activeSavingsGoal) {
          const isSameGoal =
            activeSavingsGoal.name === historyEntry.goal.name &&
            activeSavingsGoal.targetAmount === historyEntry.goal.targetAmount &&
            activeSavingsGoal.monthlyContribution === historyEntry.goal.monthlyContribution &&
            activeSavingsGoal.targetDate === historyEntry.goal.targetDate &&
            activeSavingsGoal.autoTransfer === historyEntry.goal.autoTransfer;
          const hasNewDeposits =
            activeSavingsGoal.savedAmount > 0 ||
            (Array.isArray(activeSavingsGoal.deposits) && activeSavingsGoal.deposits.length > 0);
          if (!isSameGoal || hasNewDeposits) {
            showToast("This goal has changed since the reset. Cancel it first to restore the earlier plan.", "warning");
            return;
          }
        }
        if (accountBalance < historyEntry.refundAmount) {
          showToast(`Restoring this goal needs ${money.format(historyEntry.refundAmount)} in your available balance.`, "danger");
          return;
        }
        accountBalance = Math.round((accountBalance - historyEntry.refundAmount) * 100) / 100;
        activeSavingsGoal = JSON.parse(JSON.stringify(historyEntry.goal));
        if (activeSavingsGoal.autoTransfer) {
          activeSavingsGoal.nextTransferDate = formatLocalDate(addMonths(new Date(), 1));
        }
        historyEntry.rolledBack = true;
        historyEntry.rolledBackDate = formatLocalDate(new Date());
        persistSavingsGoalHistory();
        persistSavingsGoal();
        updateAccountBalance();
        renderSavingsGoal();
        showToast(`${historyEntry.goal.name} was restored with ${money.format(historyEntry.refundAmount)} saved.`, "success");
      });

      window.clearInterval(window.__savingsTransferInterval);
      window.__savingsTransferInterval = window.setInterval(() => {
        if (document.getElementById("savings-goal-page")) processDueSavingsTransfers();
      }, 60_000);

      transactionMonthFilter.addEventListener("change", () => {
        transactionHistoryPage = 1;
        renderTransactionHistory(transactionMonthFilter.value);
      });
      periodSelect.addEventListener("change", updateReportingPeriod);
      loadDashboardData();

      const syncNavToLocation = () => {
        setActiveNav(window.location.hash || "#overview");
      };

      window.addEventListener("hashchange", syncNavToLocation);
      window.addEventListener("popstate", syncNavToLocation);
      syncNavToLocation();

      const setMobileMenu = (isOpen) => {
        sidebar.classList.toggle("-translate-x-full", !isOpen);
        overlay.classList.toggle("hidden", !isOpen);
        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.setAttribute(
          "aria-label",
          isOpen ? "Close navigation" : "Open navigation",
        );
        document.body.classList.toggle("overflow-hidden", isOpen);
      };

      const positionAccountMenu = () => {
        if (accountMenu.classList.contains("hidden")) return;
        const anchor = accountMenuToggle.getBoundingClientRect();
        const margin = 12;
        const gap = 10;
        const menuWidth = accountMenu.offsetWidth;
        const menuHeight = accountMenu.offsetHeight;
        let left = anchor.right + gap;
        if (left + menuWidth > window.innerWidth - margin) {
          left = anchor.left - menuWidth - gap;
        }
        left = Math.max(
          margin,
          Math.min(left, window.innerWidth - menuWidth - margin),
        );
        let top = anchor.top + anchor.height / 2 - menuHeight / 2;
        top = Math.max(
          margin,
          Math.min(top, window.innerHeight - menuHeight - margin),
        );
        accountMenu.style.left = `${left}px`;
        accountMenu.style.top = `${top}px`;
      };

      accountMenuToggle.addEventListener("click", () => {
        const isOpen = accountMenu.classList.contains("hidden");
        accountMenu.classList.toggle("hidden", !isOpen);
        accountMenuToggle.setAttribute("aria-expanded", String(isOpen));
        accountMenuToggle.setAttribute(
          "aria-label",
          isOpen ? "Close account menu" : "Open account menu",
        );
        if (isOpen) requestAnimationFrame(positionAccountMenu);
      });
      window.addEventListener("resize", positionAccountMenu);
      window.addEventListener("scroll", positionAccountMenu, true);
      document.addEventListener("click", (event) => {
        if (
          accountMenu.contains(event.target) ||
          accountMenuToggle.contains(event.target)
        )
          return;
        accountMenu.classList.add("hidden");
        accountMenuToggle.setAttribute("aria-expanded", "false");
        accountMenuToggle.setAttribute("aria-label", "Open account menu");
      });
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || accountMenu.classList.contains("hidden"))
          return;
        accountMenu.classList.add("hidden");
        accountMenuToggle.setAttribute("aria-expanded", "false");
        accountMenuToggle.setAttribute("aria-label", "Open account menu");
      });
      document.getElementById("view-profile").addEventListener("click", () => {
        accountMenu.classList.add("hidden");
        accountMenuToggle.setAttribute("aria-expanded", "false");
        accountMenuToggle.setAttribute("aria-label", "Open account menu");
        profileDialog.showModal();
      });
      document
        .getElementById("close-profile")
        .addEventListener("click", () => profileDialog.close());
      document
        .getElementById("done-profile")
        .addEventListener("click", () => profileDialog.close());

      document
        .querySelectorAll(
          'a[href="#overview"], a[href="#transactions-page"], a[href="#budgets-page"], a[href="#savings-goal-page"], a[href="#about-page"], a[href="#reports-page"], a[href="#portfolio-projects"]',
        )
        .forEach((link) => {
          link.addEventListener("click", (event) => {
            event.preventDefault();
            const hash = link.getAttribute("href");
            if (window.location.hash !== hash) history.pushState({}, "", hash);
            setActiveNav(hash);
            if (hash === "#portfolio-projects") {
              document.getElementById(hash.slice(1)).scrollIntoView({
                behavior: reduceMotion ? "auto" : "smooth",
                block: "start",
              });
            } else {
              window.scrollTo({
                top: 0,
                behavior: reduceMotion ? "auto" : "smooth",
              });
            }
            setMobileMenu(false);
          });
        });

      menuToggle.addEventListener("click", () => {
        setMobileMenu(menuToggle.getAttribute("aria-expanded") !== "true");
      });
      overlay.addEventListener("click", () => setMobileMenu(false));
      sidebar.querySelectorAll("nav a").forEach((link) => {
        link.addEventListener("click", () => setMobileMenu(false));
      });
      window.addEventListener("resize", () => {
        if (window.innerWidth >= 1024) setMobileMenu(false);
      });

      document.getElementById("open-expense").addEventListener("click", () => {
        expenseDialog.showModal();
        document.getElementById("expense-name").focus();
      });
      document
        .getElementById("close-expense")
        .addEventListener("click", () => expenseDialog.close());
      document
        .getElementById("cancel-expense")
        .addEventListener("click", () => expenseDialog.close());

      expenseForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!expenseForm.reportValidity()) return;

        const formData = new FormData(expenseForm);
        const name = formData.get("name").trim();
        const amount = Number(formData.get("amount"));
        const category = formData.get("category");

        if (!name || !Number.isFinite(amount) || amount <= 0) return;
        if (!financialDataReady) {
          showToast("Wait for the account data to load before adding an expense.", "warning");
          return;
        }
        processDueSavingsTransfers();
        const projectedBalance = accountBalance - amount;
        if (projectedBalance < 0) {
          showToast(`This expense is greater than your available balance of ${money.format(accountBalance)}.`, "danger");
          return;
        }
        if (
          activeSavingsGoal &&
          activeSavingsGoal.savedAmount < activeSavingsGoal.targetAmount &&
          projectedBalance < activeSavingsGoal.monthlyContribution
        ) {
          const shouldContinue = window.confirm(
            `This expense would leave ${money.format(projectedBalance)}, below your planned monthly savings transfer of ${money.format(activeSavingsGoal.monthlyContribution)} for ${activeSavingsGoal.name}. Continue anyway?`,
          );
          if (!shouldContinue) return;
        }

        const transactionDate = new Date();
        const month = new Intl.DateTimeFormat("en-US", {
          month: "short",
        }).format(transactionDate);
        const date = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, "0")}-${String(transactionDate.getDate()).padStart(2, "0")}`;
        const newTransaction = {
          name,
          category,
          date,
          amount: -amount,
          month,
        };
        sampleTransactions.push(newTransaction);
        try {
          const savedTransactions = JSON.parse(
            localStorage.getItem("ledger-user-transactions") || "[]",
          );
          const nextSavedTransactions = Array.isArray(savedTransactions)
            ? savedTransactions
            : [];
          nextSavedTransactions.push(newTransaction);
          localStorage.setItem(
            "ledger-user-transactions",
            JSON.stringify(nextSavedTransactions),
          );
        } catch (storageError) {
          console.warn("This expense could not be saved in browser storage.", storageError);
        }
        accountBalance = projectedBalance;
        updateAccountBalance();
        transactionHistoryPage = 1;
        reportTransactionsPage = 1;
        averageMonthlySurplus = calculateAverageMonthlySurplus();
        renderCashFlowChart();
        renderRecentTransactions();
        renderSavingsGoal();
        renderBudgetCategories(categoryBudgetData);
        renderTransactionHistory(transactionMonthFilter.value);
        renderReportTransactions();

        totalExpenses += amount;
        updateReportingPeriod();
        const budgetStatus = updateBudgetStatus();
        if (budgetStatus === "over") {
          showToast(
            `Budget exceeded by ${money.format(totalExpenses - budgetLimit)}. Review your monthly spending.`,
            "danger",
          );
        } else if (budgetStatus === "near") {
          showToast(
            `Budget alert: ${Math.round((totalExpenses / budgetLimit) * 100)}% used (${money.format(totalExpenses)} of ${money.format(budgetLimit)}).`,
            "warning",
          );
        } else {
          showToast(`${name} was added to your transactions.`, "success");
        }
        expenseForm.reset();
        expenseDialog.close();
      });
})();
