function showError(message) {
  const existingError = document.querySelector('.error-message');
  if (existingError) {
    existingError.innerHTML = message;
  } else {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = message;

    const form = document.getElementById('registerForm');
    form.insertBefore(errorDiv, form.firstChild);
  }
}

function togglePasswordVisibility(icon, inputId) {
  const passwordInput = document.getElementById(inputId);
  const isVisible = passwordInput.type === "text";

  passwordInput.type = isVisible ? "password" : "text";
  icon.src = isVisible ? "../assets/eye_closed.png" : "../assets/eye_open.png";
}

// Mouse movement parallax effect
window.addEventListener('mousemove', (e) => {
  const particles = document.querySelectorAll('.particle');
  const hexagons = document.querySelectorAll('.hexagon');
  const x = (e.clientX / window.innerWidth) * 2 - 1;
  const y = (e.clientY / window.innerHeight) * 2 - 1;

  particles.forEach((particle, index) => {
    const speed = (index + 1) * 0.3;
    const moveX = x * speed * 10;
    const moveY = y * speed * 10;
    particle.style.transform = `translate(${moveX}px, ${moveY}px)`;
  });

  hexagons.forEach((hex, index) => {
    const speed = (index + 1) * 0.2;
    const moveX = x * speed * 5;
    const moveY = y * speed * 5;
    hex.style.transform = `translate(${moveX}px, ${moveY}px) scale(1)
        rotate(${index * 45}deg)`;
  });
});

// Hexagon hover effects
document.querySelectorAll('.hexagon').forEach(hex => {
  hex.addEventListener('mouseenter', function () {
    this.classList.add('hex-hovered');
    createHexRipple(this);
  });

  hex.addEventListener('mouseleave', function () {
    this.classList.remove('hex-hovered');
  });
});

function createHexRipple(hexagon) {
  const ripple = document.createElement('div');
  ripple.classList.add('hex-ripple');
  hexagon.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 800);
}

// Intersection Observer for animations
const observerOptions = {
  threshold: 0.2,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-in');
    }
  });
}, observerOptions);

document.querySelectorAll('.left-section, .right-section').forEach(el => {
  el.classList.add('pre-animate');
  observer.observe(el);
});

// Random honey particles
function createRandomHoneyParticle() {
  const particle = document.createElement('div');
  particle.className = 'particle honey-particle';

  particle.style.left = Math.random() * 100 + '%';
  particle.style.animationDelay = Math.random() * 2 + 's';
  particle.style.animationDuration = (Math.random() * 4 + 6) + 's';

  document.querySelector('.bg-particles').appendChild(particle);

  setTimeout(() => {
    particle.remove();
  }, 10000);
}

setInterval(createRandomHoneyParticle, 2000);

// Button ripple effects
function createHoneyRipple(event) {
  const button = event.currentTarget;
  const ripple = document.createElement('span');
  ripple.classList.add('honey-ripple');

  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

  button.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 1000);
}

document.querySelectorAll('.register-button, .login-button, .register-btn, .social-btn').forEach(button => {
  button.classList.add('honey-button');
  button.addEventListener('click', createHoneyRipple);
});

// Respect prefers-reduced-motion
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.particle, .hexagon, .bee').forEach(el => {
    el.style.animation = 'none';
  });
}

// Responsive handling
window.addEventListener('resize', function() {
  document.querySelectorAll('.particle').forEach((particle, index) => {
    particle.style.left = (Math.random() * 100) + '%';
  });

  document.querySelectorAll('.hexagon').forEach((hex, index) => {
    const positions = [
      { top: '10%', left: '10%' },
      { top: '20%', right: '15%' },
      { top: '40%', left: '5%' },
      { top: '60%', right: '10%' },
      { top: '80%', left: '20%' },
      { top: '15%', left: '50%' },
      { top: '70%', right: '40%' },
      { top: '30%', right: '50%' }
    ];

    if (positions[index]) {
      Object.assign(hex.style, positions[index]);
    }
  });
});

// Scroll parallax effect
window.addEventListener('scroll', function() {
  const scrolled = window.pageYOffset;
  const parallax = document.querySelectorAll('.particle');

  parallax.forEach((particle, index) => {
    const speed = (index % 3 + 1) * 0.5;
    particle.style.transform = `translateY(${scrolled * speed}px)`;
  });
});