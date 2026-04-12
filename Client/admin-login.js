document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "https://car-rental-website-ten-gamma.vercel.app/"; // replace this
  const form = document.getElementById("adminLoginForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("adminUsername").value.trim();
    const password = document.getElementById("adminPassword").value.trim();

    if (!username || !password) {
      alert("Please enter username and password.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Login failed.");
        return;
      }

      if (data.success) {
        localStorage.setItem("isAdminLoggedIn", "true");
        window.location.href = "admin.html";
      } else {
        alert("Invalid credentials.");
      }
    } catch (error) {
      console.error("Admin login error:", error);
      alert("Unable to login.");
    }
  });
});
