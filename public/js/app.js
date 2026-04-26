/**
 * Election Education — App Module
 *
 * Main application entry point. Initializes all modules,
 * sets up scroll animations, and manages navigation.
 *
 * @module app
 * @author Mamidi Vashisht
 */

/* global ChatModule, TabsModule */
(() => {
  'use strict';

  /* ─── Navigation ─── */
  function initNavigation() {
    const menuBtn = document.getElementById('menu-toggle');
    const nav = document.getElementById('nav-links');
    const links = nav.querySelectorAll('.navbar__link');

    menuBtn.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('navbar__nav--open');
      menuBtn.setAttribute('aria-expanded', String(isOpen));
      menuBtn.textContent = isOpen ? '✕' : '☰';
    });

    // Close menu on link click (mobile)
    links.forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('navbar__nav--open');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.textContent = '☰';
      });
    });

    // Active link on scroll
    const sections = document.querySelectorAll('section[id]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          links.forEach(link => {
            const isActive = link.getAttribute('href') === `#${id}`;
            link.classList.toggle('navbar__link--active', isActive);
          });
        }
      });
    }, { rootMargin: '-40% 0px -40% 0px' });

    sections.forEach(sec => observer.observe(sec));
  }

  /* ─── Scroll Animations ─── */
  function initScrollAnimations() {
    const elements = document.querySelectorAll('.animate-on-scroll');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    elements.forEach(el => observer.observe(el));
  }

  /* ─── Smooth Scroll for anchor links ─── */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          e.preventDefault();
          const offset = 80; // navbar height
          const top = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });
  }

  /* ─── Navbar background on scroll ─── */
  function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.style.background = 'rgba(10, 15, 26, 0.98)';
        navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
      } else {
        navbar.style.background = 'rgba(10, 15, 26, 0.9)';
        navbar.style.boxShadow = 'none';
      }
    }, { passive: true });
  }

  /* ─── Initialize ─── */
  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initScrollAnimations();
    initSmoothScroll();
    initNavbarScroll();
    TabsModule.init();
    ChatModule.init();

    console.log('🗳️ ElectEd — Election Process Education loaded successfully');
  });
})();
