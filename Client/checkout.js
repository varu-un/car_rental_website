document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "https://car-rental-website-ten-gamma.vercel.app/";

  const bookingForm = document.getElementById("bookingForm");
  const summaryList = document.getElementById("summaryList");
  const totalPriceEl = document.getElementById("totalPrice");
  const pickupDate = document.getElementById("pickupDate");
  const returnDate = document.getElementById("returnDate");
  const daysInfo = document.getElementById("daysInfo");

  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  const today = new Date().toISOString().split("T")[0];
  pickupDate.min = today;
  returnDate.min = today;

  function getDays() {
    if (!pickupDate.value || !returnDate.value) return 0;

    const start = new Date(pickupDate.value);
    const end = new Date(returnDate.value);

    const diff = (end - start) / (1000 * 60 * 60 * 24);
    return diff > 0 ? diff : 0;
  }

  function formatCurrency(value) {
    return `₹${Number(value).toFixed(2)}`;
  }

  function renderCart() {
    summaryList.innerHTML = "";

    if (cart.length === 0) {
      summaryList.innerHTML = `<p class="empty-message">No cars selected</p>`;
      totalPriceEl.textContent = "₹0.00";
      daysInfo.textContent = "Your cart is empty";
      return;
    }

    const days = getDays();

    if (days <= 0) {
      totalPriceEl.textContent = "₹0.00";
      daysInfo.textContent = "Select valid dates";
      return;
    }

    let total = 0;
    daysInfo.textContent = `${days} day(s) rental`;

    cart.forEach((item) => {
      const quantity = item.quantity || 1;
      const itemTotal = Number(item.price) * quantity * days;
      total += itemTotal;

      const div = document.createElement("div");
      div.classList.add("summary-item");

      div.innerHTML = `
        <div class="summary-item-left">
          <div class="summary-item-image">
            <img src="${item.image}" alt="${item.name}">
          </div>
          <div class="summary-item-details">
            <strong>${item.name}</strong>
            <p>₹${item.price}/day × ${quantity} × ${days} day(s)</p>
          </div>
        </div>
        <div class="summary-item-price">${formatCurrency(itemTotal)}</div>
      `;

      summaryList.appendChild(div);
    });

    totalPriceEl.textContent = formatCurrency(total);
  }

  pickupDate.addEventListener("change", () => {
    returnDate.min = pickupDate.value;
    renderCart();
  });

  returnDate.addEventListener("change", renderCart);

  renderCart();

  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const amount = parseFloat(totalPriceEl.textContent.replace(/[^\d.]/g, ""));
    const days = getDays();

    if (!cart.length) {
      alert("Your cart is empty.");
      return;
    }

    if (!amount || amount <= 0 || !days) {
      alert("Please select valid pickup and return dates.");
      return;
    }

    const userData = {
      name: document.getElementById("fullName").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      location: document.getElementById("location").value.trim(),
      pickupDate: pickupDate.value,
      returnDate: returnDate.value,
      days,
      cars: cart,
      totalCars: cart.reduce((sum, item) => sum + (item.quantity || 1), 0),
      amount,
      paymentMethodType: "",
      paymentBrand: "",
      paymentLast4: "",
    };

    if (
      !userData.name ||
      !userData.email ||
      !userData.phone ||
      !userData.location
    ) {
      alert("Please fill all required details.");
      return;
    }

    let currentUser = null;

    try {
      const meRes = await fetch(`${API_BASE}/auth/me`, {
        credentials: "include",
      });

      if (meRes.ok) {
        currentUser = await meRes.json();
      }
    } catch (error) {
      console.error("Session check failed:", error);
    }

    try {
      const orderRes = await fetch(`${API_BASE}/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ amount }),
      });

      if (!orderRes.ok) {
        const errorText = await orderRes.text();
        console.error("Create order failed:", errorText);
        alert("Unable to create payment order.");
        return;
      }

      const order = await orderRes.json();

      if (!order?.id || !order?.amount) {
        console.error("Invalid order response:", order);
        alert("Invalid payment order received.");
        return;
      }

      const options = {
        key: "rzp_test_ScFjfRPvIvaxaK",
        amount: order.amount,
        currency: "INR",
        order_id: order.id,
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
          ondismiss: function () {
            console.log("Razorpay popup closed by user");
          },
        },
        handler: async function (response) {
          try {
            const verifyRes = await fetch(`${API_BASE}/verify-payment`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                ...response,
                userData,
                userId: currentUser?._id || currentUser?.id || null,
              }),
            });

            const result = await verifyRes.json();
            console.log("Verify response:", result);

            if (result.status === "success") {
              alert("Payment successful and booking saved.");
              localStorage.removeItem("cart");

              if (currentUser) {
                window.location.href = "mybookings.html";
              } else {
                window.location.href = "success.html";
              }
            } else {
              alert("Payment verification failed.");
            }
          } catch (verifyError) {
            console.error("Verification error:", verifyError);
            alert("Payment verification failed.");
          }
        },
      };

      const rzp = new Razorpay(options);

      rzp.on("payment.failed", function (response) {
        console.error("Payment failed:", response);
        alert(response?.error?.description || "Payment failed. Try again.");
      });

      rzp.open();
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Payment failed. Try again.");
    }
  });
});
