document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "https://car-rental-website-ten-gamma.vercel.app/";

  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");

  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("fullName")?.value.trim();
      const email = document.getElementById("email")?.value.trim();
      const password = document.getElementById("password")?.value.trim();

      if (!name || !email || !password) {
        alert("Please fill all fields.");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.message || "Signup failed");
          return;
        }

        alert("Signup successful");
        window.location.href = "account.html";
      } catch (error) {
        console.error("Signup error:", error);
        alert("Signup failed");
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("loginEmail")?.value.trim();
      const password = document.getElementById("loginPassword")?.value.trim();

      if (!email || !password) {
        alert("Please fill all fields.");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.message || "Login failed");
          return;
        }

        alert("Login successful");
        window.location.href = "account.html";
      } catch (error) {
        console.error("Login error:", error);
        alert("Login failed");
      }
    });
  }
});
