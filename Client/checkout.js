document.addEventListener("DOMContentLoaded", () => {
  const summaryList = document.getElementById("summaryList");
  const totalPriceEl = document.getElementById("totalPrice");
  const pickupDate = document.getElementById("pickupDate");
  const returnDate = document.getElementById("returnDate");
  const daysInfo = document.getElementById("daysInfo");

  let cart = JSON.parse(localStorage.getItem("cart")) || [];

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
      summaryList.innerHTML = "<p>No cars selected</p>";
      totalPriceEl.textContent = "₹0";
      return;
    }

    const days = getDays();

    if (days <= 0) {
      totalPriceEl.textContent = "₹0";
      daysInfo.textContent = "Select valid dates";
      return;
    }

    let total = 0;
    daysInfo.textContent = `${days} day(s) rental`;

    cart.forEach((item) => {
      const itemTotal = item.price * item.quantity * days;
      total += itemTotal;

      const div = document.createElement("div");
      div.classList.add("summary-item");

      div.innerHTML = `
        <div>
          <strong>${item.name}</strong><br>
          ₹${item.price}/day × ${item.quantity} × ${days}
        </div>
        <div>₹${itemTotal.toFixed(2)}</div>
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

  // 🔥 PAYMENT HANDLER
  document
    .getElementById("bookingForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const amount = parseFloat(
        totalPriceEl.textContent.replace(/[^\d.]/g, ""),
      );

      if (!amount || amount <= 0) {
        alert("Please select valid dates");
        return;
      }

      const userData = {
        name: document.getElementById("fullName").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        location: document.getElementById("location").value,
        amount: amount,
      };

      try {
        // 🔥 STEP 1: CREATE ORDER
        const res = await fetch("http://localhost:5000/create-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ amount }),
        });

        const order = await res.json();

        // 🔥 STEP 2: OPEN RAZORPAY
        const options = {
          key: "YOUR_KEY_ID",
          amount: order.amount,
          currency: "INR",
          order_id: order.id,

          name: "Car Rentals",
          description: "Booking Payment",

          handler: async function (response) {
            // 🔥 STEP 3: VERIFY PAYMENT
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

            if (result.status === "success") {
              alert("✅ Payment Successful & Booking Saved");

              localStorage.removeItem("cart");
              window.location.href = "success.html";
            } else {
              alert("❌ Payment verification failed");
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
        };

        const rzp = new Razorpay(options);
        rzp.open();
      } catch (err) {
        console.error(err);
        alert("Payment failed. Try again.");
      }
    });
});
