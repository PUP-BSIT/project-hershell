document.addEventListener('DOMContentLoaded', function() {
  initializeCountdownTimer();
  initializeToastMessage();
  initializeFormValidation();
});

function initializeCountdownTimer() {
  const timerDisplay = document.getElementById("modal_timer");
  if (!timerDisplay) {
      return;
  }

  const timeStr = timerDisplay.getAttribute('data-remaining');
  if (!timeStr) {
      return;
  }

  let totalSeconds = parseTimeString(timeStr);

  startCountdown(timerDisplay, totalSeconds);
}

function parseTimeString(timeStr) {
  const parts = timeStr.split(":");
  let seconds = 0;
  
  if (parts.length === 3) {
      seconds = parseInt(parts[0]) * 3600 + 
               parseInt(parts[1]) * 60 + 
               parseInt(parts[2]);
  } else if (parts.length === 2) {
      seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  
  return seconds;
}

function startCountdown(display, totalSeconds) {
  let remainingSeconds = totalSeconds;

  const updateTimer = function() {
      if (remainingSeconds <= 0) {
          display.textContent = "00:00";
          return;
      }

      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);
      const seconds = remainingSeconds % 60;

      let timeString = "";
      if (hours > 0) {
          timeString = String(hours).padStart(2, '0') + ":";
      }
      timeString += String(minutes).padStart(2, '0') + ":" + 
                   String(seconds).padStart(2, '0');

      display.textContent = timeString;
      remainingSeconds--;

      setTimeout(updateTimer, 1000);
  };

  updateTimer();
}

function initializeToastMessage() {
  const toast = document.getElementById('toast_message');
  
  if (!toast) {
      return;
  }
  
  setTimeout(function() {
      toast.style.display = 'none';
  }, 3000);
}

function initializeFormValidation() {
  const emailInput = document.getElementById('email');
  
  if (emailInput) {
      emailInput.addEventListener('input', validateForm);
      emailInput.addEventListener('blur', validateForm);
  }
}

function validateForm() {
  const emailInput = document.getElementById('email');
  const submitBtn = document.getElementById('submit_btn');
  
  if (!emailInput || !submitBtn) {
      return;
  }
  
  const email = emailInput.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
      submitBtn.disabled = true;
      return false;
  }
  
  submitBtn.disabled = false;
  return true;
}