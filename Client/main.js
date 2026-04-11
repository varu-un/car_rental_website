var swiper = new Swiper(".mySwiper", {
  loop: true,
  navigation: {
    nextEl: "#next",
    prevEl: "#prev",
  },
});

const cartIcon = document.querySelector(".cart-icon");
const cartTab = document.querySelector(".cart-tab");
const closeBtn = document.querySelector(".close-btn");
const cardList = document.querySelector(".card-list");
const cartList = document.querySelector(".cart-list");
const cartTotal = document.querySelector(".cart-total");
const cartValue = document.querySelector(".cart-value");

let productList = [];
let cartProduct = JSON.parse(localStorage.getItem("cart")) || [];

function updateCart() {
  localStorage.setItem("cart", JSON.stringify(cartProduct));
}

function addToCart(product) {
  const existing = cartProduct.find((p) => p.id === product.id);

  if (existing) {
    existing.quantity++;
  } else {
    cartProduct.push({ ...product, quantity: 1 });
  }

  updateCart();
  renderCart();
  alert("✅ Added to cart");
}

function showCards() {
  if (!cardList) return;
  cardList.innerHTML = "";

  productList.forEach((product) => {
    const bookCard = document.createElement("div");
    bookCard.classList.add("book-card");

    bookCard.innerHTML = `
      <div class="card-image">
        <img src="${product.image}" alt="${product.name}">
      </div>
      <h4>${product.name}</h4>
      <p class="price">₹${product.price}/day</p>
      <button class="btn">Add to cart</button>
    `;

    bookCard.querySelector("button").onclick = () => {
      addToCart(product);
    };

    cardList.appendChild(bookCard);
  });
}

function renderCart() {
  if (!cartList) return;

  cartList.innerHTML = "";
  cartValue.textContent = cartProduct.length;

  if (cartProduct.length === 0) {
    cartList.innerHTML =
      "<p style='padding: 20px; text-align: center;'>Cart is empty</p>";
    if (cartTotal) cartTotal.textContent = "₹0";
    return;
  }

  let total = 0;

  cartProduct.forEach((item, index) => {
    const itemDiv = document.createElement("div");
    itemDiv.classList.add("cart-item");
    itemDiv.innerHTML = `
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <p>₹${item.price}/day × ${item.quantity}</p>
      </div>
      <div class="cart-item-actions">
        <button onclick="removeFromCart(${index})">Remove</button>
      </div>
    `;
    cartList.appendChild(itemDiv);
    total += item.price * item.quantity;
  });

  if (cartTotal) cartTotal.textContent = `₹${total.toFixed(2)}`;
}

function removeFromCart(index) {
  cartProduct.splice(index, 1);
  updateCart();
  renderCart();
}

// Cart panel toggle
if (cartIcon) {
  cartIcon.addEventListener("click", (e) => {
    e.preventDefault();
    cartTab.classList.toggle("cart-tab-active");
  });
}

if (closeBtn) {
  closeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    cartTab.classList.remove("cart-tab-active");
  });
}

// Load products
fetch("products.json")
  .then((res) => res.json())
  .then((data) => {
    productList = data;
    showCards();
    renderCart();
  })
  .catch((err) => console.error("Error loading products:", err));
