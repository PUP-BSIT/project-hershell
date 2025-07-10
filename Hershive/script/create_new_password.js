const passwordInput = document.getElementById('new_password');
const confirmPassword = document.getElementById('confirm_password');
const resetBtn = document.getElementById('reset_btn');
const rulesList = document.getElementById('password_rules');
const strengthBar = document.getElementById('strength_bar');
const matchWarning = document.getElementById('match_warning');

const rules = {
    length: document.getElementById('length_rule'),
    number: document.getElementById('number_rule'),
    uppercase: document.getElementById('uppercase_rule'),
    lowercase: document.getElementById('lowercase_rule')
};

function validateNewPassword() {
    const password = passwordInput.value;
    
    // Show rules only when typing in new password field
    if (password.length > 0) {
        rulesList.classList.add('active');
    } else {
        rulesList.classList.remove('active');
    }

    const validations = {
        length: password.length >= 8,
        number: /\d/.test(password),
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password)
    };

    let passedRules = 0;

    for (const rule in validations) {
        if (validations[rule]) {
            rules[rule].classList.remove('invalid');
            rules[rule].classList.add('valid');
            passedRules++;
        } else {
            rules[rule].classList.add('invalid');
            rules[rule].classList.remove('valid');
        }
    }

    // Update strength bar
    const strengthPercent = (passedRules / 4) * 100;
    strengthBar.style.width = strengthPercent + '%';
    
    if (strengthPercent <= 25) {
        strengthBar.style.background = 'red';
    } else if (strengthPercent <= 50) {
        strengthBar.style.background = 'orange';
    } else if (strengthPercent < 100) {
        strengthBar.style.background = 'yellowgreen';
    } else {
        strengthBar.style.background = 'green';
    }

    const allValid = Object.values(validations).every(v => v);
    
    updateButtonState();
    
    return allValid;
}

function validateConfirmPassword() {
    const password = passwordInput.value;
    const confirm = confirmPassword.value;
    const passwordsMatch = password === confirm && confirm.length > 0;

    if (confirm.length > 0 && !passwordsMatch) {
        matchWarning.classList.remove('hidden');
    } else {
        matchWarning.classList.add('hidden');
    }

    updateButtonState();
    
    return passwordsMatch;
}

function updateButtonState() {
    const password = passwordInput.value;
    const confirm = confirmPassword.value;
    
    // Check if new password meets all requirements
    const validations = {
        length: password.length >= 8,
        number: /\d/.test(password),
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password)
    };
    const allValid = Object.values(validations).every(v => v);
    
    const passwordsMatch = password === confirm && confirm.length > 0;
    
    resetBtn.disabled = !(allValid && passwordsMatch);
}

function hideRules() {
    rulesList.classList.remove('active');
}

function showRulesOnFocus() {
    if (passwordInput.value.length > 0) {
        rulesList.classList.add('active');
    }
}

function togglePassword(fieldId, iconId) {
    const input = document.getElementById(fieldId);
    const icon = document.getElementById(iconId);

    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    icon.src = isHidden ? '../assets/eye_open.png' : '../assets/eye_closed.png';
}