// Register the service worker for PWA support
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(console.error);
}

// ========== Configurable Timeouts ==========
const RECONNECT_DELAY_MS = 5000;        // Retry every 2s
const CONNECTING_THRESHOLD_MS = 2500;   // Show "Conectando" after 2.5s
const FAILURE_THRESHOLD_MS = 5000;      // Show modal after 5s
let currentDisplayMode = "clock";
let connectionStatus = "connecting"; // global tracker

document.addEventListener("DOMContentLoaded", () => {
  updateConnectionStatus("connecting"); // ✅ force initial connecting status
  setPanelBlur(true); // ✅ blur panels initially
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
  const input = document.getElementById("urlInput")?.value;
  const params = new URLSearchParams(window.location.search);
  const paramUrl = params.get("clock");
  const url = input || paramUrl || "http://reloj.local";
  const normalized = normalizeUrlInput(url);
  return isValidClockUrl(normalized) ? normalized : "http://reloj.local";
}

function setPanelBlur(active) {
  const panels = document.querySelectorAll(".panel-blurable");
  panels.forEach(panel => {
    panel.classList.toggle("panel-blur", active);
  });
}


  // document.getElementById("reconnectNowBtn").addEventListener("click", () => {
  //   reconnecting = false;
  //   tryReconnect();
  // });

const ip = getClockIpFromCookie();
if (ip) {
  document.getElementById("urlInput").value = `http://${ip}`;
}

function normalizeUrlInput(raw) {
  if (!/^https?:\/\//.test(raw)) {
    raw = "http://" + raw;
  }
  return raw;
}

function isValidClockUrl(url) {
  return /^http:\/\/(reloj\.local|\d{1,3}(\.\d{1,3}){3})$/.test(url);
}


  document.getElementById("openSettingsBtn").addEventListener("click", () => {
    const reconnectModal = bootstrap.Modal.getInstance(document.getElementById("reconnectModal"));
    reconnectModal?.hide();
    new bootstrap.Modal(document.getElementById("settingsModal")).show();
  });


  // === UI Blur Control ===
  function setBlur(active) {
    document.getElementById("displayText")?.classList.toggle("blurred", active);
    document.getElementById("stopwatchTime")?.classList.toggle("blurred", active);
  }

  // === Update Connection Status Pill ===
  function updateConnectionStatus(state) {
    connectionStatus = state;

    const el = document.getElementById("connectionStatus");
    const iconMap = {
      connected: ["bg-success", "bi-check-circle-fill", "Conectado"],
      connecting: ["bg-warning", "bi-exclamation-circle-fill", "Conectando"],
      disconnected: ["bg-danger", "bi-x-circle-fill", "Desconectado"],
    };

    const [color, icon, label] = iconMap[state] || iconMap.disconnected;
    el.className = `badge rounded-pill ${color}`;
    el.innerHTML = `<i class="bi ${icon} me-1"></i> ${label}`;

    // Apply blinking and dark text for connecting
    el.classList.toggle("blinking", state === "connecting");
    el.classList.toggle("connection-warning", state === "connecting");

    // Blur panels unless fully connected
    setPanelBlur(state !== "connected");
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
    let resolved = value === "custom_sign" ? "sign" : value;
    const radio = document.querySelector(`input[name='displayMode'][value='${resolved}']`);
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
    const settingsModal = bootstrap.Modal.getInstance(document.getElementById("settingsModal"));
    if (settingsModal && document.getElementById("settingsModal").classList.contains("show")) return;

    const ua = navigator.userAgent;

    const clockIp = getClockIpFromCookie();
    const urls = [
      "http://reloj.local",
      ...(clockIp ? [`http://${clockIp}`] : [])
    ];

    // === Fill clockAddresses list ===
    const addrList = document.getElementById("clockAddresses");
    addrList.innerHTML = "";
    urls.forEach(url => {
      const li = document.createElement("li");
      li.innerHTML = `<code>${url}</code>`;
      addrList.appendChild(li);
    });

    // === Fill mixedContentInstructions list ===
    const instList = document.getElementById("mixedContentInstructions");
    instList.innerHTML = "";

    let browserHelp = "";
    if (/Chrome/.test(ua)) {
      browserHelp = "Hacé clic en el candado en la barra de direcciones → 'Configuración del sitio' → permitir contenido no seguro.";
    } else if (/Firefox/.test(ua)) {
      browserHelp = "Hacé clic en el escudo a la izquierda de la barra de direcciones y desactivá la protección para esta página.";
    } else if (/Safari/.test(ua)) {
      browserHelp = "Activá el menú 'Desarrollo' y desactivá la protección contra contenido inseguro.";
    } else {
      browserHelp = "Permití contenido mixto (HTTP) en la configuración del navegador.";
    }

    const li = document.createElement("li");
    li.textContent = browserHelp;
    instList.appendChild(li);

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("reconnectModal"));
    modal.show();
  }





  // === Share Button (QR + WhatsApp + Install) ===
  document.getElementById("shareBtn").addEventListener("click", () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const clockUrl = getUrl();
    const shareUrl = `${baseUrl}?clock=${encodeURIComponent(clockUrl)}`;

    // Generate QR code
    QRCode.toCanvas(document.getElementById("qrCanvas"), shareUrl, { width: 160 });
    document.getElementById("shareUrl").textContent = shareUrl;


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
    // updateConnectionStatus("connected");
    setBlur(false);
    const reconnectModal = bootstrap.Modal.getInstance(document.getElementById("reconnectModal"));
    if (reconnectModal) reconnectModal.hide?.();

    eventSource.addEventListener("state", (e) => {
      lastEventTime = Date.now();
      if (connectionStatus !== "connected") {
        updateConnectionStatus("connected");
      }
      const data = JSON.parse(e.data);

      switch (data.id) {
        case "text_sensor-timeclock":
          const clockElem = document.getElementById("clockTime");
          
            clockElem.textContent = data.value;

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
          currentDisplayMode = data.value;
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
        case "text_sensor-ip":
          document.getElementById("infoIP").textContent = data.value;
          // Save to cookie
          document.cookie = `clock_ip=${data.value}; path=/; max-age=31536000`; // 1 year
          break;
        case "text_sensor-ssid": document.getElementById("infoSSID").textContent = data.value; break;
        case "text_sensor-bssid": document.getElementById("infoBSSID").textContent = data.value; break;
        case "text_sensor-mac": document.getElementById("infoMAC").textContent = data.value; break;
        case "text_sensor-dns": document.getElementById("infoDNS").textContent = data.value; break;
        case "text_sensor-esphome_version": document.getElementById("infoVersion").textContent = data.value; break;
      }
    });

    eventSource.onerror = () => {
      // Do NOT close or reconnect here.
      // Just flag the time so the monitor can handle logic safely.
      if (!reconnectStartTime) reconnectStartTime = Date.now();
    };

  }

  connectEventSource();

  // === Reconnection Monitor Loop ===
  let reconnecting = false;

  setInterval(() => {
    const now = Date.now();
    const elapsed = now - lastEventTime;

    if (!reconnecting && elapsed > CONNECTING_THRESHOLD_MS) {
      reconnecting = true;
      updateConnectionStatus("connecting");
      setBlur(true);
      tryReconnect();
    }
  }, 500);

