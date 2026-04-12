// API Configuration
const API_CONFIG = {
  BASE_URL:
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:5000"
      : "https://car-rental-website-9tcu.onrender.com",
};

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const defaultOptions = {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  };

  const config = { ...defaultOptions, ...options };
  if (options.headers) {
    config.headers = { ...defaultOptions.headers, ...options.headers };
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error("API call error:", error);
    throw error;
  }
}
