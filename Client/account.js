async function loadBookings() {
  try {
    const { ok, data } = await apiCall("/user/bookings");

    if (!ok) {
      console.error("Failed to load bookings");
      return;
    }

    const div = document.getElementById("accountBookings");

    if (!data || data.length === 0) {
      div.innerHTML =
        '<p style="padding: 20px; text-align: center; color: #6b6b6b;">No bookings found. <a href="index.html">Browse cars to make your first booking</a></p>';
      return;
    }

    div.innerHTML = data
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

loadBookings();
