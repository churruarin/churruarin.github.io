if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(console.error);
}

document.addEventListener("DOMContentLoaded", () => {
  let suppressChange = false;
  let eventSource;
  let lastEventTime = Date.now();
  let reconnectStartTime = null;
let currentDisplayMode = "";
let blinkEnabled = false;
let stopwatchState = "reset"; // running, paused, or reset


  // Helper to get saved or default URL
function getUrl() {
  const params = new URLSearchParams(window.location.search);
  const urlFromParam = params.get("clock");
  const manualUrl = document.getElementById("urlInput")?.value;
  return manualUrl || urlFromParam || "http://reloj.local";
}


  // Dark mode support
  const darkSwitch = document.getElementById("darkModeSwitch");
  const updateTheme = (forceDark) => {
    document.documentElement.setAttribute("data-bs-theme", forceDark ? "dark" : "light");
  };
  if (darkSwitch) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    darkSwitch.checked = prefersDark;
    updateTheme(prefersDark);
    darkSwitch.addEventListener("change", () => {
      updateTheme(darkSwitch.checked);
    });
  }

  // Display mode radio toggle
  const displayModeRadios = document.querySelectorAll("input[name='displayMode']");
  displayModeRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      if (suppressChange) return;
      if (e.target.checked) {
        fetch(`${getUrl()}/select/sel_display_mode/set?option=${e.target.value}`, {
          method: "POST"
        }).catch(console.error);
      }
    });
  });

document.getElementById("decreaseBtn").addEventListener("click", () => {
    sendCustomCommand(`/number/stopwatch_add_seconds/set?value=-60`);
  sendCustomCommand(`/button/stopwatch_add_time/press`);
});
document.getElementById("increaseBtn").addEventListener("click", () => {
    sendCustomCommand(`/number/stopwatch_add_seconds/set?value=60`);
  sendCustomCommand(`/button/stopwatch_add_time/press`);
});




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

function updateStopwatchClass() {
  const el = document.getElementById("stopwatchTime");
  el.classList.toggle("stopwatch-blink", stopwatchState === "paused");
}


function updatePantallaClass() {
  const el = document.getElementById("displayText");
  el.classList.toggle("pantalla-sign", currentDisplayMode === "sign");
  el.classList.toggle("pantalla-blink", blinkEnabled);
}

document.getElementById("shareBtn").addEventListener("click", () => {
  const baseUrl = window.location.origin + window.location.pathname;
  const clockUrl = getUrl();
  const shareUrl = `${baseUrl}?clock=${encodeURIComponent(clockUrl)}`;

  // Generate QR code
  const canvas = document.getElementById("qrCanvas");
  QRCode.toCanvas(canvas, shareUrl, { width: 160 }, function (error) {
    if (error) console.error(error);
  });

  // Set WhatsApp link
  const whatsappLink = `https://wa.me/?text=${encodeURIComponent("Reloj: " + shareUrl)}`;
  document.getElementById("whatsappShare").href = whatsappLink;

  // Show modal
  new bootstrap.Modal(document.getElementById("shareModal")).show();
});

  // Button handlers
  document.getElementById("startPauseBtn").onclick = () =>
    sendCustomCommand("/button/stopwatch_start_pause/press");
  document.getElementById("resetBtn").onclick = () =>
    sendCustomCommand("/button/stopwatch_reset/press");

  function sendCustomCommand(endpoint) {
    fetch(`${getUrl()}${endpoint}`, { method: "POST" }).catch(console.error);
  }

  // Save settings
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");
  saveSettingsBtn?.addEventListener("click", () => {
    location.reload();
  });

  // EventSource logic
  function connectEventSource() {
    if (eventSource) eventSource.close();
    eventSource = new EventSource(`${getUrl()}/events`);
    document.getElementById("connectionStatus").textContent = "🟢";
    reconnectStartTime = null;

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

  // Only wrap colons in spans for animation when running
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
    const smallerLastTwo = thirdLastHidden + '<span style="font-size: 70%;margin-left:.3em">' + trimmed.slice(-2) + '</span>';
    displayEl.innerHTML = smallerLastTwo;
  } else {
    displayEl.textContent = data.value;
  }

  break;
 case "text_sensor-txt_stopwatch_state":
  stopwatchState = data.value;
  const map = { running: "Corriendo", paused: "Pausado", reset: "Pausado" };
  document.getElementById("stopwatchStatus").textContent = map[data.value] || data.value;
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

  const countdownValue = data.value;
  const countdownInputEl = document.getElementById("countdownInput");
  const countdownOutputEl = document.getElementById("countdownOutput");
  const presetEl = document.getElementById("presetDuration");

  countdownInputEl.value = countdownValue;
  updateCountdownOutput(countdownValue);

  // Auto-select matching preset or clear if no match
  const matchingOption = Array.from(presetEl.options).find(opt => parseInt(opt.value) === countdownValue);
  presetEl.value = matchingOption ? matchingOption.value : "";

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
      }
    });

    eventSource.onerror = () => {
      document.getElementById("connectionStatus").textContent = "🔴";
      if (!reconnectStartTime) reconnectStartTime = Date.now();
    };
  }

  connectEventSource();

  // Reconnect check
  setInterval(() => {
    const now = Date.now();
    if (now - lastEventTime > 5000) {
      connectEventSource();
    }
    if (reconnectStartTime && now - reconnectStartTime > 30000) {
      alert("No se puede conectar al reloj. Verifica la conexión.");
      reconnectStartTime = null;
    }
  }, 2000);

  // Input actions
  document.getElementById("blinkSwitch").onchange = (e) => {
    if (suppressChange) return;
    const endpoint = e.target.checked ? "/switch/sw_blink/turn_on" : "/switch/sw_blink/turn_off";
    sendCustomCommand(endpoint);
  };

const countdownInput = document.getElementById("countdownInput");
const countdownOutput = document.getElementById("countdownOutput");

function updateCountdownOutput(value) {
  const out = document.getElementById("countdownOutput");
  if (out) out.textContent = `${value} min`;
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

document.getElementById("presetDuration").onchange = (e) => {
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
