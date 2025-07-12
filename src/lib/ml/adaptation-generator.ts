import { FormAdaptation, BehaviorEvent, UserProfile } from '@/types'
import { MLInferenceEngine, BehaviorFeatures, AdaptationPrediction } from './inference'
import { generateId } from '@/utils'

export interface AdaptationGeneratorConfig {
  maxAdaptationsPerSession: number
  confidenceThreshold: number
  cooldownPeriod: number // ms between adaptations
  enableABTesting: boolean
  debugging: boolean
}

export interface AdaptationContext {
  formId: string
  sessionId: string
  userId?: string
  deviceType: string
  formElements: {
    totalFields: number
    fieldTypes: string[]
    hasValidation: boolean
    layout: 'single-column' | 'multi-column' | 'grid'
  }
  currentAdaptations: FormAdaptation[]
  sessionStartTime: number
}

/**
 * Generates specific form adaptations based on ML predictions
 */
export class AdaptationGenerator {
  private mlEngine: MLInferenceEngine
  private config: AdaptationGeneratorConfig
  private adaptationHistory: Map<string, FormAdaptation[]> = new Map()
  private lastAdaptationTime: Map<string, number> = new Map()

  constructor(
    mlEngine: MLInferenceEngine,
    config: Partial<AdaptationGeneratorConfig> = {}
  ) {
    this.mlEngine = mlEngine
    this.config = {
      maxAdaptationsPerSession: 10,
      confidenceThreshold: 0.3,
      cooldownPeriod: 30000, // 30 seconds
      enableABTesting: true,
      debugging: false,
      ...config,
    }
  }

  /**
   * Generate adaptations based on behavior events
   */
  async generateAdaptations(
    events: BehaviorEvent[],
    context: AdaptationContext,
    userProfile?: UserProfile
  ): Promise<FormAdaptation[]> {
    try {
      // Check cooldown period
      if (this.isInCooldown(context.sessionId)) {
        return []
      }

      // Check max adaptations limit
      if (this.hasReachedAdaptationLimit(context.sessionId)) {
        return []
      }

      // Extract behavioral features
      const features = this.mlEngine.extractBehaviorFeatures(events, userProfile)
      
      // Get ML predictions
      const predictions = await this.mlEngine.generateAdaptations(
        features,
        context.formId,
        context.sessionId
      )

      // Convert predictions to specific adaptations
      const adaptations = await this.createAdaptationsFromPredictions(
        predictions,
        context,
        features
      )

      // Filter and prioritize adaptations
      const finalAdaptations = this.filterAndPrioritizeAdaptations(
        adaptations,
        context
      )

      // Update adaptation history
      this.updateAdaptationHistory(context.sessionId, finalAdaptations)
      this.lastAdaptationTime.set(context.sessionId, Date.now())

      if (this.config.debugging) {
        console.log('Generated adaptations:', {
          sessionId: context.sessionId,
          adaptationCount: finalAdaptations.length,
          adaptations: finalAdaptations,
        })
      }

      return finalAdaptations

    } catch (error) {
      console.error('Failed to generate adaptations:', error)
      return []
    }
  }

  /**
   * Convert ML predictions to specific form adaptations
   */
  private async createAdaptationsFromPredictions(
    predictions: AdaptationPrediction[],
    context: AdaptationContext,
    features: BehaviorFeatures
  ): Promise<FormAdaptation[]> {
    const adaptations: FormAdaptation[] = []

    for (const prediction of predictions) {
      const adaptation = await this.createSpecificAdaptation(
        prediction,
        context,
        features
      )
      
      if (adaptation) {
        adaptations.push(adaptation)
      }
    }

    return adaptations
  }

