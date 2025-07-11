import { Adaptation } from './types'

export class DOMAdapter {
  private formSelector: string
  private originalFieldOrder: Map<string, number> = new Map()
  private animationDuration = 300

  constructor(formSelector: string) {
    this.formSelector = formSelector
    this.captureOriginalLayout()
  }

  private captureOriginalLayout(): void {
    const form = document.querySelector(this.formSelector)
    if (!form) return

    const fields = form.querySelectorAll('input, textarea, select')
    fields.forEach((field, index) => {
      const fieldName = this.getFieldName(field as HTMLElement)
      this.originalFieldOrder.set(fieldName, index)
    })
  }

  async applyAdaptation(adaptation: Adaptation): Promise<void> {
    try {
      switch (adaptation.type) {
        case 'field_reorder':
          await this.applyFieldReordering(adaptation)
          break
        case 'progressive_disclosure':
          await this.applyProgressiveDisclosure(adaptation)
          break
        case 'smart_validation':
          await this.applySmartValidation(adaptation)
          break
        case 'contextual_help':
          await this.applyContextualHelp(adaptation)
          break
        default:
          console.warn(`Unknown adaptation type: ${adaptation.type}`)
      }
    } catch (error) {
      console.error('Failed to apply adaptation:', error)
      this.revertToOriginal()
    }
  }

  private async applyFieldReordering(adaptation: Adaptation): Promise<void> {
    const form = document.querySelector(this.formSelector)
    if (!form) return

    const { newOrder } = adaptation.config
    const fields = new Map<string, HTMLElement>()
    
    // Collect all fields
    form.querySelectorAll('input, textarea, select').forEach(field => {
      const fieldName = this.getFieldName(field as HTMLElement)
      fields.set(fieldName, field as HTMLElement)
    })

    // Apply new order with smooth animations
    for (let i = 0; i < newOrder.length; i++) {
      const fieldName = newOrder[i]
      const field = fields.get(fieldName)
      
      if (field) {
        const fieldContainer = this.getFieldContainer(field)
        if (fieldContainer) {
          await this.animateToPosition(fieldContainer, i)
        }
      }
    }
  }

  private async applyProgressiveDisclosure(adaptation: Adaptation): Promise<void> {
    const { fieldsToReveal, fieldsToHide, triggerCondition } = adaptation.config
    
    // Hide fields that should be hidden
    if (fieldsToHide) {
      for (const fieldName of fieldsToHide) {
        const field = this.findField(fieldName)
        if (field) {
          await this.hideField(field)
        }
      }
    }

    // Set up trigger conditions for revealing fields
    if (triggerCondition && fieldsToReveal) {
      this.setupDisclosureTriggers(triggerCondition, fieldsToReveal)
    }
  }

  private async applySmartValidation(adaptation: Adaptation): Promise<void> {
    const { fieldName, validationType, message, timing } = adaptation.config
    const field = this.findField(fieldName)
    
    if (!field) return

    // Remove existing validation
    this.removeValidation(field)

    // Add new validation based on type
    switch (validationType) {
      case 'real_time':
        this.addRealTimeValidation(field, message)
        break
      case 'on_blur':
        this.addOnBlurValidation(field, message)
        break
      case 'predictive':
        this.addPredictiveValidation(field, message)
        break
    }
  }

  private async applyContextualHelp(adaptation: Adaptation): Promise<void> {
    const { fieldName, helpText, trigger, position } = adaptation.config
    const field = this.findField(fieldName)
    
    if (!field) return

    const helpElement = this.createHelpElement(helpText, position)
    
    switch (trigger) {
      case 'hover':
        this.addHoverHelp(field, helpElement)
        break
      case 'focus':
        this.addFocusHelp(field, helpElement)
        break
      case 'error':
        this.addErrorHelp(field, helpElement)
        break
    }
  }

  private async animateToPosition(element: HTMLElement, newIndex: number): Promise<void> {
    return new Promise(resolve => {
      const parent = element.parentElement
      if (!parent) {
        resolve()
        return
      }

      // Calculate new position
      const siblings = Array.from(parent.children)
      const currentIndex = siblings.indexOf(element)
      
      if (currentIndex === newIndex) {
        resolve()
        return
      }

      // Add transition
      element.style.transition = `transform ${this.animationDuration}ms ease-out`
      element.style.transform = `translateY(${(newIndex - currentIndex) * element.offsetHeight}px)`

      // After animation, actually reorder in DOM
      setTimeout(() => {
        if (newIndex === 0) {
          parent.prepend(element)
        } else {
          const nextSibling = siblings[newIndex]
          if (nextSibling) {
            parent.insertBefore(element, nextSibling)
          } else {
            parent.appendChild(element)
          }
        }

        // Reset styles
        element.style.transition = ''
        element.style.transform = ''
        resolve()
      }, this.animationDuration)
    })
  }

