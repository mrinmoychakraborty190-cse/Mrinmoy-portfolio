const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

const dashboardStyles = document.createElement("link");
dashboardStyles.rel = "stylesheet";
dashboardStyles.href = "dashboard.css";
document.head.appendChild(dashboardStyles);

const revealItems = document.querySelectorAll("[data-reveal]");
const backToTop = document.querySelector(".back-to-top");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

revealItems.forEach((item) => revealObserver.observe(item));

const toggleBackToTop = () => {
  if (!backToTop) {
    return;
  }

  if (window.scrollY > 500) {
    backToTop.classList.add("is-visible");
  } else {
    backToTop.classList.remove("is-visible");
  }
};

window.addEventListener("scroll", toggleBackToTop, { passive: true });
toggleBackToTop();

if (backToTop) {
  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

const dashboardEls = {
  status: document.getElementById("dashboardStatus"),
  city: document.getElementById("cityFilter"),
  restaurant: document.getElementById("restaurantFilter"),
  orderStatus: document.getElementById("statusFilter"),
  reset: document.getElementById("resetDashboard"),
  orders: document.getElementById("kpiOrders"),
  revenue: document.getElementById("kpiRevenue"),
  delivery: document.getElementById("kpiDelivery"),
  cancel: document.getElementById("kpiCancel"),
  insights: document.getElementById("insightList"),
  payments: document.getElementById("paymentList"),
  table: document.getElementById("ordersTable"),
  tableCount: document.getElementById("tableCount"),
};

const chartPalette = ["#0f766e", "#f97316", "#2563eb", "#9333ea", "#64748b", "#db2777"];
const charts = {};
let swiggyOrders = [];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatNumber = (value) => new Intl.NumberFormat("en-IN").format(value || 0);
const average = (items, key) => {
  const values = items.map((item) => Number(item[key])).filter((value) => Number.isFinite(value));
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const groupBy = (items, key, reducer = (rows) => rows.length) => {
  const groups = items.reduce((acc, item) => {
    const label = item[key] ?? "Unknown";
    acc[label] = acc[label] || [];
    acc[label].push(item);
    return acc;
  }, {});

  return Object.entries(groups)
    .map(([label, rows]) => ({ label, value: reducer(rows), rows }))
    .sort((a, b) => b.value - a.value);
};

const populateSelect = (select, values, defaultLabel) => {
  if (!select) {
    return;
  }

  select.innerHTML = `<option value="all">${defaultLabel}</option>`;
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
};

const getFilteredOrders = () => {
  return swiggyOrders.filter((order) => {
    const cityMatch = dashboardEls.city?.value === "all" || order.City === dashboardEls.city?.value;
    const restaurantMatch = dashboardEls.restaurant?.value === "all" || order.Restaurant === dashboardEls.restaurant?.value;
    const statusMatch = dashboardEls.orderStatus?.value === "all" || order.Order_Status === dashboardEls.orderStatus?.value;
    return cityMatch && restaurantMatch && statusMatch;
  });
};

const createOrUpdateChart = (id, type, labels, data, label, options = {}) => {
  const canvas = document.getElementById(id);
  if (!canvas || typeof Chart === "undefined") {
    return;
  }

  if (charts[id]) {
    charts[id].data.labels = labels;
    charts[id].data.datasets[0].data = data;
    charts[id].update();
    return;
  }

  charts[id] = new Chart(canvas, {
    type,
    data: {
      labels,
      datasets: [
        {
          label,
          data,
          borderColor: options.borderColor || "#0f766e",
          backgroundColor: options.backgroundColor || chartPalette,
          borderWidth: 2,
          borderRadius: type === "bar" ? 10 : 0,
          fill: options.fill || false,
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: type === "doughnut" },
        tooltip: {
          callbacks: {
            label: (context) => {
              const currentLabel = context.dataset.label || context.label || "Value";
              const value = context.parsed.y ?? context.parsed ?? 0;
              return options.currency ? `${currentLabel}: ${formatCurrency(value)}` : `${currentLabel}: ${value}`;
            },
          },
        },
      },
      scales: type === "doughnut" ? {} : {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => (options.currency ? formatCurrency(value) : value),
          },
        },
      },
    },
  });
};

const updateKpis = (orders) => {
  const revenue = orders.reduce((sum, order) => sum + Number(order.Order_Value || 0), 0);
  const cancelled = orders.filter((order) => order.Order_Status === "Cancelled").length;
  const cancelRate = orders.length ? (cancelled / orders.length) * 100 : 0;

  dashboardEls.orders.textContent = formatNumber(orders.length);
  dashboardEls.revenue.textContent = formatCurrency(revenue);
  dashboardEls.delivery.textContent = `${average(orders, "Delivery_Time").toFixed(1)} min`;
  dashboardEls.cancel.textContent = `${cancelRate.toFixed(1)}%`;
};