  /**
   * Create a specific adaptation based on prediction type
   */
  private async createSpecificAdaptation(
    prediction: AdaptationPrediction,
    context: AdaptationContext,
    features: BehaviorFeatures
  ): Promise<FormAdaptation | null> {
    const baseAdaptation: Partial<FormAdaptation> = {
      id: generateId(),
      sessionId: context.sessionId,
      formId: context.formId,
      adaptationType: prediction.type,
      confidence: prediction.confidence,
      appliedAt: new Date().toISOString(),
      isActive: true,
      metadata: {
        mlPrediction: prediction,
        behaviorFeatures: features,
        deviceType: context.deviceType,
      },
    }

    switch (prediction.type) {
      case 'field_reordering':
        return this.createFieldReorderingAdaptation(baseAdaptation, prediction, context)

      case 'progressive_disclosure':
        return this.createProgressiveDisclosureAdaptation(baseAdaptation, prediction, context)

      case 'error_prevention':
        return this.createErrorPreventionAdaptation(baseAdaptation, prediction, context)

      case 'context_switching':
        return this.createContextSwitchingAdaptation(baseAdaptation, prediction, context)

      case 'visual_emphasis':
        return this.createVisualEmphasisAdaptation(baseAdaptation, prediction, context)

      case 'input_assistance':
        return this.createInputAssistanceAdaptation(baseAdaptation, prediction, context)

      case 'validation_timing':
        return this.createValidationTimingAdaptation(baseAdaptation, prediction, context)

      case 'completion_guidance':
        return this.createCompletionGuidanceAdaptation(baseAdaptation, prediction, context)

      default:
        return null
    }
  }

  /**
   * Create field reordering adaptation
   */
  private createFieldReorderingAdaptation(
    base: Partial<FormAdaptation>,
    prediction: AdaptationPrediction,
    context: AdaptationContext
  ): FormAdaptation {
    return {
      ...base,
      parameters: {
        strategy: prediction.parameters.strategy,
        priorityFields: prediction.parameters.priorityFields,
        newOrder: this.calculateOptimalFieldOrder(
          context.formElements,
          prediction.parameters.priorityFields
        ),
      },
      cssChanges: {
        '.form-field': {
          order: 'var(--field-order)',
        },
      },
      jsChanges: `
        // Reorder form fields based on user behavior
        const form = document.querySelector('[data-form-id="${context.formId}"]');
        if (form) {
          const newOrder = ${JSON.stringify(prediction.parameters.priorityFields)};
          newOrder.forEach((fieldIndex, order) => {
            const field = form.querySelector(\`[data-field-index="\${fieldIndex}"]\`);
            if (field) {
              field.style.setProperty('--field-order', order + 1);
            }
          });
        }
      `,
      description: prediction.explanation,
    } as FormAdaptation
  }

  /**
   * Create progressive disclosure adaptation
   */
  private createProgressiveDisclosureAdaptation(
    base: Partial<FormAdaptation>,
    prediction: AdaptationPrediction,
    context: AdaptationContext
  ): FormAdaptation {
    const initialFields = prediction.parameters.initialFields || 3

    return {
      ...base,
      parameters: {
        initialFields,
        strategy: prediction.parameters.strategy,
        showMoreText: 'Show more fields',
        animationDuration: 300,
      },
      cssChanges: {
        '.form-field.hidden-step': {
          display: 'none',
          opacity: '0',
          transition: 'opacity 0.3s ease-in-out',
        },
        '.form-field.visible-step': {
          display: 'block',
          opacity: '1',
        },
        '.show-more-button': {
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          margin: '10px 0',
        },
      },
      jsChanges: `
        // Implement progressive disclosure
        const form = document.querySelector('[data-form-id="${context.formId}"]');
        if (form) {
          const fields = form.querySelectorAll('.form-field');
          const initialFields = ${initialFields};
          
          fields.forEach((field, index) => {
            if (index >= initialFields) {
              field.classList.add('hidden-step');
            } else {
              field.classList.add('visible-step');
            }
          });
          
          if (fields.length > initialFields) {
            const showMoreBtn = document.createElement('button');
            showMoreBtn.className = 'show-more-button';
            showMoreBtn.textContent = 'Show more fields';
            showMoreBtn.onclick = () => {
              const hiddenFields = form.querySelectorAll('.hidden-step');
              if (hiddenFields.length > 0) {
                const nextBatch = Math.min(${initialFields}, hiddenFields.length);
                for (let i = 0; i < nextBatch; i++) {
                  hiddenFields[i].classList.remove('hidden-step');
                  hiddenFields[i].classList.add('visible-step');
                }
                if (form.querySelectorAll('.hidden-step').length === 0) {
                  showMoreBtn.style.display = 'none';
                }
              }
            };
            form.appendChild(showMoreBtn);
          }
        }
      `,
      description: prediction.explanation,
    } as FormAdaptation
  }

