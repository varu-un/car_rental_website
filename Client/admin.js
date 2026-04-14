document.addEventListener("DOMContentLoaded", async () => {
  console.log("[admin.js] Admin dashboard loading...");

  // Check if admin is authenticated
  const checkAuth = async () => {
    try {
      console.log("[admin.js] Checking admin authentication...");
      const { ok, status, data } = await apiCall("/admin/check-auth");

      console.log("[admin.js] Auth check response:", {
        ok,
        status,
        message: data?.message,
        authenticated: data?.authenticated,
      });

      if (!ok) {
        console.error(
          "[admin.js] ❌ Admin not authenticated (status:",
          status + ")",
        );
        console.error("[admin.js] Auth response:", data);

        // For debugging: check cookies
        console.log("[admin.js] Document cookies:", document.cookie);

        console.log("[admin.js] Redirecting to admin-login");
        window.location.href = "/admin-login.html";
        return false;
      }
      console.log("[admin.js] ✅ Admin authenticated");
      return true;
    } catch (error) {
      console.error("[admin.js] Auth check error:", error);
      console.log("[admin.js] Redirecting to admin-login (error)");
      window.location.href = "/admin-login.html";
      return false;
    }
  };

  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) return;

  const logoutBtn = document.getElementById("logoutBtn");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const bookingTableBody = document.getElementById("bookingTableBody");

  let allBookings = [];

  function formatAmount(value) {
    return `₹${Number(value || 0).toFixed(2)}`;
  }

  logoutBtn.addEventListener("click", async () => {
    console.log("[admin.js] Logging out...");
    await apiCall("/admin-logout", { method: "POST" });
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
    console.log("[admin.js] Loading analytics data...");
    const [
      summaryResult,
      monthlyResult,
      topCarsResult,
      bookingsResult,
      newslettersResult,
    ] = await Promise.all([
      apiCall("/analytics/summary"),
      apiCall("/analytics/monthly-revenue"),
      apiCall("/analytics/top-cars"),
      apiCall("/admin/bookings"),
      apiCall("/admin/newsletters"),
    ]);

    console.log("[admin.js] Analytics responses:", {
      summary: summaryResult.ok,
      monthly: monthlyResult.ok,
      topCars: topCarsResult.ok,
      bookings: bookingsResult.ok,
    });

    if (
      !summaryResult.ok ||
      !monthlyResult.ok ||
      !topCarsResult.ok ||
      !bookingsResult.ok
    ) {
      console.error("[admin.js] ❌ Some analytics endpoints failed:", {
        summary: {
          ok: summaryResult.ok,
          status: summaryResult.status,
          message: summaryResult.data?.message,
        },
        monthly: {
          ok: monthlyResult.ok,
          status: monthlyResult.status,
          message: monthlyResult.data?.message,
        },
        topCars: {
          ok: topCarsResult.ok,
          status: topCarsResult.status,
          message: topCarsResult.data?.message,
        },
        bookings: {
          ok: bookingsResult.ok,
          status: bookingsResult.status,
          message: bookingsResult.data?.message,
        },
      });
      alert("Failed to load dashboard data. Check console for details.");
      throw new Error("Failed to load dashboard data");
    }

    const summary = summaryResult.data;
    const monthlyData = monthlyResult.data;
    const topCarsData = topCarsResult.data;
    const bookingsData = bookingsResult.data;
    const newslettersData = newslettersResult.ok
      ? newslettersResult.data
      : { newsletters: [] };

    const bookings = bookingsData.bookings || bookingsData;

    allBookings = bookings;

    console.log("[admin.js] ✅ Dashboard data loaded successfully:", {
      totalRevenue: summary.totalRevenue,
      totalBookings: summary.totalBookings,
      totalCarsRented: summary.totalCarsRented,
      avgBookingValue: summary.avgBookingValue,
      bookingsCount: bookings.length,
    });

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

    // Render newsletters table
    const newsletterTableBody = document.getElementById("newsletterTableBody");
    if (newsletterTableBody) {
      newsletterTableBody.innerHTML = "";
      const newsletters = newslettersData.newsletters || [];

      if (newsletters.length === 0) {
        newsletterTableBody.innerHTML =
          '<tr><td colspan="2" style="text-align: center; padding: 20px;">No subscribers yet</td></tr>';
      } else {
        newsletters.forEach((newsletter) => {
          const tr = document.createElement("tr");
          const date = new Date(newsletter.subscribedAt).toLocaleDateString();
          tr.innerHTML = `
            <td>${newsletter.email || ""}</td>
            <td>${date}</td>
          `;
          newsletterTableBody.appendChild(tr);
        });
      }
    }

    // Newsletter export button
    const exportNewslettersBtn = document.getElementById(
      "exportNewslettersBtn",
    );
    if (exportNewslettersBtn) {
      exportNewslettersBtn.addEventListener("click", () => {
        const newsletters = newslettersData.newsletters || [];
        if (!newsletters.length) {
          alert("No newsletter subscribers to export.");
          return;
        }

        const headers = ["Email", "Subscribed At"];
        const rows = newsletters.map((newsletter) => [
          newsletter.email || "",
          new Date(newsletter.subscribedAt).toLocaleString(),
        ]);

        const csvContent = [headers, ...rows]
          .map((row) =>
            row
              .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
              .join(","),
          )
          .join("\n");

        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "newsletter-subscribers.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }

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
    console.error("[admin.js] ❌ Dashboard error:", error.message);
    console.error("[admin.js] Full error:", error);
    alert("Failed to load analytics dashboard: " + error.message);
  }
});
