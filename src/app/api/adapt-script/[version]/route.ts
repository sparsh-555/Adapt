import { NextRequest, NextResponse } from 'next/server'

// Configure the Edge Runtime for global CDN delivery
export const runtime = 'edge'

// Cache configuration for CDN delivery
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
  'CDN-Cache-Control': 'max-age=31536000',
  'Vary': 'Accept-Encoding',
  'Content-Type': 'application/javascript; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CACHE_HEADERS,
  })
}

// Serve the Adapt client script
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ version: string }> }
) {
  const { version } = await params
  
  // Validate version format (e.g., v1.0.0, latest)
  if (!isValidVersion(version)) {
    return new NextResponse('Invalid version format', { 
      status: 400,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }

  try {
    // Generate the client script based on version
    const script = generateAdaptScript(version, request)
    
    // Add version-specific headers
    const responseHeaders = {
      ...CACHE_HEADERS,
      'X-Adapt-Version': version,
      'X-Adapt-Build': getBuildInfo(),
      'Content-Length': Buffer.byteLength(script, 'utf8').toString(),
    }

    return new NextResponse(script, {
      status: 200,
      headers: responseHeaders,
    })

  } catch (error) {
    console.error('Error generating Adapt script:', error)
    
    return new NextResponse('Script generation failed', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }
}

// Validate version format
function isValidVersion(version: string): boolean {
  // Allow 'latest', simple version format (v1), or semantic version format (v1.0.0)
  return version === 'latest' || 
         /^v?\d+$/.test(version) || 
         /^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(version)
}

// Get build information
function getBuildInfo(): string {
  return `${Date.now()}-edge`
}

// Generate the Adapt client script
function generateAdaptScript(version: string, request: NextRequest): string {
  const apiUrl = getApiUrl(request)
  
  return `
/*!
 * Adapt.js v${version}
 * AI-Native Form Optimization Platform
 * (c) 2024 Adapt
 * Released under the MIT License
 */

(function(window, document) {
  'use strict';

  // Early return if already loaded
  if (window.Adapt) {
    console.warn('Adapt is already loaded');
    return;
  }

  // Configuration constants
  const API_URL = '${apiUrl}';
  const VERSION = '${version}';
  const DEBUG = ${process.env.NODE_ENV === 'development'};

  // Utility functions
  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = function() {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }

  // Event tracking class
  class BehaviorTracker {
    constructor(config) {
      this.config = config;
      this.events = [];
      this.sessionId = this.getOrCreateSessionId();
      this.isTracking = false;
      
      this.debouncedSend = debounce(this.sendEvents.bind(this), config.debounceMs || 100);
      this.throttledMouseMove = throttle(this.trackMouseMove.bind(this), 100);
    }

    getOrCreateSessionId() {
      let sessionId = sessionStorage.getItem('adapt-session-id');
      if (!sessionId) {
        sessionId = generateId();
        sessionStorage.setItem('adapt-session-id', sessionId);
      }
      return sessionId;
    }

    track(eventType, data = {}) {
      if (!this.isTracking) return;

      const event = {
        sessionId: this.sessionId,
        formId: data.formId || this.config.formId || 'unknown',
        eventType,
        fieldName: data.fieldName,
        timestamp: Date.now(),
        data,
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      this.events.push(event);
      
      if (DEBUG) {
        console.log('Adapt tracked:', event);
      }

      // Send events in batches or immediately for critical events
      if (eventType === 'form_submit' || this.events.length >= (this.config.batchSize || 10)) {
        this.sendEvents();
      } else {
        this.debouncedSend();
      }
    }

    async sendEvents() {
      if (this.events.length === 0) return;

      const eventsToSend = [...this.events];
      this.events = [];

      try {
        const response = await fetch(\`\${API_URL}/api/track\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ events: eventsToSend }),
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.adaptations && result.adaptations.length > 0) {
            this.applyAdaptations(result.adaptations);
          }
          
          if (DEBUG) {
            console.log('Adapt response:', result);
          }
        } else {
          throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
        }
      } catch (error) {
        console.error('Adapt tracking failed:', error);
        // Re-add events to queue for retry
        this.events.unshift(...eventsToSend);
      }
    }

    applyAdaptations(adaptations) {
      adaptations.forEach(adaptation => {
        try {
          window.Adapt.adapter.apply(adaptation);
        } catch (error) {
          console.error('Failed to apply adaptation:', error, adaptation);
        }
      });
    }

    // Mouse tracking
    trackMouseMove(event) {
      this.track('mouse_move', {
        x: event.clientX,
        y: event.clientY,
        target: event.target.tagName
      });
    }

    // Keyboard tracking
    trackKeyPress(event) {
      this.track('key_press', {
        key: event.key,
        keyCode: event.keyCode,
        fieldName: event.target.name || event.target.id
      });
    }

    // Focus tracking
    trackFocus(event) {
      this.track('focus', {
        fieldName: event.target.name || event.target.id,
        fieldType: event.target.type,
        focusTime: Date.now()
      });
    }

    // Blur tracking
    trackBlur(event) {
      this.track('blur', {
        fieldName: event.target.name || event.target.id,
        fieldType: event.target.type,
        blurTime: Date.now()
      });
    }

    // Form submission tracking
    trackFormSubmit(event) {
      const form = event.target;
      this.track('form_submit', {
        formId: form.id || form.dataset.formId,
        formAction: form.action,
        formMethod: form.method
      });
    }

    // Field change tracking
    trackFieldChange(event) {
      this.track('field_change', {
        fieldName: event.target.name || event.target.id,
        fieldValue: event.target.value?.length || 0,
        fieldType: event.target.type
      });
    }

    // Scroll tracking
    trackScroll() {
      this.track('scroll', {
        scrollTop: window.pageYOffset,
        scrollLeft: window.pageXOffset,
        documentHeight: document.documentElement.scrollHeight,
        windowHeight: window.innerHeight
      });
    }

    startTracking() {
      if (this.isTracking) return;
      
      this.isTracking = true;

      // Add event listeners
      if (this.config.trackMouse) {
        document.addEventListener('mousemove', this.throttledMouseMove);
        document.addEventListener('click', (e) => this.track('mouse_click', {
          x: e.clientX,
          y: e.clientY,
          target: e.target.tagName
        }));
      }

      if (this.config.trackKeyboard) {
        document.addEventListener('keypress', this.trackKeyPress.bind(this));
      }

      if (this.config.trackScroll) {
        const throttledScroll = throttle(this.trackScroll.bind(this), 200);
        window.addEventListener('scroll', throttledScroll);
      }

      // Form-specific tracking
      const forms = document.querySelectorAll(this.config.formSelector || 'form');
      forms.forEach(form => {
        form.addEventListener('submit', this.trackFormSubmit.bind(this));
        
        const fields = form.querySelectorAll('input, textarea, select');
        fields.forEach(field => {
          field.addEventListener('focus', this.trackFocus.bind(this));
          field.addEventListener('blur', this.trackBlur.bind(this));
          field.addEventListener('input', this.trackFieldChange.bind(this));
        });
      });

      // Track page load
      this.track('page_load', {
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent
      });
    }

    stopTracking() {
      this.isTracking = false;
      // Remove event listeners (implementation depends on specific needs)
    }
  }

  // DOM Adapter class for applying adaptations
  class DOMAdapter {
    constructor() {
      this.appliedAdaptations = new Set();
    }

    apply(adaptation) {
      const adaptationKey = \`\${adaptation.sessionId}-\${adaptation.adaptationType}-\${adaptation.appliedAt}\`;
      
      if (this.appliedAdaptations.has(adaptationKey)) {
        return; // Already applied
      }

      switch (adaptation.adaptationType) {
        case 'field_reorder':
          this.applyFieldReordering(adaptation);
          break;
        case 'progressive_disclosure':
          this.applyProgressiveDisclosure(adaptation);
          break;
        case 'context_switching':
          this.applyContextSwitching(adaptation);
          break;
        case 'error_prevention':
          this.applyErrorPrevention(adaptation);
          break;
        default:
          console.warn('Unknown adaptation type:', adaptation.adaptationType);
      }

      this.appliedAdaptations.add(adaptationKey);
    }

    applyFieldReordering(adaptation) {
      const config = adaptation.config.fieldReorder;
      if (!config) return;

      const form = document.querySelector(\`[data-form-id="\${adaptation.formId}"]\`) || 
                   document.getElementById(adaptation.formId) ||
                   document.querySelector('form');
      
      if (!form) return;

      // Implement field reordering logic
      console.log('Applying field reordering:', config);
    }

    applyProgressiveDisclosure(adaptation) {
      const config = adaptation.config.progressiveDisclosure;
      if (!config) return;

      // Implement progressive disclosure logic
      console.log('Applying progressive disclosure:', config);
    }

    applyContextSwitching(adaptation) {
      const config = adaptation.config.contextSwitching;
      if (!config) return;

      // Implement context switching logic
      console.log('Applying context switching:', config);
    }

    applyErrorPrevention(adaptation) {
      const config = adaptation.config.errorPrevention;
      if (!config) return;

      // Implement error prevention logic
      console.log('Applying error prevention:', config);
    }
  }

  // Main Adapt class
  class Adapt {
    constructor() {
      this.version = VERSION;
      this.tracker = null;
      this.adapter = new DOMAdapter();
      this.config = null;
    }

    init(config = {}) {
      this.config = {
        trackMouse: true,
        trackKeyboard: true,
        trackScroll: true,
        debounceMs: 100,
        batchSize: 10,
        formSelector: 'form',
        ...config
      };

      this.tracker = new BehaviorTracker(this.config);
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.tracker.startTracking();
        });
      } else {
        this.tracker.startTracking();
      }

      if (DEBUG) {
        console.log('Adapt initialized with config:', this.config);
      }

      return this;
    }

    track(eventType, data) {
      if (this.tracker) {
        this.tracker.track(eventType, data);
      }
      return this;
    }

    destroy() {
      if (this.tracker) {
        this.tracker.stopTracking();
        this.tracker = null;
      }
      return this;
    }
  }

  // Create global instance
  window.Adapt = new Adapt();

  // Auto-initialize if data-adapt attribute is found
  const adaptScript = document.querySelector('script[data-adapt]');
  if (adaptScript) {
    const config = {};
    
    // Parse configuration from data attributes
    if (adaptScript.dataset.formSelector) {
      config.formSelector = adaptScript.dataset.formSelector;
    }
    if (adaptScript.dataset.trackMouse !== undefined) {
      config.trackMouse = adaptScript.dataset.trackMouse !== 'false';
    }
    if (adaptScript.dataset.trackKeyboard !== undefined) {
      config.trackKeyboard = adaptScript.dataset.trackKeyboard !== 'false';
    }
    
    window.Adapt.init(config);
  }

})(window, document);`
}

// Get API URL from request
function getApiUrl(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  return `${protocol}://${host}`
}