  /**
   * Create error prevention adaptation
   */
  private createErrorPreventionAdaptation(
    base: Partial<FormAdaptation>,
    prediction: AdaptationPrediction,
    context: AdaptationContext
  ): FormAdaptation {
    return {
      ...base,
      parameters: {
        enableRealTimeValidation: prediction.parameters.enableRealTimeValidation,
        enableInputMasking: prediction.parameters.enableInputMasking,
        enableAutoComplete: prediction.parameters.enableAutoComplete,
        validationDelay: 500,
      },
      cssChanges: {
        '.field-error': {
          color: '#dc3545',
          fontSize: '0.875rem',
          marginTop: '0.25rem',
        },
        '.field-valid': {
          borderColor: '#28a745',
        },
        '.field-invalid': {
          borderColor: '#dc3545',
        },
        '.input-suggestion': {
          position: 'absolute',
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 1000,
        },
      },
      jsChanges: `
        // Implement error prevention
        const form = document.querySelector('[data-form-id="${context.formId}"]');
        if (form) {
          const inputs = form.querySelectorAll('input, select, textarea');
          
          inputs.forEach(input => {
            // Real-time validation
            if (${prediction.parameters.enableRealTimeValidation}) {
              let validationTimeout;
              input.addEventListener('input', () => {
                clearTimeout(validationTimeout);
                validationTimeout = setTimeout(() => {
                  validateField(input);
                }, 500);
              });
            }
            
            // Input masking for specific field types
            if (${prediction.parameters.enableInputMasking}) {
              if (input.type === 'tel') {
                input.addEventListener('input', maskPhoneNumber);
              } else if (input.type === 'email') {
                input.addEventListener('input', validateEmail);
              }
            }
            
            // Auto-complete suggestions
            if (${prediction.parameters.enableAutoComplete}) {
              input.setAttribute('autocomplete', 'on');
            }
          });
        }
        
        function validateField(field) {
          // Simplified validation logic
          const value = field.value.trim();
          const isValid = value.length > 0; // Basic validation
          
          field.classList.toggle('field-valid', isValid);
          field.classList.toggle('field-invalid', !isValid);
          
          let errorMsg = field.nextElementSibling;
          if (errorMsg && errorMsg.classList.contains('field-error')) {
            errorMsg.remove();
          }
          
          if (!isValid && field.required) {
            errorMsg = document.createElement('div');
            errorMsg.className = 'field-error';
            errorMsg.textContent = 'This field is required';
            field.parentNode.insertBefore(errorMsg, field.nextSibling);
          }
        }
        
        function maskPhoneNumber(event) {
          let value = event.target.value.replace(/\\D/g, '');
          if (value.length >= 6) {
            value = value.replace(/(\\d{3})(\\d{3})(\\d{4})/, '($1) $2-$3');
          }
          event.target.value = value;
        }
        
        function validateEmail(event) {
          const email = event.target.value;
          const isValid = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
          event.target.classList.toggle('field-valid', isValid);
          event.target.classList.toggle('field-invalid', !isValid && email.length > 0);
        }
      `,
      description: prediction.explanation,
    } as FormAdaptation
  }