const updateCharts = (orders) => {
  const daily = groupBy(orders, "Order_Date", (rows) => rows.reduce((sum, order) => sum + Number(order.Order_Value || 0), 0))
    .sort((a, b) => new Date(a.label) - new Date(b.label));
  const cityRevenue = groupBy(orders, "City", (rows) => rows.reduce((sum, order) => sum + Number(order.Order_Value || 0), 0));
  const statuses = groupBy(orders, "Order_Status");
  const restaurantDelivery = groupBy(orders, "Restaurant", (rows) => Number(average(rows, "Delivery_Time").toFixed(1)));

  createOrUpdateChart(
    "dailyRevenueChart",
    "line",
    daily.map((item) => item.label),
    daily.map((item) => item.value),
    "Revenue",
    { currency: true, backgroundColor: "rgba(15, 118, 110, 0.12)", fill: true }
  );
  createOrUpdateChart(
    "cityRevenueChart",
    "bar",
    cityRevenue.map((item) => item.label),
    cityRevenue.map((item) => item.value),
    "Revenue",
    { currency: true }
  );
  createOrUpdateChart(
    "statusChart",
    "doughnut",
    statuses.map((item) => item.label),
    statuses.map((item) => item.value),
    "Orders"
  );
  createOrUpdateChart(
    "restaurantDeliveryChart",
    "bar",
    restaurantDelivery.map((item) => item.label),
    restaurantDelivery.map((item) => item.value),
    "Avg minutes"
  );
};

const updateInsights = (orders) => {
  if (!orders.length) {
    dashboardEls.insights.innerHTML = "<li>No records match the selected filters.</li>";
    dashboardEls.payments.innerHTML = "";
    return;
  }

  const cityRevenue = groupBy(orders, "City", (rows) => rows.reduce((sum, order) => sum + Number(order.Order_Value || 0), 0))[0];
  const restaurantOrders = groupBy(orders, "Restaurant")[0];
  const slowestRestaurant = groupBy(orders, "Restaurant", (rows) => Number(average(rows, "Delivery_Time").toFixed(1)))[0];
  const ratedOrders = orders.filter((order) => order.Customer_Rating !== null && order.Customer_Rating !== undefined);
  const avgRating = ratedOrders.length ? average(ratedOrders, "Customer_Rating") : 0;
  const payments = groupBy(orders, "Payment_Mode");

  dashboardEls.insights.innerHTML = [
    `${cityRevenue.label} contributes the highest filtered revenue at ${formatCurrency(cityRevenue.value)}.`,
    `${restaurantOrders.label} has the most filtered orders with ${formatNumber(restaurantOrders.value)} orders.`,
    `${slowestRestaurant.label} shows the highest average delivery time at ${slowestRestaurant.value} minutes.`,
    `Average customer rating for delivered rated orders is ${avgRating.toFixed(1)} out of 5.`,
  ]
    .map((insight) => `<li>${insight}</li>`)
    .join("");

  const maxPayment = Math.max(...payments.map((item) => item.value), 1);
  dashboardEls.payments.innerHTML = payments
    .map((item) => {
      const percent = orders.length ? (item.value / orders.length) * 100 : 0;
      const width = (item.value / maxPayment) * 100;
      return `
        <div class="payment-row">
          <div class="payment-meta"><span>${item.label}</span><span>${percent.toFixed(1)}%</span></div>
          <div class="payment-bar"><span style="width: ${width}%"></span></div>
        </div>
      `;
    })
    .join("");
};

const updateTable = (orders) => {
  const rows = [...orders]
    .sort((a, b) => new Date(b.Order_Date) - new Date(a.Order_Date) || b.Order_ID - a.Order_ID)
    .slice(0, 12);

  dashboardEls.tableCount.textContent = `${formatNumber(orders.length)} records`;
  dashboardEls.table.innerHTML = rows
    .map((order) => {
      const statusClass = order.Order_Status === "Delivered" ? "status-delivered" : "status-cancelled";
      return `
        <tr>
          <td>#${order.Order_ID}</td>
          <td>${order.Order_Date}</td>
          <td>${order.City}</td>
          <td>${order.Restaurant}</td>
          <td>${formatCurrency(order.Order_Value)}</td>
          <td>${order.Delivery_Time} min</td>
          <td><span class="status-badge ${statusClass}">${order.Order_Status}</span></td>
          <td>${order.Customer_Rating ?? "-"}</td>
        </tr>
      `;
    })
    .join("");
};

const renderDashboard = () => {
  const filteredOrders = getFilteredOrders();
  updateKpis(filteredOrders);
  updateCharts(filteredOrders);
  updateInsights(filteredOrders);
  updateTable(filteredOrders);

  if (dashboardEls.status) {
    dashboardEls.status.textContent = `Showing ${formatNumber(filteredOrders.length)} of ${formatNumber(swiggyOrders.length)} orders`;
  }
};

const initDashboard = async () => {
  if (!document.getElementById("projects")) {
    return;
  }

  try {
    const response = await fetch("swiggy_data.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Unable to load swiggy_data.json");
    }

    swiggyOrders = await response.json();
    populateSelect(dashboardEls.city, [...new Set(swiggyOrders.map((order) => order.City))].sort(), "All cities");
    populateSelect(dashboardEls.restaurant, [...new Set(swiggyOrders.map((order) => order.Restaurant))].sort(), "All restaurants");
    populateSelect(dashboardEls.orderStatus, [...new Set(swiggyOrders.map((order) => order.Order_Status))].sort(), "All statuses");

    [dashboardEls.city, dashboardEls.restaurant, dashboardEls.orderStatus].forEach((select) => {
      select?.addEventListener("change", renderDashboard);
    });

    dashboardEls.reset?.addEventListener("click", () => {
      dashboardEls.city.value = "all";
      dashboardEls.restaurant.value = "all";
      dashboardEls.orderStatus.value = "all";
      renderDashboard();
    });

    renderDashboard();
  } catch (error) {
    if (dashboardEls.status) {
      dashboardEls.status.textContent = "Could not load the Swiggy data. Please check swiggy_data.json.";
    }
    console.error(error);
  }
};

initDashboard();
