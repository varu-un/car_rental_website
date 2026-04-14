document.addEventListener("DOMContentLoaded", () => {
  const bookingForm = document.getElementById("bookingForm");
  const summaryList = document.getElementById("summaryList");
  const totalPriceEl = document.getElementById("totalPrice");
  const pickupDateEl = document.getElementById("pickupDate");
  const returnDateEl = document.getElementById("returnDate");
  const daysInfo = document.getElementById("daysInfo");

  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  const today = new Date().toISOString().split("T")[0];
  if (pickupDateEl) pickupDateEl.min = today;
  if (returnDateEl) returnDateEl.min = today;

  function formatCurrency(value) {
    return `₹${Number(value || 0).toFixed(2)}`;
  }

  function getDays() {
    if (!pickupDateEl?.value || !returnDateEl?.value) return 0;

    const start = new Date(pickupDateEl.value);
    const end = new Date(returnDateEl.value);
    const diffInMs = end - start;
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    return diffInDays > 0 ? diffInDays : 0;
  }

  function normalizeCartItems(days) {
    return cart.map((item) => ({
      id: item.id || "",
      name: item.name || "Car",
      image: item.image || "",
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 1),
      subtotal:
        Number(item.price || 0) *
        Number(item.quantity || 1) *
        Number(days || 0),
    }));
  }

  function calculateTotal(items) {
    return items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  }

  function renderEmptyCart(message) {
    if (!summaryList || !totalPriceEl || !daysInfo) return;

    summaryList.innerHTML = `<p class="empty-message">${message}</p>`;
    totalPriceEl.textContent = "₹0.00";
    daysInfo.textContent = message;
  }

  function renderCart() {
    if (!summaryList || !totalPriceEl || !daysInfo) return;

    summaryList.innerHTML = "";

    if (!cart.length) {
      renderEmptyCart("Your cart is empty");
      return;
    }

    const days = getDays();

    if (days <= 0) {
      totalPriceEl.textContent = "₹0.00";
      daysInfo.textContent = "Select valid pickup and return dates";
      summaryList.innerHTML = cart
        .map(
          (item) => `
            <div class="summary-item">
              <div class="summary-item-left">
                <div class="summary-item-image">
                  <img src="${item.image || ""}" alt="${item.name || "Car"}">
                </div>
                <div class="summary-item-details">
                  <strong>${item.name || "Car"}</strong>
                  <p>₹${Number(item.price || 0)}/day × ${Number(item.quantity || 1)}</p>
                </div>
              </div>
              <div class="summary-item-price">Select dates</div>
            </div>
          `,
        )
        .join("");
      return;
    }

    const items = normalizeCartItems(days);
    const total = calculateTotal(items);

    daysInfo.textContent = `${days} day(s) rental`;

    items.forEach((item) => {
      const div = document.createElement("div");
      div.className = "summary-item";

      div.innerHTML = `
        <div class="summary-item-left">
          <div class="summary-item-image">
            <img src="${item.image}" alt="${item.name}">
          </div>
          <div class="summary-item-details">
            <strong>${item.name}</strong>
            <p>₹${item.price}/day × ${item.quantity} × ${days} day(s)</p>
          </div>
        </div>
        <div class="summary-item-price">${formatCurrency(item.subtotal)}</div>
      `;

      summaryList.appendChild(div);
    });

    totalPriceEl.textContent = formatCurrency(total);
  }

  function getFormData() {
    const days = getDays();
    const items = normalizeCartItems(days);
    const amount = calculateTotal(items);
    const upiId = document.getElementById("upiId")?.value.trim() || "";

    return {
      name: document.getElementById("fullName")?.value.trim() || "",
      email: document.getElementById("email")?.value.trim().toLowerCase() || "",
      phone: document.getElementById("phone")?.value.trim() || "",
      upiId,
      location: document.getElementById("location")?.value.trim() || "",
      pickupDate: pickupDateEl?.value || "",
      returnDate: returnDateEl?.value || "",
      days,
      cars: items.map(({ subtotal, ...car }) => car),
      totalCars: items.reduce(
        (sum, item) => sum + Number(item.quantity || 1),
        0,
      ),
      amount,
    };
  }

  function validateBookingData(userData) {
    if (!cart.length) {
      return "Your cart is empty.";
    }

    if (
      !userData.name ||
      !userData.email ||
      !userData.phone ||
      !userData.location
    ) {
      return "Please fill all required details.";
    }

    if (!userData.pickupDate || !userData.returnDate || !userData.days) {
      return "Please select valid pickup and return dates.";
    }

    if (!userData.amount || userData.amount <= 0) {
      return "Invalid booking amount.";
    }

    if (
      userData.upiId &&
      !/^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/i.test(userData.upiId)
    ) {
      return "Please enter a valid UPI ID or leave it blank.";
    }

    return null;
  }

  async function createOrder(amount) {
    console.log("[checkout] Creating order with amount:", amount);

    const { ok, status, data } = await apiCall("/create-order", {
      method: "POST",
      body: JSON.stringify({ amount }),
    });

    console.log("[checkout] Create order response:", { ok, status, data });

    if (!ok || !data?.success) {
      const errorMsg =
        data?.message || data?.error || "Unable to create payment order";
      console.error("[checkout] Order creation failed:", errorMsg);
      throw new Error(errorMsg);
      throw new Error("Invalid payment order received from server.");
    }

    return data;
  }

  async function verifyPayment(response, userData) {
    const { ok, data } = await apiCall("/verify-payment", {
      method: "POST",
      body: JSON.stringify({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
        userData,
      }),
    });

    if (!ok || !data?.success) {
      if (data?.message === "Unauthorized") {
        window.location.href = "./login.html";
      }
      throw new Error(data?.message || "Payment verification failed.");
    }

    return data;
  }

  async function startPayment(userData) {
    const order = await createOrder(userData.amount);

    const options = {
      key: order.key,
      amount: order.amount,
      currency: order.currency || "INR",
      order_id: order.orderId,
      name: "Car Rentals",
      description: "Booking Payment",
      prefill: {
        name: userData.name,
        email: userData.email,
        contact: userData.phone,
      },
      theme: {
        color: "#f9a826",
      },
      modal: {
        ondismiss() {
          console.log("[checkout] Razorpay popup closed");
        },
      },
      handler: async function (response) {
        try {
          await verifyPayment(response, userData);
          localStorage.removeItem("cart");
          alert("Payment successful! Booking confirmed.");
          window.location.href = "./my-bookings.html";
        } catch (error) {
          console.error("[checkout] Verification error:", error);
          alert(error.message || "Payment verification failed.");
        }
      },
    };

    const rzp = new Razorpay(options);

    rzp.on("payment.failed", function (response) {
      console.error("[checkout] Payment failed:", response);
      alert(
        response?.error?.description || "Payment failed. Please try again.",
      );
    });

    rzp.open();
  }

  pickupDateEl?.addEventListener("change", () => {
    if (returnDateEl) {
      returnDateEl.min = pickupDateEl.value || today;
      if (returnDateEl.value && returnDateEl.value <= pickupDateEl.value) {
        returnDateEl.value = "";
      }
    }
    renderCart();
  });

  returnDateEl?.addEventListener("change", renderCart);

  renderCart();

  bookingForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const userData = getFormData();
      const validationError = validateBookingData(userData);

      if (validationError) {
        alert(validationError);
        return;
      }

      await startPayment(userData);
    } catch (error) {
      console.error("[checkout] Checkout error:", error);
      alert(error.message || "Payment failed. Try again.");
    }
  });
});
