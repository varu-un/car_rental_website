document.addEventListener("DOMContentLoaded", async () => {
  const API_BASE = "https://your-backend-domain.com"; // replace this

  if (localStorage.getItem("isAdminLoggedIn") !== "true") {
    window.location.href = "admin-login.html";
    return;
  }

  const logoutBtn = document.getElementById("logoutBtn");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const bookingTableBody = document.getElementById("bookingTableBody");

  let allBookings = [];

  function formatAmount(value) {
    return `₹${Number(value || 0).toFixed(2)}`;
  }

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("isAdminLoggedIn");
    window.location.href = "admin-login.html";
  });

  function downloadCSV(bookings) {
    if (!bookings.length) {
      alert("No bookings available to export.");
      return;
    }

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Location",
      "Pickup Date",
      "Return Date",
      "Days",
      "Cars",
      "Total Cars",
      "Amount",
      "Status",
      "Payment ID",
      "Order ID",
    ];

    const rows = bookings.map((booking) => [
      booking.name || "",
      booking.email || "",
      booking.phone || "",
      booking.location || "",
      booking.pickupDate || "",
      booking.returnDate || "",
      booking.days || "",
      (booking.cars || [])
        .map((car) => `${car.name} x${car.quantity || 1}`)
        .join(" | "),
      booking.totalCars || "",
      booking.amount || "",
      booking.bookingStatus || "",
      booking.paymentId || "",
      booking.orderId || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bookings-data.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportCsvBtn.addEventListener("click", () => {
    downloadCSV(allBookings);
  });

  try {
    const [summaryRes, monthlyRes, topCarsRes, bookingsRes] = await Promise.all(
      [
        fetch(`${API_BASE}/analytics/summary`),
        fetch(`${API_BASE}/analytics/monthly-revenue`),
        fetch(`${API_BASE}/analytics/top-cars`),
        fetch(`${API_BASE}/bookings`),
      ],
    );

    if (!summaryRes.ok || !monthlyRes.ok || !topCarsRes.ok || !bookingsRes.ok) {
      throw new Error("Failed to load dashboard data");
    }

    const summary = await summaryRes.json();
    const monthlyData = await monthlyRes.json();
    const topCarsData = await topCarsRes.json();
    const bookings = await bookingsRes.json();

    allBookings = bookings;

    document.getElementById("totalRevenue").textContent = formatAmount(
      summary.totalRevenue,
    );
    document.getElementById("totalBookings").textContent =
      summary.totalBookings || 0;
    document.getElementById("totalCarsRented").textContent =
      summary.totalCarsRented || 0;
    document.getElementById("avgBookingValue").textContent = formatAmount(
      summary.avgBookingValue,
    );

    bookingTableBody.innerHTML = "";

    bookings.forEach((booking) => {
      const carsText = (booking.cars || [])
        .map((car) => `${car.name} x${car.quantity || 1}`)
        .join(", ");

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${booking.name || ""}</td>
        <td>${booking.email || ""}</td>
        <td>${booking.phone || ""}</td>
        <td>${booking.location || ""}</td>
        <td>${booking.pickupDate || ""}</td>
        <td>${booking.returnDate || ""}</td>
        <td>${carsText || "-"}</td>
        <td>${formatAmount(booking.amount)}</td>
        <td>${booking.bookingStatus || "confirmed"}</td>
      `;
      bookingTableBody.appendChild(tr);
    });

    new Chart(document.getElementById("monthlyRevenueChart"), {
      type: "line",
      data: {
        labels: monthlyData.labels || [],
        datasets: [
          {
            label: "Monthly Revenue",
            data: monthlyData.values || [],
            borderWidth: 2,
            tension: 0.35,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });

    new Chart(document.getElementById("topCarsChart"), {
      type: "bar",
      data: {
        labels: topCarsData.labels || [],
        datasets: [
          {
            label: "Cars Rented",
            data: topCarsData.values || [],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    alert("Failed to load analytics dashboard.");
  }
});
