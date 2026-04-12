document.addEventListener("DOMContentLoaded", () => {
  const swiperEl = document.querySelector(".mySwiper");
  const cartIcon = document.querySelector(".cart-icon");
  const cartTab = document.querySelector(".cart-tab");
  const closeBtn = document.querySelector(".close-btn");
  const cardList = document.querySelector(".card-list");
  const cartList = document.querySelector(".cart-list");
  const cartTotal = document.querySelector(".cart-total");
  const cartValue = document.querySelector(".cart-value");
  const hamburger = document.querySelector(".hamburger");
  const mobileMenu = document.querySelector(".mobile-menu");
  const desktopNavLinks = document.querySelectorAll(".nav-link");
  const mobileNavLinks = document.querySelectorAll(".mobile-link");
  const allSectionLinks = [...desktopNavLinks, ...mobileNavLinks];
  const sections = document.querySelectorAll("section[id]");
  const API_BASE = "https://car-rental-website-9tcu.onrender.com";
  const signBtn = document.querySelector(".sign-btn");
  const mobileSignBtn = document.querySelector(".mobile-sign-btn");

  async function loadUserSession() {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        credentials: "include",
      });

      if (!res.ok) return;

      const user = await res.json();

      if (signBtn) {
        signBtn.innerHTML = `Hi, ${user.name.split(" ")[0]}`;
        signBtn.href = "account.html";
      }

      if (mobileSignBtn) {
        mobileSignBtn.innerHTML = `My Account`;
        mobileSignBtn.href = "account.html";
      }
    } catch (error) {
      console.error("Session check failed:", error);
    }
  }

  loadUserSession();

  let productList = [];
  let cartProduct = JSON.parse(localStorage.getItem("cart")) || [];

  if (swiperEl) {
    new Swiper(".mySwiper", {
      loop: true,
      slidesPerView: 1,
      spaceBetween: 24,
      speed: 700,
      autoHeight: true,
      grabCursor: true,
      navigation: {
        nextEl: "#next",
        prevEl: "#prev",
      },
      autoplay: {
        delay: 3500,
        disableOnInteraction: false,
      },
    });
  }

  function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cartProduct));
  }

  function getCartCount() {
    return cartProduct.reduce((sum, item) => sum + item.quantity, 0);
  }

  function updateCartBadge() {
    if (!cartValue) return;
    cartValue.textContent = getCartCount();
  }

  function updateCartTotal() {
    if (!cartTotal) return;

    const total = cartProduct.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    cartTotal.textContent = `₹${total.toFixed(2)}`;
  }

  function openCart() {
    if (cartTab) {
      cartTab.classList.add("cart-tab-active");
    }
  }

  function closeCart() {
    if (cartTab) {
      cartTab.classList.remove("cart-tab-active");
    }
  }

  function openMobileMenu() {
    if (mobileMenu) {
      mobileMenu.classList.add("mobile-menu-active");
    }
  }

  function closeMobileMenu() {
    if (mobileMenu) {
      mobileMenu.classList.remove("mobile-menu-active");
    }
  }

  function toggleMobileMenu() {
    if (mobileMenu) {
      mobileMenu.classList.toggle("mobile-menu-active");
    }
  }

  function setActiveNav(targetId) {
    allSectionLinks.forEach((link) => {
      const href = link.getAttribute("href");
      if (href === `#${targetId}`) {
        link.classList.add("active-pill");
      } else {
        link.classList.remove("active-pill");
      }
    });
  }

  function addToCart(product) {
    const existingProduct = cartProduct.find((item) => item.id === product.id);

    if (existingProduct) {
      existingProduct.quantity += 1;
    } else {
      cartProduct.push({
        ...product,
        quantity: 1,
      });
    }

    saveCart();
    renderCart();
    openCart();
  }

  function decreaseQuantity(index) {
    if (!cartProduct[index]) return;

    cartProduct[index].quantity -= 1;

    if (cartProduct[index].quantity <= 0) {
      cartProduct.splice(index, 1);
    }

    saveCart();
    renderCart();
  }

  function increaseQuantity(index) {
    if (!cartProduct[index]) return;

    cartProduct[index].quantity += 1;
    saveCart();
    renderCart();
  }

  function removeFromCart(index) {
    if (!cartProduct[index]) return;

    cartProduct.splice(index, 1);
    saveCart();
    renderCart();
  }

  window.removeFromCart = removeFromCart;
  window.increaseQuantity = increaseQuantity;
  window.decreaseQuantity = decreaseQuantity;

  function renderCart() {
    if (!cartList) return;

    cartList.innerHTML = "";

    if (cartProduct.length === 0) {
      cartList.innerHTML = `
        <p style="padding: 24px; text-align: center; color: #6b6b6b;">
          Your cart is empty
        </p>
      `;
      updateCartBadge();
      updateCartTotal();
      return;
    }

    cartProduct.forEach((item, index) => {
      const itemDiv = document.createElement("div");
      itemDiv.classList.add("cart-item");

      itemDiv.innerHTML = `
        <div class="cart-item-image">
          <img src="${item.image}" alt="${item.name}">
        </div>

        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <p>₹${item.price}/day</p>
          <p>Quantity: ${item.quantity}</p>
        </div>

        <div class="cart-item-actions" style="display:flex; gap:8px; flex-wrap:wrap;">
          <button onclick="decreaseQuantity(${index})">-</button>
          <button onclick="increaseQuantity(${index})">+</button>
          <button onclick="removeFromCart(${index})">Remove</button>
        </div>
      `;

      cartList.appendChild(itemDiv);
    });

    updateCartBadge();
    updateCartTotal();
  }

  function showCards() {
    if (!cardList) return;

    cardList.innerHTML = "";

    if (!productList.length) {
      cardList.innerHTML = `
        <p style="grid-column:1/-1; text-align:center; color:#6b6b6b;">
          No cars available right now.
        </p>
      `;
      return;
    }

    productList.forEach((product) => {
      const bookCard = document.createElement("div");
      bookCard.classList.add("book-card");

      bookCard.innerHTML = `
        <div class="card-image">
          <img src="${product.image}" alt="${product.name}">
        </div>
        <h4>${product.name}</h4>
        <p class="price">₹${product.price}/day</p>
        <button class="btn" type="button">Add to cart</button>
      `;

      const addBtn = bookCard.querySelector("button");
      addBtn.addEventListener("click", () => addToCart(product));

      cardList.appendChild(bookCard);
    });
  }

  if (cartIcon) {
    cartIcon.addEventListener("click", (e) => {
      e.preventDefault();
      if (cartTab) {
        cartTab.classList.toggle("cart-tab-active");
      }
      closeMobileMenu();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeCart();
    });
  }

  if (hamburger) {
    hamburger.addEventListener("click", () => {
      toggleMobileMenu();
      closeCart();
    });
  }

  allSectionLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");

      if (!href) return;

      if (href.startsWith("#")) {
        e.preventDefault();

        const targetSection = document.querySelector(href);

        if (targetSection) {
          targetSection.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });

          setActiveNav(href.replace("#", ""));
        }

        closeMobileMenu();
        closeCart();
        return;
      }

      closeMobileMenu();
      closeCart();
    });
  });

  document.addEventListener("click", (e) => {
    const clickedInsideCart =
      cartTab?.contains(e.target) || cartIcon?.contains(e.target);

    const clickedInsideMenu =
      mobileMenu?.contains(e.target) || hamburger?.contains(e.target);

    if (!clickedInsideCart) {
      closeCart();
    }

    if (!clickedInsideMenu) {
      closeMobileMenu();
    }
  });

  window.addEventListener("scroll", () => {
    let currentSectionId = "home";

    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 140;
      const sectionHeight = section.offsetHeight;

      if (
        window.scrollY >= sectionTop &&
        window.scrollY < sectionTop + sectionHeight
      ) {
        currentSectionId = section.getAttribute("id");
      }
    });

    setActiveNav(currentSectionId);
  });

  fetch("products.json")
    .then((res) => {
      if (!res.ok) {
        throw new Error("Failed to load products.json");
      }
      return res.json();
    })
    .then((data) => {
      productList = data.map((product) => ({
        ...product,
        price: Number(product.price),
      }));

      showCards();
      renderCart();
    })
    .catch((error) => {
      console.error("Error loading products:", error);

      if (cardList) {
        cardList.innerHTML = `
          <p style="grid-column:1/-1; text-align:center; color:#b00020;">
            Unable to load cars right now.
          </p>
        `;
      }
    });

  updateCartBadge();
  updateCartTotal();
  setActiveNav("home");
});
