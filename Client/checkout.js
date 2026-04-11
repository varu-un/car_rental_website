document.addEventListener("DOMContentLoaded", () => {
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
      const itemTotal = item.price * quantity * days;
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
        <div class="summary-item-price">₹${itemTotal.toFixed(2)}</div>
      `;

      summaryList.appendChild(div);
    });

    totalPriceEl.textContent = `₹${total.toFixed(2)}`;
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

    if (!amount || amount <= 0) {
      alert("Please select valid dates");
      return;
    }

    const userData = {
      name: document.getElementById("fullName").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      location: document.getElementById("location").value.trim(),
      amount,
    };

    try {
      const res = await fetch("http://localhost:5000/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Create order failed:", errorText);
        alert("Unable to create order.");
        return;
      }

      const order = await res.json();
      console.log("Order response:", order);

      if (!order || !order.id || !order.amount) {
        console.error("Invalid order response:", order);
        alert("Invalid order received from server.");
        return;
      }

      const options = {
        key: "rzp_test_ScFjfRPvIvaxaK",
        amount: order.amount,
        currency: "INR",
        order_id: order.id,
        name: "Car Rentals",
        description: "Booking Payment",

        handler: async function (response) {
          try {
            const verifyRes = await fetch(
              "http://localhost:5000/verify-payment",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  ...response,
                  userData,
                }),
              },
            );

            const result = await verifyRes.json();
            console.log("Verify response:", result);

            if (result.status === "success") {
              alert("Payment successful and booking saved");
              localStorage.removeItem("cart");
              window.location.href = "success.html";
            } else {
              alert("Payment verification failed");
            }
          } catch (verifyError) {
            console.error("Verification error:", verifyError);
            alert("Payment verification failed.");
          }
        },

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
      };

      const rzp = new Razorpay(options);

      rzp.on("payment.failed", function (response) {
        console.error("Payment failed:", response.error);
        alert(response.error.description || "Payment Failed");
      });

      rzp.open();
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Payment failed. Try again.");
    }
  });
});
