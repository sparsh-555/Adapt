import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    // Generate the Adapt client script
    const script = generateAdaptScript()
    
    return new Response(script, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'CDN-Cache-Control': 'max-age=31536000',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Vary': 'Accept-Encoding',
      },
    })
  } catch (error) {
    console.error('Error generating Adapt script:', error)
    return NextResponse.json(
      { error: 'Failed to generate script' },
      { status: 500 }
    )
  }
}

function generateAdaptScript(): string {
  // This is a simplified version - in production, you'd compile the TypeScript
  // and bundle all dependencies into a single optimized script
  
  return `
(function() {
  'use strict';
  
  // Adapt Client Implementation
  class AdaptClient {
    constructor(config) {
      this.config = {
        apiUrl: 'https://adapt.vercel.app',
        enableRealtimeAdaptations: true,
        enableBehaviorTracking: true,
        debugMode: false,
        ...config
      };
      
      this.sessionId = this.generateSessionId();
      this.eventQueue = [];
      this.isConnected = false;
      this.fieldMetrics = new Map();
      this.observers = new Map();
      this.debounceTimeout = null;
      
      this.init();
    }
    
    generateSessionId() {
      return 'adapt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    init() {
      if (this.config.debugMode) {
        console.log('Initializing Adapt client for form:', this.config.formId);
      }
      
      this.setupEventListeners();
      this.connectToAPI();
    }
    
    setupEventListeners() {
      // Mouse tracking
      document.addEventListener('mousemove', this.handleMouseMove.bind(this));
      document.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
      document.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
      
      // Form interaction tracking
      document.addEventListener('focus', this.handleFocus.bind(this), true);
      document.addEventListener('blur', this.handleBlur.bind(this), true);
      document.addEventListener('input', this.handleInput.bind(this), true);
      document.addEventListener('change', this.handleChange.bind(this), true);
      
      // Form submission tracking
      document.addEventListener('submit', this.handleSubmit.bind(this), true);
    }
    
    connectToAPI() {
      if (!this.config.enableRealtimeAdaptations) return;
      
      // Use fetch for real-time API calls (simplified WebSocket alternative)
      this.isConnected = true;
      this.processEventQueue();
    }
    
    handleMouseMove(event) {
      this.debounceEmit({
        sessionId: this.sessionId,
        formId: this.config.formId,
        eventType: 'mouse_move',
        timestamp: performance.now(),
        data: {
          x: event.clientX,
          y: event.clientY,
          target: this.getElementSelector(event.target)
        }
      });
    }
    
    handleMouseEnter(event) {
      const element = event.target;
      if (this.isFormField(element)) {
        const fieldName = this.getFieldName(element);
        this.emitEvent({
          sessionId: this.sessionId,
          formId: this.config.formId,
          eventType: 'field_hover_start',
          fieldName: fieldName,
          timestamp: performance.now(),
          data: {
            element: this.getElementSelector(element)
          }
        });
      }
    }
    
    handleMouseLeave(event) {
      const element = event.target;
      if (this.isFormField(element)) {
        const fieldName = this.getFieldName(element);
        this.emitEvent({
          sessionId: this.sessionId,
          formId: this.config.formId,
          eventType: 'field_hover_end',
          fieldName: fieldName,
          timestamp: performance.now(),
          data: {
            element: this.getElementSelector(element)
          }
        });
      }
    }
    
    handleFocus(event) {
      const element = event.target;
      if (this.isFormField(element)) {
        const fieldName = this.getFieldName(element);
        this.startFieldTracking(fieldName, element);
        
        this.emitEvent({
          sessionId: this.sessionId,
          formId: this.config.formId,
          eventType: 'field_focus',
          fieldName: fieldName,
          timestamp: performance.now(),
          data: {
            element: this.getElementSelector(element)
          }
        });
      }
    }
    
    handleBlur(event) {
      const element = event.target;
      if (this.isFormField(element)) {
        const fieldName = this.getFieldName(element);
        this.endFieldTracking(fieldName);
        
        this.emitEvent({
          sessionId: this.sessionId,
          formId: this.config.formId,
          eventType: 'field_blur',
          fieldName: fieldName,
          timestamp: performance.now(),
          data: {
            element: this.getElementSelector(element),
            value: element.value
          }
        });
      }
    }
    
    handleInput(event) {
      const element = event.target;
      if (this.isFormField(element)) {
        const fieldName = this.getFieldName(element);
        this.trackTypingBehavior(fieldName, element);
        
        this.debounceEmit({
          sessionId: this.sessionId,
          formId: this.config.formId,
          eventType: 'field_input',
          fieldName: fieldName,
          timestamp: performance.now(),
          data: {
            element: this.getElementSelector(element),
            valueLength: element.value.length,
            inputType: event.type
          }
        });
      }
    }
    
    handleChange(event) {
      const element = event.target;
      if (this.isFormField(element)) {
        const fieldName = this.getFieldName(element);
        
        this.emitEvent({
          sessionId: this.sessionId,
          formId: this.config.formId,
          eventType: 'field_change',
          fieldName: fieldName,
          timestamp: performance.now(),
          data: {
            element: this.getElementSelector(element),
            value: element.value,
            type: element.type
          }
        });
      }
    }
    
    handleSubmit(event) {
      const form = event.target;
      if (form.dataset.adapt === this.config.formId) {
        this.emitEvent({
          sessionId: this.sessionId,
          formId: this.config.formId,
          eventType: 'form_submit',
          timestamp: performance.now(),
          data: {
            completionTime: this.calculateCompletionTime(),
            totalInteractions: this.eventQueue.length
          }
        });
      }
    }
    
    isFormField(element) {
      return element.tagName === 'INPUT' || 
             element.tagName === 'TEXTAREA' || 
             element.tagName === 'SELECT' ||
             element.contentEditable === 'true';
    }
    
    getFieldName(element) {
      return element.getAttribute('name') || 
             element.getAttribute('id') || 
             element.className ||
             'unnamed_field';
    }
    
    getElementSelector(element) {
      if (!element) return '';
      
      if (element.id) return '#' + element.id;
      if (element.className) return '.' + element.className.split(' ').join('.');
      
      return element.tagName.toLowerCase();
    }
    
    startFieldTracking(fieldName, element) {
      const metrics = {
        fieldName: fieldName,
        focusTime: performance.now(),
        typingSpeed: 0,
        corrections: 0,
        hesitation: false,
        errorCount: 0
      };
      
      this.fieldMetrics.set(fieldName, metrics);
    }
    
    endFieldTracking(fieldName) {
      const metrics = this.fieldMetrics.get(fieldName);
      if (metrics) {
        metrics.focusTime = performance.now() - metrics.focusTime;
        this.fieldMetrics.set(fieldName, metrics);
      }
    }
    
    trackTypingBehavior(fieldName, element) {
      const metrics = this.fieldMetrics.get(fieldName);
      if (metrics) {
        const currentTime = performance.now();
        const timeDiff = currentTime - metrics.focusTime;
        const charCount = element.value.length;
        
        if (timeDiff > 0 && charCount > 0) {
          metrics.typingSpeed = (charCount / timeDiff) * 1000 * 60; // chars per minute
        }
        
        this.fieldMetrics.set(fieldName, metrics);
      }
    }
    
    calculateCompletionTime() {
      const firstEvent = this.eventQueue[0];
      const lastEvent = this.eventQueue[this.eventQueue.length - 1];
      
      if (firstEvent && lastEvent) {
        return lastEvent.timestamp - firstEvent.timestamp;
      }
      
      return 0;
    }
    
    emitEvent(event) {
      this.eventQueue.push(event);
      
      if (this.isConnected) {
        this.sendEvent(event);
      }
    }
    
    debounceEmit(event) {
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
      }
      
      this.debounceTimeout = setTimeout(() => {
        this.emitEvent(event);
      }, 50);
    }
    
    sendEvent(event) {
      if (!this.config.enableBehaviorTracking) return;
      
      fetch(this.config.apiUrl + '/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
      })
      .then(response => response.json())
      .then(data => {
        if (data.adaptations && data.adaptations.length > 0) {
          this.applyAdaptations(data.adaptations);
        }
      })
      .catch(error => {
        if (this.config.debugMode) {
          console.error('Error sending event:', error);
        }
      });
    }
    
    processEventQueue() {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        if (event) {
          this.sendEvent(event);
        }
      }
    }
    
    applyAdaptations(adaptations) {
      adaptations.forEach(adaptation => {
        this.applyAdaptation(adaptation);
      });
    }
    
    applyAdaptation(adaptation) {
      try {
        if (this.config.debugMode) {
          console.log('Applying adaptation:', adaptation);
        }
        
        switch (adaptation.type) {
          case 'contextual_help':
            this.applyContextualHelp(adaptation);
            break;
          case 'smart_validation':
            this.applySmartValidation(adaptation);
            break;
          case 'progressive_disclosure':
            this.applyProgressiveDisclosure(adaptation);
            break;
          case 'field_reorder':
            this.applyFieldReordering(adaptation);
            break;
          default:
            console.warn('Unknown adaptation type:', adaptation.type);
        }
      } catch (error) {
        console.error('Failed to apply adaptation:', error);
      }
    }
    
    applyContextualHelp(adaptation) {
      const { fieldName, helpText, trigger, position } = adaptation.config;
      const field = this.findField(fieldName);
      
      if (!field) return;
      
      const helpElement = this.createHelpElement(helpText, position);
      
      if (trigger === 'focus') {
        field.addEventListener('focus', () => {
          this.showHelpElement(field, helpElement);
        });
        
        field.addEventListener('blur', () => {
          this.hideHelpElement(helpElement);
        });
      }
    }
    
    applySmartValidation(adaptation) {
      const { fieldName, validationType, message } = adaptation.config;
      const field = this.findField(fieldName);
      
      if (!field) return;
      
      if (validationType === 'real_time') {
        field.addEventListener('input', () => {
          const isValid = this.validateField(field);
          
          if (!isValid) {
            this.showValidationMessage(field, message, 'error');
          } else {
            this.hideValidationMessage(field);
          }
        });
      }
    }
    
    applyProgressiveDisclosure(adaptation) {
      const { fieldsToHide, triggerCondition } = adaptation.config;
      
      if (fieldsToHide) {
        fieldsToHide.forEach(fieldName => {
          const field = this.findField(fieldName);
          if (field) {
            this.hideField(field);
          }
        });
      }
      
      if (triggerCondition) {
        this.setupDisclosureTriggers(triggerCondition, fieldsToHide);
      }
    }
    
    applyFieldReordering(adaptation) {
      const { newOrder } = adaptation.config;
      const form = document.querySelector('[data-adapt="' + this.config.formId + '"]');
      
      if (!form) return;
      
      const fields = new Map();
      
      form.querySelectorAll('input, textarea, select').forEach(field => {
        const fieldName = this.getFieldName(field);
        fields.set(fieldName, field);
      });
      
      newOrder.forEach((fieldName, index) => {
        const field = fields.get(fieldName);
        if (field) {
          const fieldContainer = this.getFieldContainer(field);
          if (fieldContainer) {
            this.animateToPosition(fieldContainer, index);
          }
        }
      });
    }
    
    findField(fieldName) {
      const form = document.querySelector('[data-adapt="' + this.config.formId + '"]');
      if (!form) return null;
      
      return form.querySelector('[name="' + fieldName + '"], [id="' + fieldName + '"]');
    }
    
    getFieldContainer(field) {
      let container = field.parentElement;
      while (container && container.tagName !== 'FORM') {
        if (container.classList.contains('field') || 
            container.classList.contains('form-group') ||
            container.classList.contains('input-group')) {
          return container;
        }
        container = container.parentElement;
      }
      
      return field.parentElement;
    }
    
    createHelpElement(text, position) {
      const helpElement = document.createElement('div');
      helpElement.className = 'adapt-help-tooltip';
      helpElement.textContent = text;
      helpElement.style.cssText = \`
        position: absolute;
        background: #1f2937;
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1000;
        max-width: 200px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        opacity: 0;
        transition: opacity 0.2s ease-out;
      \`;
      
      return helpElement;
    }
    
    showHelpElement(field, helpElement) {
      const container = this.getFieldContainer(field);
      if (container) {
        container.style.position = 'relative';
        container.appendChild(helpElement);
        
        helpElement.style.top = field.offsetHeight + 4 + 'px';
        helpElement.style.left = '0';
        helpElement.style.opacity = '1';
      }
    }
    
    hideHelpElement(helpElement) {
      helpElement.style.opacity = '0';
      setTimeout(() => {
        if (helpElement.parentElement) {
          helpElement.parentElement.removeChild(helpElement);
        }
      }, 200);
    }
    
    showValidationMessage(field, message, type) {
      const existingMessage = field.parentElement.querySelector('.adapt-validation-message');
      if (existingMessage) {
        existingMessage.remove();
      }
      
      const messageElement = document.createElement('div');
      messageElement.className = 'adapt-validation-message adapt-' + type;
      messageElement.textContent = message;
      messageElement.style.cssText = \`
        font-size: 12px;
        margin-top: 4px;
        color: \${type === 'error' ? '#dc2626' : '#d97706'};
        display: block;
      \`;
      
      const container = this.getFieldContainer(field);
      if (container) {
        container.appendChild(messageElement);
      }
    }
    
    hideValidationMessage(field) {
      const container = this.getFieldContainer(field);
      if (container) {
        const message = container.querySelector('.adapt-validation-message');
        if (message) {
          message.remove();
        }
      }
    }
    
    validateField(field) {
      if (field.required && !field.value.trim()) {
        return false;
      }
      
      if (field.type === 'email') {
        const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
        return emailRegex.test(field.value);
      }
      
      if (field.type === 'tel') {
        const phoneRegex = /^[\\d\\s\\-\\+\\(\\)]+$/;
        return phoneRegex.test(field.value);
      }
      
      return true;
    }
    
    hideField(field) {
      const container = this.getFieldContainer(field);
      if (container) {
        container.style.transition = 'opacity 300ms ease-out, max-height 300ms ease-out';
        container.style.opacity = '0';
        container.style.maxHeight = '0';
        container.style.overflow = 'hidden';
        
        setTimeout(() => {
          container.style.display = 'none';
        }, 300);
      }
    }
    
    animateToPosition(element, newIndex) {
      const parent = element.parentElement;
      if (!parent) return;
      
      const siblings = Array.from(parent.children);
      const currentIndex = siblings.indexOf(element);
      
      if (currentIndex === newIndex) return;
      
      element.style.transition = 'transform 300ms ease-out';
      element.style.transform = 'translateY(' + ((newIndex - currentIndex) * element.offsetHeight) + 'px)';
      
      setTimeout(() => {
        if (newIndex === 0) {
          parent.prepend(element);
        } else {
          const nextSibling = siblings[newIndex];
          if (nextSibling) {
            parent.insertBefore(element, nextSibling);
          } else {
            parent.appendChild(element);
          }
        }
        
        element.style.transition = '';
        element.style.transform = '';
      }, 300);
    }
    
    setupDisclosureTriggers(condition, fieldsToHide) {
      const { triggerField, triggerValue, triggerEvent } = condition;
      const field = this.findField(triggerField);
      
      if (!field) return;
      
      const handler = (event) => {
        const target = event.target;
        const shouldReveal = this.evaluateTriggerCondition(target.value, triggerValue);
        
        if (shouldReveal) {
          fieldsToHide.forEach(fieldName => {
            const fieldToReveal = this.findField(fieldName);
            if (fieldToReveal) {
              this.revealField(fieldToReveal);
            }
          });
        }
      };
      
      field.addEventListener(triggerEvent || 'change', handler);
    }
    
    evaluateTriggerCondition(value, condition) {
      if (typeof condition === 'string') {
        return value === condition;
      }
      
      if (condition.pattern) {
        return new RegExp(condition.pattern).test(value);
      }
      
      return false;
    }
    
    revealField(field) {
      const container = this.getFieldContainer(field);
      if (!container) return;
      
      container.style.display = 'block';
      container.style.opacity = '0';
      container.style.maxHeight = '0';
      container.style.transition = 'opacity 300ms ease-out, max-height 300ms ease-out';
      
      // Force reflow
      container.offsetHeight;
      
      container.style.opacity = '1';
      container.style.maxHeight = container.scrollHeight + 'px';
      
      setTimeout(() => {
        container.style.transition = '';
        container.style.maxHeight = '';
      }, 300);
    }
  }
  
  // Auto-initialize for forms with data-adapt attribute
  document.addEventListener('DOMContentLoaded', function() {
    const forms = document.querySelectorAll('[data-adapt]');
    
    forms.forEach(function(form) {
      const formId = form.getAttribute('data-adapt');
      const goal = form.getAttribute('data-goal') || 'conversion';
      
      if (formId) {
        new AdaptClient({
          formId: formId,
          goal: goal
        });
      }
    });
  });
  
  // Export for manual usage
  window.Adapt = AdaptClient;
  
})();
`
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}