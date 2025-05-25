// Register service worker for offline support
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(console.error);
}

// 🛠 Configurable reconnection logic thresholds
const RECONNECT_DELAY_MS = 2000;        // Retry every 2s
const CONNECTING_THRESHOLD_MS = 2500;   // Show "Conectando" after 2.5s
const FAILURE_THRESHOLD_MS = 5000;      // Show help modal after 5s

document.addEventListener("DOMContentLoaded", () => {
  // 🔄 Internal state
  let suppressChange = false;
  let eventSource;
  let lastEventTime = Date.now();
  let reconnectStartTime = null;
  let currentDisplayMode = "";
  let blinkEnabled = false;
  let stopwatchState = "reset"; // "running", "paused", "reset"
  let deferredPrompt;

  // 🌐 Get URL from input or URL parameter
  function getUrl() {
    const params = new URLSearchParams(window.location.search);
    const urlFromParam = params.get("clock");
    const manualUrl = document.getElementById("urlInput")?.value;
    return manualUrl || urlFromParam || "http://reloj.local";
  }

  // 🎨 Toggle blur effect on UI elements
  function setBlur(active) {
    document.getElementById("displayText")?.classList.toggle("blurred", active);
    document.getElementById("stopwatchTime")?.classList.toggle("blurred", active);
  }

  // 🌓 Dark mode logic
  const darkSwitch = document.getElementById("darkModeSwitch");
  const updateTheme = (forceDark) => {
    document.documentElement.setAttribute("data-bs-theme", forceDark ? "dark" : "light");
  };
  if (darkSwitch) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    darkSwitch.checked = prefersDark;
    updateTheme(prefersDark);
    darkSwitch.addEventListener("change", () => updateTheme(darkSwitch.checked));
  }

  // 📟 Display mode change
  document.querySelectorAll("input[name='displayMode']").forEach((radio) => {
    radio.addEventListener("change", (e) => {
      if (suppressChange || !e.target.checked) return;
      fetch(`${getUrl()}/select/sel_display_mode/set?option=${e.target.value}`, { method: "POST" }).catch(console.error);
    });
  });

  // ➕➖ Stopwatch buttons
  document.getElementById("decreaseBtn")?.addEventListener("click", () => {
    sendCustomCommand(`/number/stopwatch_add_seconds/set?value=-60`);
    sendCustomCommand(`/button/stopwatch_add_time/press`);
  });
  document.getElementById("increaseBtn")?.addEventListener("click", () => {
    sendCustomCommand(`/number/stopwatch_add_seconds/set?value=60`);
    sendCustomCommand(`/button/stopwatch_add_time/press`);
  });

  // 🟢🟡🔴 Connection status pill
  function updateConnectionStatus(state) {
    const el = document.getElementById("connectionStatus");
    const iconMap = {
      connected: ["bg-success", "bi-check-circle-fill", "Conectado"],
      connecting: ["bg-warning", "bi-exclamation-circle-fill", "Conectando"],
      disconnected: ["bg-danger", "bi-x-circle-fill", "Desconectado"],
    };
    const [color, icon, label] = iconMap[state] || iconMap.disconnected;
    el.className = `badge rounded-pill ${color}`;
    el.innerHTML = `<i class='bi ${icon} me-1'></i> ${label}`;
  }

  // 🔄 UI updates
  function syncDisplayModeRadio(value) {
    currentDisplayMode = value;
    updatePantallaClass();
    const radio = document.querySelector(`input[name='displayMode'][value='${value}']`);
    if (radio) {
      suppressChange = true;
      radio.checked = true;
      suppressChange = false;
    }
  }

  function updatePantallaClass() {
    const el = document.getElementById("displayText");
    el.classList.toggle("pantalla-sign", currentDisplayMode === "sign");
    el.classList.toggle("pantalla-blink", blinkEnabled);
  }

  function updateStopwatchClass() {
    document.getElementById("stopwatchTime")?.classList.toggle("stopwatch-blink", stopwatchState === "paused");
  }

  function updateCountdownOutput(value) {
    document.getElementById("countdownOutput").textContent = `${value} min`;
  }

  // 💾 App install prompt
  const installBtn = document.getElementById("installBtn");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn?.classList.remove("d-none");
  });

  installBtn?.addEventListener("click", () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(() => {
        deferredPrompt = null;
        installBtn.classList.add("d-none");
      });
    }
  });

  // 🆘 Help modal for insecure content warning
  function showReconnectHelp() {
    const ua = navigator.userAgent;
    const help = [];

    if (/Chrome/.test(ua)) {
      help.push("Haz clic en el candado (🔒) en la barra de direcciones, luego en 'Configuración del sitio', y permite contenido no seguro.");
    } else if (/Firefox/.test(ua)) {
      help.push("Haz clic en el icono del escudo (🛡️) y desactiva la protección para esta página.");
    } else if (/Safari/.test(ua)) {
      help.push("Ve a Preferencias > Avanzado > Activa 'Mostrar el menú de desarrollo', luego desde 'Desarrollo' > 'Desactivar protección contra contenido inseguro'.");
    } else {
      help.push("Permite contenido mixto (HTTP) en la configuración del navegador.");
    }

    const list = document.getElementById("mixedContentInstructions");
    list.innerHTML = "";
    help.forEach(txt => list.innerHTML += `<li>${txt}</li>`);

    new bootstrap.Modal(document.getElementById("reconnectModal")).show();
  }

  // 📤 Share dialog logic
  document.getElementById("shareBtn")?.addEventListener("click", () => {
    const shareUrl = `${location.origin}${location.pathname}?clock=${encodeURIComponent(getUrl())}`;
    QRCode.toCanvas(document.getElementById("qrCanvas"), shareUrl, { width: 160 });
    document.getElementById("whatsappShare").href = `https://wa.me/?text=${encodeURIComponent("Reloj: " + shareUrl)}`;
    new bootstrap.Modal(document.getElementById("shareModal")).show();
  });

  // ⏯️ Stopwatch buttons
  document.getElementById("startPauseBtn").onclick = () => sendCustomCommand("/button/stopwatch_start_pause/press");
  document.getElementById("resetBtn").onclick = () => sendCustomCommand("/button/stopwatch_reset/press");

  function sendCustomCommand(endpoint) {
    fetch(`${getUrl()}${endpoint}`, { method: "POST" }).catch(console.error);
  }

  document.getElementById("saveSettingsBtn")?.addEventListener("click", () => location.reload());

  // 🌐 Open EventSource connection
  function connectEventSource() {
    if (eventSource) eventSource.close();
    eventSource = new EventSource(`${getUrl()}/events`);
    lastEventTime = Date.now();
    reconnectStartTime = null;
    updateConnectionStatus("connected");
    setBlur(false);

    eventSource.addEventListener("state", (e) => {
      lastEventTime = Date.now();
      const data = JSON.parse(e.data);

      switch (data.id) {
        case "text_sensor-timeclock":
          document.getElementById("clockTime").textContent = data.value;
          break;

        case "text_sensor-display_text":
          const displayEl = document.getElementById("displayText");
          if (currentDisplayMode === 'clock' && data.value.length >= 3) {
            const thirdLastHidden = data.value.slice(0, -3) + `<span style='display:none;'>${data.value.at(-3)}</span>`;
            const smallerLastTwo = thirdLastHidden + `<span style='font-size: 70%; margin-left:.3em'>${data.value.slice(-2)}</span>`;
            displayEl.innerHTML = smallerLastTwo;
          } else {
            displayEl.textContent = data.value;
          }
          break;

        case "text_sensor-stopwatch":
          const el = document.getElementById("stopwatchTime");
          el.innerHTML = stopwatchState === "running"
            ? data.value.replace(/:/g, "<span class='colon'>:</span>")
            : data.value;
          el.classList.toggle("stopwatch-running", stopwatchState === "running");
          break;

        case "text_sensor-txt_stopwatch_state":
          stopwatchState = data.value;
          updateStopwatchClass();
          document.getElementById("stopwatchStatus").textContent = { running: "Corriendo", paused: "Pausado", reset: "Pausado" }[data.value] || data.value;
          break;

        case "select-sel_display_mode":
          syncDisplayModeRadio(data.value);
          break;

        case "switch-sw_blink":
          suppressChange = true;
          blinkEnabled = data.value === true;
          document.getElementById("blinkSwitch").checked = blinkEnabled;
          updatePantallaClass();
          suppressChange = false;
          break;

        case "number-countdown_minutes": {
          suppressChange = true;
          const val = data.value;
          document.getElementById("countdownInput").value = val;
          updateCountdownOutput(val);
          const preset = document.getElementById("presetDuration");
          preset.value = [...preset.options].find(o => parseInt(o.value) === val)?.value || "";
          suppressChange = false;
          break;
        }

        case "select-sel_stopwatch_mode":
          suppressChange = true;
          document.getElementById("countdownModeSwitch").checked = data.value === "countdown";
          suppressChange = false;
          break;

        case "switch-stopwatch_auto_show":
          suppressChange = true;
          document.getElementById("autoShowSwitch").checked = data.value;
          suppressChange = false;
          break;

        case "switch-stopwatch_blink_before_overtime":
          suppressChange = true;
          document.getElementById("blinkBeforeOvertimeSwitch").checked = data.value;
          suppressChange = false;
          break;

        case "select-sel_overtime_mode":
          suppressChange = true;
          document.getElementById("overtimeModeSelect").value = data.value;
          suppressChange = false;
          break;

        // 📶 Connection info
        case "text_sensor-ip": document.getElementById("infoIP").textContent = data.value; break;
        case "text_sensor-ssid": document.getElementById("infoSSID").textContent = data.value; break;
        case "text_sensor-bssid": document.getElementById("infoBSSID").textContent = data.value; break;
        case "text_sensor-mac": document.getElementById("infoMAC").textContent = data.value; break;
        case "text_sensor-dns": document.getElementById("infoDNS").textContent = data.value; break;
        case "text_sensor-esphome_version": document.getElementById("infoVersion").textContent = data.value; break;
      }
    });

    eventSource.onerror = () => {
      updateConnectionStatus("disconnected");
      if (!reconnectStartTime) reconnectStartTime = Date.now();
    };
  }

  connectEventSource();

  // 🔁 Reconnection logic
  setInterval(() => {
    const now = Date.now();
    const elapsed = now - lastEventTime;

    if (elapsed > CONNECTING_THRESHOLD_MS) {
      updateConnectionStatus("connecting");
      setBlur(true);
    }

    if (elapsed > RECONNECT_DELAY_MS) {
      connectEventSource();
    }

    if (elapsed > FAILURE_THRESHOLD_MS) {
      showReconnectHelp();
    }
  }, 500);

  // 🔘 Input actions
  document.getElementById("blinkSwitch").onchange = (e) => {
    if (suppressChange) return;
    const endpoint = e.target.checked ? "/switch/sw_blink/turn_on" : "/switch/sw_blink/turn_off";
    sendCustomCommand(endpoint);
  };

  document.getElementById("countdownInput").oninput = (e) => updateCountdownOutput(parseInt(e.target.value, 10));
  document.getElementById("countdownInput").onchange = (e) => {
    if (!suppressChange) sendCustomCommand(`/number/countdown_minutes/set?value=${parseInt(e.target.value, 10)}`);
  };

  document.getElementById("presetDuration").onchange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      document.getElementById("countdownInput").value = val;
      updateCountdownOutput(val);
      sendCustomCommand(`/number/countdown_minutes/set?value=${val}`);
    }
  };

  document.getElementById("countdownModeSwitch").onchange = (e) => {
    if (!suppressChange) sendCustomCommand(`/select/sel_stopwatch_mode/set?option=${e.target.checked ? "countdown" : "normal"}`);
  };

  document.getElementById("autoShowSwitch").onchange = (e) => {
    if (!suppressChange) sendCustomCommand(`/switch/stopwatch_auto_show/${e.target.checked ? "turn_on" : "turn_off"}`);
  };

  document.getElementById("blinkBeforeOvertimeSwitch").onchange = (e) => {
    if (!suppressChange) sendCustomCommand(`/switch/stopwatch_blink_before_overtime/${e.target.checked ? "turn_on" : "turn_off"}`);
  };

  document.getElementById("overtimeModeSelect").onchange = (e) => {
    if (!suppressChange) sendCustomCommand(`/select/sel_overtime_mode/set?option=${e.target.value}`);
  };
});