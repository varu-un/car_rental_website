const API_CONFIG = {
  BASE_URL: (() => {
    const hostname = window.location.hostname;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:5000";
    }

    return window.location.origin;
  })(),
};

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

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    console.error("API call error:", error);
    throw error;
  }
}
