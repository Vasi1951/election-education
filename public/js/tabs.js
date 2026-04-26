/**
 * Election Education — Tabs Module
 *
 * Accessible tab panel component with keyboard navigation.
 * Follows WAI-ARIA Tabs pattern.
 *
 * @module tabs
 * @author Mamidi Vashisht
 */

/* exported TabsModule */
const TabsModule = (() => {
  'use strict';

  let tabs = [];
  let panels = [];

  function init() {
    const tablist = document.querySelector('[role="tablist"]');
    if (!tablist) return;

    tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => activate(i));
      tab.addEventListener('keydown', (e) => handleKeyDown(e, i));
      tab.setAttribute('tabindex', i === 0 ? '0' : '-1');
    });
  }

  function activate(index) {
    tabs.forEach((tab, i) => {
      const isActive = i === index;
      tab.classList.toggle('tabs__btn--active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
      tab.setAttribute('tabindex', isActive ? '0' : '-1');
      panels[i].classList.toggle('tabs__panel--active', isActive);
    });
    tabs[index].focus();
  }

  function handleKeyDown(e, currentIndex) {
    let newIndex;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        newIndex = (currentIndex + 1) % tabs.length;
        activate(newIndex);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        activate(newIndex);
        break;
      case 'Home':
        e.preventDefault();
        activate(0);
        break;
      case 'End':
        e.preventDefault();
        activate(tabs.length - 1);
        break;
    }
  }

  return { init };
})();
