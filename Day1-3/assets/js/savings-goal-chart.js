window.renderSavingsDepositChart = (
  container,
  deposits,
  formatMoney,
  goalStartDate,
  targetAmount,
  currentSavedAmount,
) => {
  if (!container) return;
  container.replaceChildren();
  const legend = document.getElementById("goal-chart-legend");
  legend?.replaceChildren();

  const now = new Date();
  const goalStart = goalStartDate ? new Date(`${goalStartDate}T00:00:00`) : null;
  const firstDepositDate = deposits
    .map((deposit) => new Date(`${deposit.date}T12:00:00`))
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((first, second) => first - second)[0];
  const startYear = goalStart?.getFullYear() ?? firstDepositDate?.getFullYear() ?? now.getFullYear();
  const depositsByYear = new Map();

  deposits.forEach((deposit) => {
    const date = new Date(`${deposit.date}T12:00:00`);
    const amount = Number(deposit.amount);
    if (!Number.isFinite(date.getTime()) || !Number.isFinite(amount) || amount <= 0) return;
    if (goalStart && date < goalStart) return;
    if (date > now) return;
    const year = date.getFullYear();
    const months = depositsByYear.get(year) || new Map();
    const month = date.getMonth();
    months.set(month, (months.get(month) || 0) + amount);
    depositsByYear.set(year, months);
  });

  const endYear = now.getFullYear();
  const activeYears = Array.from(
    { length: Math.max(1, endYear - startYear + 1) },
    (_, index) => startYear + index,
  );
  const summary = document.getElementById("goal-chart-summary");
  if (!activeYears.length) {
    summary.textContent = "No deposit data yet";
    const empty = document.createElement("p");
    empty.className = "flex min-h-48 items-center justify-center rounded-xl bg-slate-50 px-4 text-center text-sm text-slate-500";
    empty.textContent = "Your yearly deposit lines will appear after your first scheduled or extra deposit.";
    container.append(empty);
    return;
  }

  const totalSaved = Number.isFinite(currentSavedAmount) ? currentSavedAmount : 0;
  const progressPercent = targetAmount > 0 ? Math.min(100, (totalSaved / targetAmount) * 100) : 0;
  summary.textContent = `${formatMoney(totalSaved)} saved / ${progressPercent.toFixed(0)}% complete`;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 720 260");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("class", "h-56 w-full overflow-visible");
  svg.style.minWidth = "720px";
  svg.setAttribute("aria-hidden", "true");
  const appendSvg = (tag, attributes, parent = svg) => {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    parent.append(element);
    return element;
  };

  const plot = { left: 70, right: 700, top: 20, bottom: 190 };
  const maxMonthlyDeposit = Math.max(
    ...activeYears.flatMap((year) => [...(depositsByYear.get(year)?.values() ?? [])]),
    100,
  );
  const scaleMagnitude = 10 ** Math.floor(Math.log10(maxMonthlyDeposit));
  const scaleRatio = maxMonthlyDeposit / scaleMagnitude;
  const niceScaleRatios = [1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 7.5, 10];
  const niceScaleRatio = niceScaleRatios.find((ratio) => ratio >= scaleRatio) || 10;
  const gridMaximum = niceScaleRatio * scaleMagnitude;
  const formatAxisAmount = (amount) => {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return formatMoney(amount).replace(/\.00$/, "");
  };
  const yearColors = ["#2563eb", "#ec4899", "#8b5cf6", "#0f9f8f", "#f97316"];

  for (let tick = 0; tick <= 4; tick += 1) {
    const y = plot.bottom - (tick / 4) * (plot.bottom - plot.top);
    const amount = (gridMaximum * tick) / 4;
    appendSvg("line", { x1: plot.left, x2: plot.right, y1: y, y2: y, stroke: "#e2e8f0", "stroke-dasharray": "4 6" });
    const label = appendSvg("text", { x: plot.left - 10, y: y + 4, fill: "#94a3b8", "font-size": "11", "text-anchor": "end" });
    label.textContent = formatAxisAmount(amount);
  }
  appendSvg("line", { x1: plot.left, x2: plot.right, y1: plot.bottom, y2: plot.bottom, stroke: "#475569", "stroke-width": "1.2" });
  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const monthX = plot.left + ((monthIndex + 0.5) / 12) * (plot.right - plot.left);
    appendSvg("line", { x1: monthX, x2: monthX, y1: plot.bottom, y2: plot.bottom + 5, stroke: "#475569", "stroke-width": "1" });
    const monthLabel = appendSvg("text", { x: monthX, y: 220, fill: "#334155", "font-size": "10", "text-anchor": "middle" });
    monthLabel.textContent = new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date(2026, monthIndex, 15));
  }

  activeYears.forEach((year) => {
    const colorIndex = ((year - 2026) % yearColors.length + yearColors.length) % yearColors.length;
    const color = yearColors[colorIndex];
    const startMonth = year === startYear ? (goalStart?.getMonth() ?? 0) : 0;
    const endMonth = year === now.getFullYear() ? now.getMonth() : 11;
    const points = [];
    for (let monthIndex = startMonth; monthIndex <= endMonth; monthIndex += 1) {
      const amount = depositsByYear.get(year)?.get(monthIndex) || 0;
      points.push({
        year,
        monthIndex,
        amount,
        x: plot.left + ((monthIndex + 0.5) / 12) * (plot.right - plot.left),
        y: plot.bottom - (amount / gridMaximum) * (plot.bottom - plot.top),
      });
    }
    if (!points.length) return;

    const linePath = points
      .map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`)
      .join(" ");
    appendSvg("path", {
      d: linePath,
      fill: "none",
      stroke: color,
      "stroke-width": "3.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      class: "savings-chart-line",
    });

    points.forEach((point) => {
      const circle = appendSvg("circle", { cx: point.x, cy: point.y, r: "4.5", fill: color, stroke: "#fff", "stroke-width": "2" });
      const title = appendSvg("title", {}, circle);
      const monthName = new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date(year, point.monthIndex, 15));
      title.textContent = `${year} ${monthName}: ${formatMoney(point.amount)} deposited`;
    });

    const lastPoint = points[points.length - 1];
    const yearLabel = appendSvg("text", {
      x: Math.min(lastPoint.x + 7, plot.right - 2),
      y: Math.max(lastPoint.y - 8, plot.top + 10),
      fill: color,
      "font-size": "11",
      "font-weight": "700",
      "text-anchor": lastPoint.x > plot.right - 35 ? "end" : "start",
    });
    yearLabel.textContent = String(year);

    const legendItem = document.createElement("span");
    legendItem.className = "inline-flex items-center gap-2";
    const swatch = document.createElement("span");
    swatch.className = "inline-block h-2.5 w-2.5 rounded-full";
    swatch.style.backgroundColor = color;
    const yearText = document.createElement("span");
    const yearTotal = [...(depositsByYear.get(year)?.values() ?? [])]
      .reduce((sum, amount) => sum + amount, 0);
    yearText.textContent = `${year} · ${formatMoney(yearTotal)} total`;
    legendItem.append(swatch, yearText);
    legend?.append(legendItem);
  });

  container.append(svg);
};
