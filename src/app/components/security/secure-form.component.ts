import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-secure-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form 
      [formGroup]="form" 
      (ngSubmit)="onSubmit()" 
      novalidate 
      autocomplete="off"
      class="secure-form">
      <ng-content></ng-content>
    </form>
  `,
  styles: [`
    .secure-form {
      position: relative;
    }
    
    .secure-form input[type="password"] {
      font-family: 'Courier New', monospace;
    }
    
    .secure-form input {
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 8px 12px;
      width: 100%;
      box-sizing: border-box;
    }
    
    .secure-form input:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }
    
    .secure-form button {
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 10px 20px;
      cursor: pointer;
      font-size: 16px;
    }
    
    .secure-form button:hover:not(:disabled) {
      background: #0056b3;
    }
    
    .secure-form button:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }
  `]
})
export class SecureFormComponent {
  @Input() form!: FormGroup;
  @Input() submitDisabled = false;
  @Output() formSubmit = new EventEmitter<any>();

  onSubmit(): void {
    if (this.form.valid && !this.submitDisabled) {
      const formValue = this.sanitizeFormData(this.form.value);
      this.formSubmit.emit(formValue);
    }
  }

  private sanitizeFormData(data: any): any {
    const sanitized: any = {};
    
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const value = data[key];
        
        if (typeof value === 'string') {
          // Basic XSS prevention - remove dangerous characters
          sanitized[key] = value
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();
        } else {
          sanitized[key] = value;
        }
      }
    }
    
    return sanitized;
  }
}