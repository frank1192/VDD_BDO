// VDD BDO - Client-side JavaScript

// Validate notes before submitting
function validateNotes(form) {
  const inputs = form.querySelectorAll('input[type="number"]');
  let isValid = true;
  let errors = [];
  
  inputs.forEach(input => {
    const value = input.value;
    if (value !== '') {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        isValid = false;
        input.style.borderColor = '#C3261F';
        errors.push(`${input.dataset.indicator}: El valor debe estar entre 0 y 100`);
      } else {
        input.style.borderColor = '#E0E0E0';
      }
    }
  });
  
  if (!isValid) {
    alert('Errores de validación:\n' + errors.join('\n'));
    return false;
  }
  
  return true;
}

// Validate percentages sum to 100
function validatePercentages(form) {
  const inputs = form.querySelectorAll('input[name*="percentage"]');
  let total = 0;
  
  inputs.forEach(input => {
    total += parseFloat(input.value) || 0;
  });
  
  const totalDisplay = document.getElementById('total-percentage');
  if (totalDisplay) {
    totalDisplay.textContent = total.toFixed(2) + '%';
    if (Math.abs(total - 100) > 0.01) {
      totalDisplay.style.color = '#C3261F';
    } else {
      totalDisplay.style.color = '#7AB929';
    }
  }
  
  return true;
}

// Initialize percentage validation
document.addEventListener('DOMContentLoaded', function() {
  const configForm = document.getElementById('config-form');
  if (configForm) {
    const inputs = configForm.querySelectorAll('input[name*="percentage"]');
    inputs.forEach(input => {
      input.addEventListener('input', function() {
        validatePercentages(configForm);
      });
    });
    validatePercentages(configForm);
  }
  
  // Auto-dismiss alerts after 5 seconds
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(alert => {
    setTimeout(() => {
      alert.style.opacity = '0';
      setTimeout(() => alert.remove(), 300);
    }, 5000);
  });
});

// Confirm delete actions
function confirmDelete(message) {
  return confirm(message || '¿Está seguro de que desea eliminar este registro?');
}

// Toggle sidebar on mobile
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  sidebar.classList.toggle('active');
}
