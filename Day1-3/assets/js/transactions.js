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
        transactions.sort((a, b) => b.date.localeCompare(a.date));
        const thisMonth = new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date());
        const month = transactions.some((item) => item.month === thisMonth) ? thisMonth : transactions[0]?.month;
        const monthRows = transactions.filter((item) => item.month === month);
        const income = monthRows.filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0);
        const expenses = monthRows.filter((item) => item.amount < 0).reduce((sum, item) => sum + Math.abs(item.amount), 0);
        document.getElementById("transactions-period").textContent = month ? month + " activity" : "No transactions";
        document.getElementById("transactions-income").textContent = money.format(income);
        document.getElementById("transactions-expenses").textContent = money.format(expenses);
        const net = income - expenses;
        document.getElementById("transactions-net").textContent = (net >= 0 ? "+" : "-") + money.format(Math.abs(net));
        const body = document.getElementById("transactions-table-body");
        const pagination = document.createElement("div");
        pagination.className = "hidden items-center justify-center gap-4 border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-sm";
        pagination.setAttribute("aria-label", "Transaction table pagination");
        body.closest(".overflow-x-auto").after(pagination);
        const renderPage = (page) => {
          body.replaceChildren();
          monthRows.slice((page - 1) * 15, page * 15).forEach((transaction) => {
          const row = document.createElement("tr");
          const date = new Date(transaction.date + "T12:00:00");
          [transaction.name, transaction.category, new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit", year: "numeric" }).format(date)].forEach((value) => {
            const cell = document.createElement("td");
            cell.className = "px-5 py-4 text-slate-600";
            cell.textContent = value;
            row.append(cell);
          });
          const amount = document.createElement("td");
          amount.className = "px-5 py-4 text-right font-semibold " + (transaction.amount > 0 ? "text-emerald-600" : "text-slate-800");
          amount.textContent = (transaction.amount > 0 ? "+" : "-") + money.format(Math.abs(transaction.amount));
          row.append(amount);
          body.append(row);
          });
          pagination.replaceChildren();
          if (monthRows.length <= 15) {
            pagination.classList.add("hidden");
            return;
          }
          pagination.classList.remove("hidden");
          pagination.classList.add("flex");
          const status = document.createElement("span");
          status.className = "rounded-lg border border-sky-100 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm";
          status.textContent = "Showing " + ((page - 1) * 15 + 1) + "–" + Math.min(page * 15, monthRows.length) + " of " + monthRows.length;
          const controls = document.createElement("div");
          controls.className = "flex items-center gap-1.5";
          const pageCount = Math.ceil(monthRows.length / 15);
          const makeButton = (label, nextPage, active, disabled) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = active ? "grid h-9 min-w-9 place-items-center rounded-lg border border-sky-600 bg-sky-600 px-2 text-xs font-bold text-white" : "grid h-9 min-w-9 place-items-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:bg-sky-50 disabled:opacity-40";
            button.textContent = label;
            button.disabled = disabled;
            if (active) button.setAttribute("aria-current", "page");
            button.addEventListener("click", () => renderPage(nextPage));
            return button;
          };
          controls.append(makeButton("Prev", page - 1, false, page === 1));
          for (let number = 1; number <= pageCount; number += 1) {
            controls.append(makeButton(String(number), number, number === page, false));
          }
          controls.append(makeButton("Next", page + 1, false, page === pageCount));
          pagination.append(status, controls);
        };
        renderPage(1);
      } catch (error) {
        document.getElementById("transactions-period").textContent = "Could not load transactions. Use a local web server.";
        console.error(error);
      }
    })();
