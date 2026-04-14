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
      console.log(
        "[admin-login] Attempting admin login with username:",
        username,
      );

      const { ok, status, data } = await apiCall("/admin-login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      console.log("[admin-login] Response status:", status);
      console.log("[admin-login] Response data:", data);
      console.log("[admin-login] Response ok:", ok);

      if (!ok) {
        console.error("[admin-login] Login failed:", data?.message);
        alert(data?.message || "Login failed");
        return;
      }

      if (data?.success === true) {
        console.log(
          "[admin-login] ✅ Admin login successful, redirecting to admin.html",
        );
        // Wait a moment and then redirect
        await new Promise((resolve) => setTimeout(resolve, 300));
        console.log("[admin-login] Now redirecting...");
        window.location.replace("/admin.html");
        return; // Prevent further execution
      } else {
        console.error("[admin-login] ❌ Unexpected response:", data);
        alert("Invalid admin credentials");
      }
    } catch (error) {
      console.error("[admin-login] ❌ Login error:", error);
      alert("Unable to login. Check backend server: " + error.message);
    }
  });
});