  /**
   * Create context switching adaptation
   */
  private createContextSwitchingAdaptation(
    base: Partial<FormAdaptation>,
    prediction: AdaptationPrediction,
    context: AdaptationContext
  ): FormAdaptation {
    return {
      ...base,
      parameters: {
        enableTooltips: prediction.parameters.enableTooltips,
        enableInlineHelp: prediction.parameters.enableInlineHelp,
        enableExamples: prediction.parameters.enableExamples,
      },
      cssChanges: {
        '.help-tooltip': {
          position: 'relative',
          display: 'inline-block',
          cursor: 'help',
        },
        '.help-tooltip .tooltip-text': {
          visibility: 'hidden',
          width: '200px',
          backgroundColor: '#333',
          color: 'white',
          textAlign: 'center',
          borderRadius: '6px',
          padding: '5px',
          position: 'absolute',
          zIndex: 1,
          bottom: '125%',
          left: '50%',
          marginLeft: '-100px',
          opacity: 0,
          transition: 'opacity 0.3s',
        },
        '.help-tooltip:hover .tooltip-text': {
          visibility: 'visible',
          opacity: 1,
        },
        '.inline-help': {
          fontSize: '0.875rem',
          color: '#6c757d',
          marginTop: '0.25rem',
        },
      },
      jsChanges: `
        // Add contextual help
        const form = document.querySelector('[data-form-id="${context.formId}"]');
        if (form) {
          const fields = form.querySelectorAll('input, select, textarea');
          
          fields.forEach(field => {
            if (${prediction.parameters.enableTooltips}) {
              addTooltip(field);
            }
            
            if (${prediction.parameters.enableInlineHelp}) {
              addInlineHelp(field);
            }
            
            if (${prediction.parameters.enableExamples}) {
              addFieldExample(field);
            }
          });
        }
        
        function addTooltip(field) {
          const label = field.previousElementSibling;
          if (label && label.tagName === 'LABEL') {
            const helpIcon = document.createElement('span');
            helpIcon.innerHTML = ' &#9432;';
            helpIcon.className = 'help-tooltip';
            
            const tooltipText = document.createElement('span');
            tooltipText.className = 'tooltip-text';
            tooltipText.textContent = getHelpText(field);
            
            helpIcon.appendChild(tooltipText);
            label.appendChild(helpIcon);
          }
        }
        
        function addInlineHelp(field) {
          const helpText = document.createElement('div');
          helpText.className = 'inline-help';
          helpText.textContent = getHelpText(field);
          field.parentNode.insertBefore(helpText, field.nextSibling);
        }
        
        function addFieldExample(field) {
          if (!field.placeholder) {
            field.placeholder = getExampleText(field);
          }
        }
        
        function getHelpText(field) {
          const type = field.type || field.tagName.toLowerCase();
          const name = field.name || field.id || '';
          
          if (name.includes('email')) return 'Enter a valid email address';
          if (name.includes('phone')) return 'Enter your phone number with area code';
          if (type === 'password') return 'Use at least 8 characters';
          if (name.includes('name')) return 'Enter your full name';
          return 'Please fill out this field completely';
        }
        
        function getExampleText(field) {
          const type = field.type || field.tagName.toLowerCase();
          const name = field.name || field.id || '';
          
          if (name.includes('email')) return 'example@domain.com';
          if (name.includes('phone')) return '(555) 123-4567';
          if (name.includes('name')) return 'John Doe';
          if (type === 'date') return 'MM/DD/YYYY';
          return '';
        }
      `,
      description: prediction.explanation,
    } as FormAdaptation
  }

  // Simplified implementations for other adaptation types
  private createVisualEmphasisAdaptation(
    base: Partial<FormAdaptation>,
    prediction: AdaptationPrediction,
    context: AdaptationContext
  ): FormAdaptation {
    return {
      ...base,
      cssChanges: {
        '.form-field.emphasized': {
          borderWidth: '2px',
          borderColor: '#007bff',
          backgroundColor: '#f8f9fa',
        },
      },
      description: 'Emphasize important fields based on user behavior',
    } as FormAdaptation
  }

  private createInputAssistanceAdaptation(
    base: Partial<FormAdaptation>,
    prediction: AdaptationPrediction,
    context: AdaptationContext
  ): FormAdaptation {
    return {
      ...base,
      cssChanges: {
        '.input-assistance': {
          fontSize: '0.875rem',
          color: '#28a745',
          marginTop: '0.25rem',
        },
      },
      description: 'Provide input assistance for complex fields',
    } as FormAdaptation
  }

  private createValidationTimingAdaptation(
    base: Partial<FormAdaptation>,
    prediction: AdaptationPrediction,
    context: AdaptationContext
  ): FormAdaptation {
    return {
      ...base,
      parameters: {
        validationDelay: prediction.parameters.validationDelay || 1000,
      },
      description: 'Optimize validation timing based on user typing speed',
    } as FormAdaptation
  }

