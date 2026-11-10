(async () => {
      const money = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });
      try {
        const response = await fetch(new URL("../data/expense-data.json", document.baseURI));
        if (!response.ok) throw new Error("Could not load financial data.");
        const data = await response.json();
        const transactions = [...data.transactions];
        try {
          const saved = JSON.parse(localStorage.getItem("ledger-user-transactions") || "[]");
          if (Array.isArray(saved)) transactions.push(...saved);
        } catch {}
        const thisMonth = new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date());
        const month = transactions.some((item) => item.month === thisMonth) ? thisMonth : transactions.sort((a, b) => b.date.localeCompare(a.date))[0]?.month;
        const expenses = transactions.filter((item) => item.month === month && item.amount < 0).reduce((sum, item) => sum + Math.abs(item.amount), 0);
        document.getElementById("budget-plan-caption").textContent = "Track category limits against your " + money.format(data.monthlyBudget) + " monthly plan.";
        document.getElementById("budget-limit").textContent = money.format(data.monthlyBudget);
        document.getElementById("budget-spent").textContent = money.format(expenses);
        document.getElementById("budget-remaining").textContent = money.format(Math.max(0, data.monthlyBudget - expenses));
        const colors = { sky: "bg-sky-500", indigo: "bg-indigo-400", amber: "bg-amber-400", emerald: "bg-emerald-500" };
        const container = document.getElementById("budget-category-list");
        data.categoryBudgets.forEach((budget) => {
          const matches = budget.matches || [budget.category];
          const spent = transactions.filter((item) => item.month === month && item.amount < 0 && matches.includes(item.category)).reduce((sum, item) => sum + Math.abs(item.amount), 0);
          const remaining = budget.limit - spent;
          const row = document.createElement("div");
          const summary = document.createElement("div");
          summary.className = "mb-2 flex flex-wrap justify-between gap-2 text-sm";
          const name = document.createElement("span"); name.className = "font-medium"; name.textContent = budget.category;
          const amount = document.createElement("span"); amount.className = "text-slate-500"; amount.textContent = money.format(spent) + " spent / " + money.format(budget.limit);
          summary.append(name, amount);
          const track = document.createElement("div"); track.className = "h-2 overflow-hidden rounded-full bg-slate-100";
          const bar = document.createElement("div"); bar.className = "h-full rounded-full " + (colors[budget.color] || "bg-sky-500"); bar.style.width = Math.min(100, budget.limit ? spent / budget.limit * 100 : 0) + "%";
          track.append(bar);
          const note = document.createElement("p"); note.className = "mt-1 text-xs " + (remaining < 0 ? "text-rose-600" : "text-slate-400"); note.textContent = remaining < 0 ? money.format(Math.abs(remaining)) + " over budget" : money.format(remaining) + " remaining";
          row.append(summary, track, note); container.append(row);
        });
      } catch (error) { document.getElementById("budget-plan-caption").textContent = "Could not load budgets. Use a local web server."; console.error(error); }
    })();