function tryReconnect() {
  const knownIp = getClockIpFromCookie();
  const urlsToTry = [];

  if (knownIp) urlsToTry.push(`http://${knownIp}`);
  urlsToTry.push("http://reloj.local");

  tryNextUrl(urlsToTry, 0);
}

function tryNextUrl(urls, index) {
  if (index >= urls.length) {
    updateConnectionStatus("disconnected");
    showReconnectHelp();
    reconnecting = false;
    return;
  }

  const tempSource = new EventSource(`${urls[index]}/events`);
  let reconnected = false;

  const timeout = setTimeout(() => {
    if (!reconnected) {
      tempSource.close();
      tryNextUrl(urls, index + 1);
    }
  }, RECONNECT_DELAY_MS);

  tempSource.addEventListener("state", (e) => {
    if (reconnected) return;
    reconnected = true;
    clearTimeout(timeout);
    eventSource?.close?.();
    eventSource = tempSource;
    setupEventSourceHandlers(eventSource);
    lastEventTime = Date.now();
    updateConnectionStatus("connected");
    setBlur(false);
    bootstrap.Modal.getInstance(document.getElementById("reconnectModal"))?.hide();
    reconnecting = false;
  });

  tempSource.onerror = () => {};
}


function getClockIpFromCookie() {
  const match = document.cookie.match(/(?:^|; )clock_ip=([^;]+)/);
  return match ? match[1] : null;
}

function setupEventSourceHandlers(source) {
  source.addEventListener("state", (e) => {
    const data = JSON.parse(e.data);
    lastEventTime = Date.now();


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

case "text_sensor-display_text": {
  const displayElem = document.getElementById("displayText");

  // Remove old scroll span if it exists
  displayElem.classList.remove("pantalla-scroll");

  if (data.value.length > 8) {
    displayElem.innerHTML = `<span class="pantalla-scroll">${data.value}</span>`;
  } else {
    displayElem.textContent = data.value;
  }

  break;
}

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

        case "text-custom_sign":
          document.getElementById("customSignInput").value = data.value;

          break;

        // Connection info
        case "text_sensor-ip":
          document.getElementById("infoIP").textContent = data.value;
          // Save to cookie
          document.cookie = `clock_ip=${data.value}; path=/; max-age=31536000`; // 1 year
          break;
        case "text_sensor-ssid": document.getElementById("infoSSID").textContent = data.value; break;
        case "text_sensor-bssid": document.getElementById("infoBSSID").textContent = data.value; break;
        case "text_sensor-mac": document.getElementById("infoMAC").textContent = data.value; break;
        case "text_sensor-dns": document.getElementById("infoDNS").textContent = data.value; break;
        case "text_sensor-esphome_version": document.getElementById("infoVersion").textContent = data.value; break;
      }
  });

  source.onerror = () => {
    console.warn("EventSource error. Waiting for reconnect...");
  };
}



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

  document.getElementById("customSignOption").addEventListener("click", () => {
    const modal = new bootstrap.Modal(document.getElementById("customSignModal"));
    modal.show();
  });

  document.getElementById("customSignForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("customSignInput");
    let text = input.value.trim();

    // Enforce character limit (including appended "  -  ")
    const maxTextLength = 128 - 5; // reserve 5 chars for "  -  "

    if (text.length > maxTextLength) {
      text = text.substring(0, maxTextLength);
    }
    text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");


    const fullText = `${text}        `;



    fetch(`${getUrl()}/text/custom_sign/set?value=${encodeURIComponent(fullText)}`, {
      method: "POST"
    }).then(() => {
      fetch(`${getUrl()}/select/sel_display_mode/set?option=custom_sign`, {
        method: "POST"
      });
    });

    bootstrap.Modal.getInstance(document.getElementById("customSignModal")).hide();
  });


});