  private createCompletionGuidanceAdaptation(
    base: Partial<FormAdaptation>,
    prediction: AdaptationPrediction,
    context: AdaptationContext
  ): FormAdaptation {
    return {
      ...base,
      cssChanges: {
        '.completion-progress': {
          width: '100%',
          backgroundColor: '#e9ecef',
          borderRadius: '4px',
          height: '8px',
          marginBottom: '20px',
        },
        '.completion-progress-bar': {
          height: '100%',
          backgroundColor: '#28a745',
          borderRadius: '4px',
          transition: 'width 0.3s ease',
        },
      },
      description: 'Show form completion progress to encourage completion',
    } as FormAdaptation
  }

  // Helper methods
  private calculateOptimalFieldOrder(
    formElements: AdaptationContext['formElements'],
    priorityFields: number[]
  ): number[] {
    // Simplified field ordering logic
    const totalFields = formElements.totalFields
    const newOrder = Array.from({ length: totalFields }, (_, i) => i)
    
    // Move priority fields to the beginning
    priorityFields.forEach((fieldIndex, priority) => {
      if (fieldIndex < totalFields) {
        const currentIndex = newOrder.indexOf(fieldIndex)
        if (currentIndex > -1) {
          newOrder.splice(currentIndex, 1)
          newOrder.splice(priority, 0, fieldIndex)
        }
      }
    })
    
    return newOrder
  }

  private filterAndPrioritizeAdaptations(
    adaptations: FormAdaptation[],
    context: AdaptationContext
  ): FormAdaptation[] {
    // Filter out conflicting adaptations
    const filtered = this.removeConflictingAdaptations(adaptations, context)
    
    // Sort by confidence and priority
    filtered.sort((a, b) => {
      // Prioritize certain adaptation types
      const priorityTypes = ['error_prevention', 'progressive_disclosure', 'field_reordering']
      const aPriority = priorityTypes.indexOf(a.adaptationType)
      const bPriority = priorityTypes.indexOf(b.adaptationType)
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }
      
      return b.confidence - a.confidence
    })
    
    // Limit number of adaptations
    return filtered.slice(0, Math.min(3, this.config.maxAdaptationsPerSession))
  }

  private removeConflictingAdaptations(
    adaptations: FormAdaptation[],
    context: AdaptationContext
  ): FormAdaptation[] {
    const conflictGroups = [
      ['field_reordering', 'progressive_disclosure'],
      ['error_prevention', 'validation_timing'],
    ]
    
    const filtered: FormAdaptation[] = []
    const usedTypes = new Set<string>()
    
    for (const adaptation of adaptations) {
      const conflicts = conflictGroups.find(group => 
        group.includes(adaptation.adaptationType)
      )
      
      if (conflicts) {
        const hasConflict = conflicts.some(type => usedTypes.has(type))
        if (!hasConflict) {
          filtered.push(adaptation)
          usedTypes.add(adaptation.adaptationType)
        }
      } else {
        filtered.push(adaptation)
        usedTypes.add(adaptation.adaptationType)
      }
    }
    
    return filtered
  }

  private isInCooldown(sessionId: string): boolean {
    const lastTime = this.lastAdaptationTime.get(sessionId)
    if (!lastTime) return false
    return Date.now() - lastTime < this.config.cooldownPeriod
  }

  private hasReachedAdaptationLimit(sessionId: string): boolean {
    const history = this.adaptationHistory.get(sessionId) || []
    return history.length >= this.config.maxAdaptationsPerSession
  }

  private updateAdaptationHistory(sessionId: string, adaptations: FormAdaptation[]): void {
    const existing = this.adaptationHistory.get(sessionId) || []
    this.adaptationHistory.set(sessionId, [...existing, ...adaptations])
  }

  /**
   * Get adaptation history for a session
   */
  getAdaptationHistory(sessionId: string): FormAdaptation[] {
    return this.adaptationHistory.get(sessionId) || []
  }

  /**
   * Clear adaptation history for a session
   */
  clearAdaptationHistory(sessionId: string): void {
    this.adaptationHistory.delete(sessionId)
    this.lastAdaptationTime.delete(sessionId)
  }
}

export default AdaptationGenerator