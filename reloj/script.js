// Register the service worker for PWA support
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(console.error);
}

// ========== Configurable Timeouts ==========
const RECONNECT_DELAY_MS = 2000;        // Retry every 2s
const CONNECTING_THRESHOLD_MS = 2500;   // Show "Conectando" after 2.5s
const FAILURE_THRESHOLD_MS = 5000;      // Show modal after 5s

document.addEventListener("DOMContentLoaded", () => {
  // === State Variables ===
  let suppressChange = false;
  let eventSource;
  let lastEventTime = Date.now();
  let reconnectStartTime = null;
  let currentDisplayMode = "";
  let blinkEnabled = false;
  let stopwatchState = "reset";

  // === Utility: Get Clock URL from input or query string ===
  function getUrl() {
    const params = new URLSearchParams(window.location.search);
    const urlFromParam = params.get("clock");
    const manualUrl = document.getElementById("urlInput")?.value;
    return manualUrl || urlFromParam || "http://reloj.local";
  }


  // === UI Blur Control ===
  function setBlur(active) {
    document.getElementById("displayText")?.classList.toggle("blurred", active);
    document.getElementById("stopwatchTime")?.classList.toggle("blurred", active);
  }

  // === Update Connection Status Pill ===
  function updateConnectionStatus(state) {
    const el = document.getElementById("connectionStatus");
    const iconMap = {
      connected: ["bg-success", "bi-check-circle-fill", "Conectado"],
      connecting: ["bg-warning", "bi-exclamation-circle-fill", "Conectando"],
      disconnected: ["bg-danger", "bi-x-circle-fill", "Desconectado"],
    };
    const [color, icon, label] = iconMap[state] || iconMap.disconnected;
    el.className = `badge rounded-pill ${color}`;
    el.innerHTML = `<i class="bi ${icon} me-1"></i> ${label}`;
  }

  // === Update Stopwatch Styling Based on State ===
  function updateStopwatchClass() {
    const el = document.getElementById("stopwatchTime");
    el.classList.toggle("stopwatch-blink", stopwatchState === "paused");
  }

  // === Apply Pantalla Classes ===
  function updatePantallaClass() {
    const el = document.getElementById("displayText");
    el.classList.toggle("pantalla-sign", currentDisplayMode === "sign");
    el.classList.toggle("pantalla-blink", blinkEnabled);
  }

  // === Sync Mode Radios ===
  const syncDisplayModeRadio = (value) => {
    currentDisplayMode = value;
    updatePantallaClass();
    const radio = document.querySelector(`input[name='displayMode'][value='${value}']`);
    if (radio) {
      suppressChange = true;
      radio.checked = true;
      suppressChange = false;
    }
  };

  document.querySelectorAll("input[name='displayMode']").forEach(input => {
  input.addEventListener("change", (e) => {
    if (suppressChange) return;
    sendCustomCommand(`/select/sel_display_mode/set?option=${e.target.value}`);
  });
});

  // === Install PWA Button Logic ===
  let deferredPrompt;
  const installBtn = document.getElementById("installBtn");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.classList.remove("d-none");
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

  // === Show Help Modal When Connection Fails ===
  function showReconnectHelp() {
    const ua = navigator.userAgent;
    const instructions = document.getElementById("mixedContentInstructions");
    instructions.innerHTML = "";

    const help = [];

    if (/Chrome/.test(ua)) {
      help.push("Haz clic en el candado en la barra de direcciones → 'Configuración del sitio' → permite contenido no seguro.");
    } else if (/Firefox/.test(ua)) {
      help.push("Haz clic en el escudo y desactiva la protección para esta página.");
    } else if (/Safari/.test(ua)) {
      help.push("Activa el menú 'Desarrollo' y desactiva la protección contra contenido inseguro.");
    } else {
      help.push("Permite contenido mixto (HTTP) en la configuración del navegador.");
    }

    help.forEach(text => {
      const li = document.createElement("li");
      li.textContent = text;
      instructions.appendChild(li);
    });

    new bootstrap.Modal(document.getElementById("reconnectModal")).show();
  }

  // === Share Button (QR + WhatsApp + Install) ===
  document.getElementById("shareBtn").addEventListener("click", () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const clockUrl = getUrl();
    const shareUrl = `${baseUrl}?clock=${encodeURIComponent(clockUrl)}`;

    // Generate QR code
    QRCode.toCanvas(document.getElementById("qrCanvas"), shareUrl, { width: 160 });

    // WhatsApp link
    document.getElementById("whatsappShare").href =
      `https://wa.me/?text=${encodeURIComponent("Reloj: " + shareUrl)}`;

    new bootstrap.Modal(document.getElementById("shareModal")).show();
  });

  // === Stopwatch Buttons ===
  document.getElementById("startPauseBtn").onclick = () =>
    sendCustomCommand("/button/stopwatch_start_pause/press");
  document.getElementById("resetBtn").onclick = () =>
    sendCustomCommand("/button/stopwatch_reset/press");

  // === +/- Time Buttons ===
  document.getElementById("decreaseBtn").onclick = () => {
    sendCustomCommand("/number/stopwatch_add_seconds/set?value=-60");
    sendCustomCommand("/button/stopwatch_add_time/press");
  };
  document.getElementById("increaseBtn").onclick = () => {
    sendCustomCommand("/number/stopwatch_add_seconds/set?value=60");
    sendCustomCommand("/button/stopwatch_add_time/press");
  };

  // === Generic Command Sender ===
  function sendCustomCommand(endpoint) {
    fetch(`${getUrl()}${endpoint}`, { method: "POST" }).catch(console.error);
  }

  // === Settings Modal Save = Reload (URL saved via query param) ===
  document.getElementById("saveSettingsBtn")?.addEventListener("click", () => {
    location.reload();
  });

  // === Connection via EventSource ===
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

        case "text_sensor-stopwatch":
          const el = document.getElementById("stopwatchTime");
          let formatted = data.value;
          if (stopwatchState === "running") {
            formatted = formatted.replace(/:/g, '<span class="colon">:</span>');
            el.classList.add("stopwatch-running");
          } else {
            el.classList.remove("stopwatch-running");
          }
          el.innerHTML = formatted;
          break;

        case "text_sensor-display_text":
          const displayEl = document.getElementById("displayText");
          if (currentDisplayMode === 'clock' && data.value.length >= 3) {
            const trimmed = data.value;
            const thirdLastHidden = trimmed.slice(0, -3) + '<span style="display:none;">' + trimmed[trimmed.length - 3] + '</span>';
            const smallerLastTwo = thirdLastHidden + '<span style="font-size: 70%; margin-left:.3em">' + trimmed.slice(-2) + '</span>';
            displayEl.innerHTML = smallerLastTwo;
          } else {
            displayEl.textContent = data.value;
          }
          break;

        case "text_sensor-txt_stopwatch_state":
          stopwatchState = data.value;
          const labelMap = {
            running: "Pausa",
            paused: "Inicio",
            reset: "Inicio"
          };
          const iconMap = {
            running: "bi-pause-fill",
            paused: "bi-play-fill",
            reset: "bi-play-fill"
          };

          // Update button label and icon
          document.getElementById("startPauseLabel").textContent = labelMap[data.value] || "Inicio";
          document.getElementById("startPauseIcon").className = `bi ${iconMap[data.value]}`;

          // Optional: update visible status (hidden currently)
          document.getElementById("stopwatchStatus").textContent = labelMap[data.value];
          updateStopwatchClass();
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

        case "number-countdown_minutes":
          suppressChange = true;
          document.getElementById("countdownInput").value = data.value;
          updateCountdownOutput(data.value);
          suppressChange = false;
          break;

        case "select-sel_stopwatch_mode":
          suppressChange = true;
          document.getElementById("countdownModeSwitch").checked = data.value === "countdown";
          suppressChange = false;
          break;

        case "switch-stopwatch_auto_show":
          suppressChange = true;
          document.getElementById("autoShowSwitch").checked = data.value === true;
          suppressChange = false;
          break;

        case "switch-stopwatch_blink_before_overtime":
          suppressChange = true;
          document.getElementById("blinkBeforeOvertimeSwitch").checked = data.value === true;
          suppressChange = false;
          break;

        case "select-sel_overtime_mode":
          suppressChange = true;
          document.getElementById("overtimeModeSelect").value = data.value;
          suppressChange = false;
          break;

        // Connection info
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

  // === Reconnection Monitor Loop ===
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

  // === Inputs and Toggles ===
  document.getElementById("blinkSwitch").onchange = (e) => {
    if (suppressChange) return;
    const endpoint = e.target.checked ? "/switch/sw_blink/turn_on" : "/switch/sw_blink/turn_off";
    sendCustomCommand(endpoint);
  };

  const countdownInput = document.getElementById("countdownInput");
  const countdownOutput = document.getElementById("countdownOutput");
  const presetDuration = document.getElementById("presetDuration");

  // Update countdown text and sync preset
  function updateCountdownOutput(value) {
    countdownOutput.textContent = `${value} min`;
    const match = Array.from(presetDuration.options).find(opt => parseInt(opt.value) === value);
    presetDuration.value = match ? match.value : "";
  }

  countdownInput.oninput = (e) => {
    const value = parseInt(e.target.value, 10);
    updateCountdownOutput(value);
  };

  countdownInput.onchange = (e) => {
    if (suppressChange) return;
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      sendCustomCommand(`/number/countdown_minutes/set?value=${value}`);
    }
  };

  presetDuration.onchange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      countdownInput.value = val;
      updateCountdownOutput(val);
      sendCustomCommand(`/number/countdown_minutes/set?value=${val}`);
    }
  };

  document.getElementById("countdownModeSwitch").onchange = (e) => {
    if (suppressChange) return;
    const mode = e.target.checked ? "countdown" : "normal";
    sendCustomCommand(`/select/sel_stopwatch_mode/set?option=${mode}`);
  };

  document.getElementById("autoShowSwitch").onchange = (e) => {
    if (suppressChange) return;
    const cmd = e.target.checked ? "turn_on" : "turn_off";
    sendCustomCommand(`/switch/stopwatch_auto_show/${cmd}`);
  };

  document.getElementById("blinkBeforeOvertimeSwitch").onchange = (e) => {
    if (suppressChange) return;
    const cmd = e.target.checked ? "turn_on" : "turn_off";
    sendCustomCommand(`/switch/stopwatch_blink_before_overtime/${cmd}`);
  };

  document.getElementById("overtimeModeSelect").onchange = (e) => {
    if (suppressChange) return;
    const value = e.target.value;
    sendCustomCommand(`/select/sel_overtime_mode/set?option=${value}`);
  };
});