  private async hideField(field: HTMLElement): Promise<void> {
    return new Promise(resolve => {
      const container = this.getFieldContainer(field)
      if (!container) {
        resolve()
        return
      }

      container.style.transition = `opacity ${this.animationDuration}ms ease-out, max-height ${this.animationDuration}ms ease-out`
      container.style.opacity = '0'
      container.style.maxHeight = '0'
      container.style.overflow = 'hidden'

      setTimeout(() => {
        container.style.display = 'none'
        resolve()
      }, this.animationDuration)
    })
  }

  private async revealField(field: HTMLElement): Promise<void> {
    return new Promise(resolve => {
      const container = this.getFieldContainer(field)
      if (!container) {
        resolve()
        return
      }

      container.style.display = 'block'
      container.style.opacity = '0'
      container.style.maxHeight = '0'
      container.style.transition = `opacity ${this.animationDuration}ms ease-out, max-height ${this.animationDuration}ms ease-out`

      // Force reflow
      container.offsetHeight

      container.style.opacity = '1'
      container.style.maxHeight = `${container.scrollHeight}px`

      setTimeout(() => {
        container.style.transition = ''
        container.style.maxHeight = ''
        resolve()
      }, this.animationDuration)
    })
  }

  private setupDisclosureTriggers(condition: any, fieldsToReveal: string[]): void {
    const { triggerField, triggerValue, triggerEvent } = condition
    const field = this.findField(triggerField)
    
    if (!field) return

    const handler = (event: Event) => {
      const target = event.target as HTMLInputElement
      const shouldReveal = this.evaluateTriggerCondition(target.value, triggerValue)
      
      if (shouldReveal) {
        fieldsToReveal.forEach(async fieldName => {
          const fieldToReveal = this.findField(fieldName)
          if (fieldToReveal) {
            await this.revealField(fieldToReveal)
          }
        })
      }
    }

    field.addEventListener(triggerEvent || 'change', handler)
  }

  private evaluateTriggerCondition(value: string, condition: any): boolean {
    if (typeof condition === 'string') {
      return value === condition
    }
    
    if (condition.equals) {
      return value === condition.equals
    }
    
    if (condition.includes) {
      return condition.includes.includes(value)
    }
    
    if (condition.pattern) {
      return new RegExp(condition.pattern).test(value)
    }
    
    return false
  }

  private addRealTimeValidation(field: HTMLElement, message: string): void {
    const validationHandler = (event: Event) => {
      const target = event.target as HTMLInputElement
      const isValid = this.validateField(target)
      
      if (!isValid) {
        this.showValidationMessage(field, message, 'error')
      } else {
        this.hideValidationMessage(field)
      }
    }

    field.addEventListener('input', validationHandler)
    field.addEventListener('blur', validationHandler)
  }

  private addOnBlurValidation(field: HTMLElement, message: string): void {
    const validationHandler = (event: Event) => {
      const target = event.target as HTMLInputElement
      const isValid = this.validateField(target)
      
      if (!isValid) {
        this.showValidationMessage(field, message, 'error')
      }
    }

    field.addEventListener('blur', validationHandler)
  }

  private addPredictiveValidation(field: HTMLElement, message: string): void {
    const validationHandler = (event: Event) => {
      const target = event.target as HTMLInputElement
      const potentialIssue = this.predictValidationIssue(target)
      
      if (potentialIssue) {
        this.showValidationMessage(field, message, 'warning')
      } else {
        this.hideValidationMessage(field)
      }
    }

    field.addEventListener('input', validationHandler)
  }

  private validateField(field: HTMLInputElement): boolean {
    // Basic validation logic
    if (field.required && !field.value.trim()) {
      return false
    }

    if (field.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(field.value)
    }

    if (field.type === 'tel') {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/
      return phoneRegex.test(field.value)
    }

    return true
  }

  private predictValidationIssue(field: HTMLInputElement): boolean {
    // Predict potential validation issues before they occur
    if (field.type === 'email' && field.value.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return !emailRegex.test(field.value)
    }

    return false
  }

