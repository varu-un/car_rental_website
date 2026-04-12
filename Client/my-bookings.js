document.addEventListener("DOMContentLoaded", async () => {
  const API_BASE = "https://car-rental-website-ten-gamma.vercel.app/";
  const bookingsList = document.getElementById("myBookingsList");

  bookingsList.innerHTML = `<p class="empty-message">Loading bookings...</p>`;

  try {
    const res = await fetch(`${API_BASE}/user/bookings`, {
      credentials: "include",
    });

    if (!res.ok) {
      window.location.href = "login.html";
      return;
    }

    const bookings = await res.json();

    bookingsList.innerHTML = "";

    if (!bookings.length) {
      bookingsList.innerHTML = `<p class="empty-message">No bookings found.</p>`;
      return;
    }

    bookings.forEach((booking) => {
      const carNames = (booking.cars || [])
        .map((car) => `${car.name} x${car.quantity || 1}`)
        .join(", ");

      const div = document.createElement("div");
      div.className = "booking-card";

      div.innerHTML = `
        <h3>${booking.name}</h3>
        <p><strong>Location:</strong> ${booking.location}</p>
        <p><strong>Pickup:</strong> ${booking.pickupDate}</p>
        <p><strong>Return:</strong> ${booking.returnDate}</p>
        <p><strong>Days:</strong> ${booking.days}</p>
        <p><strong>Cars:</strong> ${carNames || "-"}</p>
        <p><strong>Total Cars:</strong> ${booking.totalCars}</p>
        <p><strong>Amount:</strong> ₹${booking.amount}</p>
        <p><strong>Status:</strong> ${booking.bookingStatus}</p>
      `;

      bookingsList.appendChild(div);
    });
  } catch (error) {
    console.error("Bookings error:", error);
    bookingsList.innerHTML = `<p class="empty-message">Failed to load bookings.</p>`;
  }
});
