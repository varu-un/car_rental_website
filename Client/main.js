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
  alert("Added to cart");
}

function showCards() {
  const cardList = document.querySelector(".card-list");

  productList.forEach((product) => {
    const div = document.createElement("div");
    div.classList.add("book-card");

    div.innerHTML = `
      <img src="${product.image}">
      <h4>${product.name}</h4>
      <p>₹${product.price}/day</p>
      <button>Add to cart</button>
    `;

    div.querySelector("button").onclick = () => addToCart(product);

    cardList.appendChild(div);
  });
}

fetch("products.json")
  .then((res) => res.json())
  .then((data) => {
    productList = data;
    showCards();
  });

function showCards() {
  productList.forEach((product) => {
    const bookCard = document.createElement("div");
    bookCard.classList.add("book-card");

    bookCard.innerHTML = `
      <div class="card-image">
        <img src="${product.image}">
      </div>
      <h4>${product.name}</h4>
      <h4>₹${product.price}/day</h4>
      <button class="btn">Add to cart</button>
    `;

    bookCard.querySelector("button").onclick = () => {
      addToCart(product);
    };

    cardList.appendChild(bookCard);
  });
}

fetch("products.json")
  .then((res) => res.json())
  .then((data) => {
    productList = data.map((p) => ({
      ...p,
      price: parseFloat(p.price.replace(/[^\d.]/g, "")),
    }));
    showCards();
    renderCart();
  });
