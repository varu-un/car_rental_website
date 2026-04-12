document.addEventListener("DOMContentLoaded", () => {
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
      const { ok, data } = await apiCall("/admin-login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      console.log("Admin login response:", data);

      if (!ok) {
        alert(data.message || "Login failed");
        return;
      }

      if (data.success) {
        window.location.href = "admin.html";
      } else {
        alert("Invalid admin credentials");
      }
    } catch (error) {
      console.error("Admin login error:", error);
      alert("Unable to login. Check backend server.");
    }
  });
});