  private showValidationMessage(field: HTMLElement, message: string, type: 'error' | 'warning'): void {
    const existingMessage = field.parentElement?.querySelector('.adapt-validation-message')
    if (existingMessage) {
      existingMessage.remove()
    }

    const messageElement = document.createElement('div')
    messageElement.className = `adapt-validation-message adapt-${type}`
    messageElement.textContent = message
    messageElement.style.cssText = `
      font-size: 12px;
      margin-top: 4px;
      color: ${type === 'error' ? '#dc2626' : '#d97706'};
      display: block;
    `

    const container = this.getFieldContainer(field)
    if (container) {
      container.appendChild(messageElement)
    }
  }

  private hideValidationMessage(field: HTMLElement): void {
    const container = this.getFieldContainer(field)
    if (container) {
      const message = container.querySelector('.adapt-validation-message')
      if (message) {
        message.remove()
      }
    }
  }

  private removeValidation(field: HTMLElement): void {
    // Remove existing validation messages and event listeners
    this.hideValidationMessage(field)
    
    // Clone node to remove event listeners
    const newField = field.cloneNode(true) as HTMLElement
    field.parentNode?.replaceChild(newField, field)
  }

  private addHoverHelp(field: HTMLElement, helpElement: HTMLElement): void {
    field.addEventListener('mouseenter', () => {
      this.showHelpElement(field, helpElement)
    })

    field.addEventListener('mouseleave', () => {
      this.hideHelpElement(helpElement)
    })
  }

  private addFocusHelp(field: HTMLElement, helpElement: HTMLElement): void {
    field.addEventListener('focus', () => {
      this.showHelpElement(field, helpElement)
    })

    field.addEventListener('blur', () => {
      this.hideHelpElement(helpElement)
    })
  }

  private addErrorHelp(field: HTMLElement, helpElement: HTMLElement): void {
    // Show help when validation fails
    field.addEventListener('invalid', () => {
      this.showHelpElement(field, helpElement)
    })
  }

  private createHelpElement(text: string, position: 'top' | 'bottom' | 'left' | 'right' = 'bottom'): HTMLElement {
    const helpElement = document.createElement('div')
    helpElement.className = 'adapt-help-tooltip'
    helpElement.textContent = text
    helpElement.style.cssText = `
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
    `

    return helpElement
  }

  private showHelpElement(field: HTMLElement, helpElement: HTMLElement): void {
    const container = this.getFieldContainer(field)
    if (container) {
      container.style.position = 'relative'
      container.appendChild(helpElement)
      
      // Position the help element
      const rect = field.getBoundingClientRect()
      helpElement.style.top = `${field.offsetHeight + 4}px`
      helpElement.style.left = '0'
      helpElement.style.opacity = '1'
    }
  }

  private hideHelpElement(helpElement: HTMLElement): void {
    helpElement.style.opacity = '0'
    setTimeout(() => {
      if (helpElement.parentElement) {
        helpElement.parentElement.removeChild(helpElement)
      }
    }, 200)
  }

  private findField(fieldName: string): HTMLElement | null {
    const form = document.querySelector(this.formSelector)
    if (!form) return null

    return form.querySelector(`[name="${fieldName}"], [id="${fieldName}"]`) as HTMLElement
  }

  private getFieldContainer(field: HTMLElement): HTMLElement | null {
    // Try to find the field container (div, fieldset, etc.)
    let container = field.parentElement
    while (container && container.tagName !== 'FORM') {
      if (container.classList.contains('field') || 
          container.classList.contains('form-group') ||
          container.classList.contains('input-group')) {
        return container
      }
      container = container.parentElement
    }
    
    return field.parentElement
  }

  private getFieldName(field: HTMLElement): string {
    return field.getAttribute('name') || 
           field.getAttribute('id') || 
           field.className ||
           'unnamed_field'
  }

  revertToOriginal(): void {
    // Revert all changes back to original state
    const form = document.querySelector(this.formSelector)
    if (!form) return

    // Remove all adapt-specific elements
    form.querySelectorAll('.adapt-validation-message, .adapt-help-tooltip').forEach(el => {
      el.remove()
    })

    // Reset field order
    const fields = Array.from(form.querySelectorAll('input, textarea, select'))
    fields.sort((a, b) => {
      const aName = this.getFieldName(a as HTMLElement)
      const bName = this.getFieldName(b as HTMLElement)
      const aOrder = this.originalFieldOrder.get(aName) || 0
      const bOrder = this.originalFieldOrder.get(bName) || 0
      return aOrder - bOrder
    })

    // Reorder in DOM
    fields.forEach(field => {
      form.appendChild(field)
    })
  }
}