async function loadBookings() {
  try {
    console.log("[loadBookings] Starting to fetch bookings...");
    const { ok, data } = await apiCall("/user/bookings");
    const bookings = data?.bookings || [];

    console.log("[loadBookings] API response - ok:", ok, "data:", data);

    if (!ok) {
      console.error("[loadBookings] Failed to load bookings");
      return;
    }

    const div = document.getElementById("accountBookings");

    if (bookings.length === 0) {
      console.log("[loadBookings] No bookings found");
      div.innerHTML =
        '<p style="padding: 20px; text-align: center; color: #6b6b6b;">No bookings found. <a href="index.html">Browse cars to make your first booking</a></p>';
      return;
    }

    console.log("[loadBookings] Found", bookings.length, "bookings");

    div.innerHTML = bookings
      .map((b) => {
        const statusBadgeColor =
          b.bookingStatus === "confirmed"
            ? "#10b981"
            : b.bookingStatus === "completed"
              ? "#3b82f6"
              : "#ef4444";

        const carsHTML = (b.cars || [])
          .map(
            (car) => `
            <div class="booking-car-item">
              ${car.image ? `<img src="${car.image}" alt="${car.name}" class="car-thumbnail">` : '<div class="car-thumbnail-placeholder">No Image</div>'}
              <div class="car-details">
                <h4>${car.name}</h4>
                <p class="car-price">₹${(car.price || 0).toFixed(2)}/day</p>
                <p class="car-quantity">Quantity: ${car.quantity || 1}</p>
              </div>
            </div>
          `,
          )
          .join("");

        return `
          <div class="booking-card">
            <div class="booking-header">
              <div>
                <h3>${b.name}</h3>
                <p class="booking-email">${b.email}</p>
              </div>
              <span class="status-badge" style="background-color: ${statusBadgeColor}">
                ${b.bookingStatus || "confirmed"}
              </span>
            </div>

            <div class="booking-details-grid">
              <div class="detail-group">
                <label>Pickup Date</label>
                <p>${b.pickupDate}</p>
              </div>
              <div class="detail-group">
                <label>Return Date</label>
                <p>${b.returnDate}</p>
              </div>
              <div class="detail-group">
                <label>Rental Duration</label>
                <p>${b.days || 0} day(s)</p>
              </div>
              <div class="detail-group">
                <label>Location</label>
                <p>${b.location}</p>
              </div>
              <div class="detail-group">
                <label>Phone</label>
                <p>${b.phone}</p>
              </div>
              <div class="detail-group">
                <label>Payment ID</label>
                <p class="payment-id">${b.paymentId || "N/A"}</p>
              </div>
            </div>

            <div class="booking-cars-section">
              <h4>Cars Rented (${b.totalCars || 0})</h4>
              <div class="cars-list">
                ${carsHTML}
              </div>
            </div>

            <div class="booking-footer">
              <div class="total-amount">
                <span>Total Amount</span>
                <strong>₹${(b.amount || 0).toFixed(2)}</strong>
              </div>
              <p class="booking-date">Booked on ${new Date(b.bookingDate || b.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Error loading bookings:", error);
  }
}

// Setup logout button and load user info
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[account.js] Page loaded, initializing...");

  // Load user session info
  try {
    const { ok, data } = await apiCall("/auth/me");
    const user = data?.user || null;
    if (ok && user) {
      console.log("[account.js] User session loaded:", user);
      document.getElementById("accountName").textContent = user.name || "-";
      document.getElementById("accountEmail").textContent = user.email || "-";
      document.getElementById("addressCount").textContent = (
        user.addresses || []
      ).length;
      document.getElementById("paymentCount").textContent = (
        user.savedPayments || []
      ).length;
    }
  } catch (error) {
    console.error("[account.js] Error loading user session:", error);
  }

  // Setup logout button
  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        console.log("[logout] Logging out...");
        const { ok } = await apiCall("/auth/logout", {
          method: "POST",
        });

        if (ok) {
          console.log("[logout] Logout successful, redirecting to home");
          // Redirect to home page
          window.location.href = window.location.origin + "/index.html";
        } else {
          console.error("[logout] Logout failed");
          alert("Logout failed");
        }
      } catch (error) {
        console.error("[logout] Logout error:", error);
        alert("Logout error: " + error.message);
      }
    });
  }

  // Load bookings
  console.log("[account.js] Loading bookings...");
  await loadBookings();

  // Setup Address Form
  const addressForm = document.getElementById("addressForm");
  if (addressForm) {
    addressForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        console.log("[account.js] Saving address...");
        const { ok } = await apiCall("/user/addresses", {
          method: "POST",
          body: JSON.stringify({
            label: document.getElementById("addressLabel").value,
            fullName: document.getElementById("addressFullName").value,
            phone: document.getElementById("addressPhone").value,
            line1: document.getElementById("addressLine1").value,
            line2: document.getElementById("addressLine2").value,
            city: document.getElementById("addressCity").value,
            state: document.getElementById("addressState").value,
            postalCode: document.getElementById("addressPostalCode").value,
          }),
        });

        if (ok) {
          console.log("[account.js] Address saved successfully");
          alert("Address saved successfully!");
          addressForm.reset();
          // Reload user info to update count
          const { ok: ok2, data } = await apiCall("/auth/me");
          const user = data?.user || null;
          if (ok2 && user) {
            document.getElementById("addressCount").textContent = (
              user.addresses || []
            ).length;
          }
        } else {
          alert("Failed to save address");
        }
      } catch (error) {
        console.error("[account.js] Address save error:", error);
        alert("Error: " + error.message);
      }
    });
  }

  // Setup Payment Form
  const paymentForm = document.getElementById("paymentForm");
  if (paymentForm) {
    paymentForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        console.log("[account.js] Saving payment option...");
        const { ok } = await apiCall("/user/payment-options", {
          method: "POST",
          body: JSON.stringify({
            type: document.getElementById("paymentType").value,
            brand: document.getElementById("paymentBrand").value,
            last4: document.getElementById("paymentLast4").value,
            upiIdMasked: document.getElementById("paymentUpiMasked").value,
          }),
        });

        if (ok) {
          console.log("[account.js] Payment option saved successfully");
          alert("Payment option saved successfully!");
          paymentForm.reset();
          // Reload user info to update count
          const { ok: ok2, data } = await apiCall("/auth/me");
          const user = data?.user || null;
          if (ok2 && user) {
            document.getElementById("paymentCount").textContent = (
              user.savedPayments || []
            ).length;
          }
        } else {
          alert("Failed to save payment option");
        }
      } catch (error) {
        console.error("[account.js] Payment save error:", error);
        alert("Error: " + error.message);
      }
    });
  }
});
