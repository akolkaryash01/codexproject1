/* Shared site interactions: menu, theme, and cart. */
const root = document.documentElement;
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
const themeToggle = document.getElementById('themeToggle');
const cartCountEl = document.getElementById('cartCount');
const addToCartButtons = document.querySelectorAll('.add-to-cart');

// Mobile menu toggle
navToggle?.addEventListener('click', () => {
  navLinks?.classList.toggle('open');
});

// Persistent theme toggle
const savedTheme = localStorage.getItem('citrus-theme');
if (savedTheme) {
  root.setAttribute('data-theme', savedTheme);
}
refreshThemeLabel();

themeToggle?.addEventListener('click', () => {
  const current = root.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  root.setAttribute('data-theme', next);
  localStorage.setItem('citrus-theme', next);
  refreshThemeLabel();
});

function refreshThemeLabel() {
  if (!themeToggle) return;
  themeToggle.textContent = root.getAttribute('data-theme') === 'dark' ? 'Light Mode' : 'Dark Mode';
}

// Basic cart logic using localStorage
function readCart() {
  return JSON.parse(localStorage.getItem('citrus-cart') || '[]');
}

function writeCart(cart) {
  localStorage.setItem('citrus-cart', JSON.stringify(cart));
}

function updateCartCount() {
  if (!cartCountEl) return;
  cartCountEl.textContent = String(readCart().length);
}

addToCartButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const cart = readCart();
    cart.push({
      name: button.dataset.product || 'CitrusCraft Product',
      price: Number(button.dataset.price || 0),
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    });
    writeCart(cart);
    updateCartCount();
    button.textContent = 'Added';
    setTimeout(() => {
      button.textContent = 'Add to Cart';
    }, 1200);
  });
});

updateCartCount();

// Friendly placeholder form behavior
const form = document.querySelector('.contact-form');
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.textContent = 'Message Sent';
  form.reset();
});
