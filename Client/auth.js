document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");

  // SIGNUP
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("fullName").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();

      if (!name || !email || !password) {
        alert("Please fill in all fields");
        return;
      }

      try {
        const { ok, data } = await apiCall("/auth/signup", {
          method: "POST",
          body: JSON.stringify({ name, email, password }),
        });

        if (!ok) {
          alert(data.message || "Signup failed");
          return;
        }

        alert("Signup successful! Redirecting...");
        // Use absolute URL to ensure same-domain navigation
        setTimeout(() => {
          window.location.href = window.location.origin + "/index.html";
        }, 500);
      } catch (error) {
        console.error("Signup error:", error);
        alert("Signup failed: " + error.message);
      }
    });
  }

  // LOGIN
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value.trim();

      if (!email || !password) {
        alert("Please enter both email and password");
        return;
      }

      try {
        const { ok, data } = await apiCall("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        if (!ok) {
          alert(data.message || "Login failed");
          return;
        }

        alert("Login successful! Redirecting...");
        // Use absolute URL to ensure same-domain navigation
        setTimeout(() => {
          window.location.href = window.location.origin + "/index.html";
        }, 500);
      } catch (error) {
        console.error("Login error:", error);
        alert("Login failed: " + error.message);
      }
    });
  }
});
