document.addEventListener("DOMContentLoaded", async () => {
  const API_BASE = "https://car-rental-website-ten-gamma.vercel.app/";

  const logoutBtn = document.getElementById("logoutBtn");
  const addressForm = document.getElementById("addressForm");
  const paymentForm = document.getElementById("paymentForm");

  async function loadAccount() {
    try {
      const [userRes, addressRes, paymentRes] = await Promise.all([
        fetch(`${API_BASE}/auth/me`, { credentials: "include" }),
        fetch(`${API_BASE}/user/addresses`, { credentials: "include" }),
        fetch(`${API_BASE}/user/payment-options`, { credentials: "include" }),
      ]);

      if (!userRes.ok) {
        window.location.href = "login.html";
        return;
      }

      const user = await userRes.json();
      const addresses = await addressRes.json();
      const payments = await paymentRes.json();

      document.getElementById("accountName").textContent = user.name || "-";
      document.getElementById("accountEmail").textContent = user.email || "-";

      const addressList = document.getElementById("addressList");
      const paymentList = document.getElementById("paymentList");

      addressList.innerHTML = addresses.length
        ? addresses
            .map(
              (a) => `
                <div class="booking-card">
                  <p><strong>${a.label || "Address"}</strong></p>
                  <p>${a.fullName || ""}</p>
                  <p>${a.line1 || ""} ${a.line2 || ""}</p>
                  <p>${a.city || ""}, ${a.state || ""} - ${a.postalCode || ""}</p>
                  <p>${a.country || "India"}</p>
                  <p>${a.phone || ""}</p>
                </div>
              `,
            )
            .join("")
        : `<p class="empty-message">No saved addresses.</p>`;

      paymentList.innerHTML = payments.length
        ? payments
            .map(
              (p) => `
                <div class="booking-card">
                  <p><strong>${p.type || "Payment"}</strong></p>
                  <p>${p.brand ? `${p.brand} ending in ${p.last4}` : p.upiIdMasked || "-"}</p>
                </div>
              `,
            )
            .join("")
        : `<p class="empty-message">No saved payment options.</p>`;
    } catch (error) {
      console.error("Account load error:", error);
    }
  }

  logoutBtn.addEventListener("click", async () => {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    window.location.href = "login.html";
  });

  addressForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const body = {
      label: document.getElementById("addressLabel").value.trim(),
      fullName: document.getElementById("addressFullName").value.trim(),
      phone: document.getElementById("addressPhone").value.trim(),
      line1: document.getElementById("addressLine1").value.trim(),
      line2: document.getElementById("addressLine2").value.trim(),
      city: document.getElementById("addressCity").value.trim(),
      state: document.getElementById("addressState").value.trim(),
      postalCode: document.getElementById("addressPostalCode").value.trim(),
    };

    const res = await fetch(`${API_BASE}/user/addresses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (res.ok) {
      addressForm.reset();
      loadAccount();
    } else {
      alert("Failed to save address");
    }
  });

  paymentForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const body = {
      type: document.getElementById("paymentType").value.trim(),
      brand: document.getElementById("paymentBrand").value.trim(),
      last4: document.getElementById("paymentLast4").value.trim(),
      upiIdMasked: document.getElementById("paymentUpiMasked").value.trim(),
    };

    const res = await fetch(`${API_BASE}/user/payment-options`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (res.ok) {
      paymentForm.reset();
      loadAccount();
    } else {
      alert("Failed to save payment option");
    }
  });

  loadAccount();
});
