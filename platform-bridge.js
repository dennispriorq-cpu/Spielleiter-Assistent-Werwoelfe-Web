/* One browser entry guards the current application state. Game undo remains
 * owned by GameViewModel, so browser forward never replays archived actions. */
(() => {
  const root = document.documentElement;
  const phase = () => root.getAttribute('data-app-phase');
  const internal = () => phase() && phase() !== 'HOME';
  let armed = history.state?.spielleiterGuard === true;
  let removing = false;
  const arm = () => {
    if (!armed && !removing && internal()) {
      history.pushState({ spielleiterGuard: true }, '', location.href);
      armed = true;
    }
  };
  function numericInputs() {
    // Compose uses a DOM input/textarea for its focused canvas text field.
    document.querySelectorAll('input, textarea').forEach(input => {
      if (phase() === 'DAY_VOTE') {
        if (!input.hasAttribute('data-vote-inputmode')) {
          input.setAttribute('data-vote-inputmode', input.getAttribute('inputmode') ?? '');
        }
        input.setAttribute('inputmode', 'numeric');
        input.setAttribute('pattern', '[0-9]*');
      } else if (input.hasAttribute('data-vote-inputmode')) {
        const previous = input.getAttribute('data-vote-inputmode');
        if (previous) input.setAttribute('inputmode', previous);
        else input.removeAttribute('inputmode');
        input.removeAttribute('pattern');
        input.removeAttribute('data-vote-inputmode');
      }
    });
  }
  window.addEventListener('app-navigation', () => {
    numericInputs();
    if (!internal() && armed && !removing) {
      removing = true;
      history.back();
    } else arm();
  });
  window.addEventListener('popstate', () => {
    if (removing) {
      removing = false;
      armed = false;
      arm();
      return;
    }
    if (history.state?.spielleiterGuard === true) {
      // Forward returns to the live view, never to an obsolete game snapshot.
      armed = true;
      if (!internal()) { removing = true; history.back(); }
      return;
    }
    const wasArmed = armed;
    armed = false;
    if (wasArmed && internal()) window.dispatchEvent(new Event('app-back'));
    arm();
    numericInputs();
  });
  new MutationObserver(numericInputs).observe(document.body, {childList: true, subtree: true});
  // Apply the hint before Compose requests focus (before the keyboard opens).
  const originalFocus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (...args) {
    if (this.matches('input, textarea') && phase() === 'DAY_VOTE') {
      if (!this.hasAttribute('data-vote-inputmode')) {
        this.setAttribute('data-vote-inputmode', this.getAttribute('inputmode') ?? '');
      }
      this.setAttribute('inputmode', 'numeric');
      this.setAttribute('pattern', '[0-9]*');
    }
    return originalFocus.apply(this, args);
  };
  document.addEventListener('focusin', numericInputs, true);
})();

