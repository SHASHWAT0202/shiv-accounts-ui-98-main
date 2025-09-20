import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MobileFormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'textarea' | 'select' | 'checkbox';
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>; // For select fields
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    custom?: (value: string) => string | null; // Return error message or null
  };
  fullWidth?: boolean;
  helpText?: string;
}

interface MobileFormProps {
  title?: string;
  fields: MobileFormField[];
  onSubmit: (data: Record<string, string>) => void;
  submitText?: string;
  loading?: boolean;
  layout?: 'stacked' | 'floating';
  spacing?: 'compact' | 'normal' | 'relaxed';
  showProgress?: boolean;
  className?: string;
}

export const MobileForm: React.FC<MobileFormProps> = ({
  title,
  fields,
  onSubmit,
  submitText = "Submit",
  loading = false,
  layout = 'stacked',
  spacing = 'normal',
  showProgress = false,
  className,
}) => {
  const [formData, setFormData] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [currentStep, setCurrentStep] = React.useState(0);

  // Group fields into steps for better mobile UX
  const fieldsPerStep = 3;
  const totalSteps = Math.ceil(fields.length / fieldsPerStep);
  const currentFields = showProgress 
    ? fields.slice(currentStep * fieldsPerStep, (currentStep + 1) * fieldsPerStep)
    : fields;

  const validateField = (field: MobileFormField, value: string): string | null => {
    if (field.required && !value.trim()) {
      return `${field.label} is required`;
    }

    if (field.validation) {
      const { pattern, minLength, maxLength, custom } = field.validation;
      
      if (pattern && !pattern.test(value)) {
        return `${field.label} format is invalid`;
      }
      
      if (minLength && value.length < minLength) {
        return `${field.label} must be at least ${minLength} characters`;
      }
      
      if (maxLength && value.length > maxLength) {
        return `${field.label} must not exceed ${maxLength} characters`;
      }
      
      if (custom) {
        return custom(value);
      }
    }

    return null;
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  const handleFieldBlur = (field: MobileFormField) => {
    setTouched(prev => ({ ...prev, [field.name]: true }));
    
    const value = formData[field.name] || '';
    const error = validateField(field, value);
    
    if (error) {
      setErrors(prev => ({ ...prev, [field.name]: error }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    fields.forEach(field => {
      const value = formData[field.name] || '';
      const error = validateField(field, value);
      if (error) {
        newErrors[field.name] = error;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (showProgress && currentStep < totalSteps - 1) {
      // Validate current step fields
      const stepFields = currentFields;
      const stepErrors: Record<string, string> = {};
      
      stepFields.forEach(field => {
        const value = formData[field.name] || '';
        const error = validateField(field, value);
        if (error) {
          stepErrors[field.name] = error;
        }
      });
      
      if (Object.keys(stepErrors).length === 0) {
        setCurrentStep(prev => prev + 1);
      } else {
        setErrors(stepErrors);
      }
      return;
    }
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const canGoBack = showProgress && currentStep > 0;
  const isLastStep = showProgress && currentStep === totalSteps - 1;

  const spacingClasses = {
    compact: 'space-y-3',
    normal: 'space-y-4',
    relaxed: 'space-y-6',
  };

  const renderField = (field: MobileFormField) => {
    const value = formData[field.name] || '';
    const error = errors[field.name];
    const isTouched = touched[field.name];
    const hasError = error && isTouched;

    const fieldProps = {
      id: field.name,
      name: field.name,
      placeholder: field.placeholder || field.label,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        handleFieldChange(field.name, e.target.value),
      onBlur: () => handleFieldBlur(field),
      className: cn(
        "w-full",
        hasError && "border-red-500 focus:border-red-500",
        // Mobile optimizations
        "text-base", // Prevent zoom on iOS
        "min-h-[44px]", // Touch-friendly height
      ),
    };

    return (
      <div key={field.name} className={cn("space-y-2", field.fullWidth && "col-span-full")}>
        {layout === 'stacked' && (
          <Label 
            htmlFor={field.name} 
            className={cn(
              "text-sm font-medium",
              hasError && "text-red-600"
            )}
          >
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        
        <div className="relative">
          {field.type === 'textarea' ? (
            <Textarea
              {...fieldProps}
              rows={3}
              className={cn(fieldProps.className, "resize-none")}
            />
          ) : field.type === 'select' ? (
            <select
              id={field.name}
              name={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => handleFieldBlur(field)}
              className={cn(
                fieldProps.className,
                "border border-input bg-background rounded-md px-3 py-2"
              )}
            >
              <option value="">{field.placeholder || `Select ${field.label}`}</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : field.type === 'checkbox' ? (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...fieldProps}
                className="rounded border-input"
                checked={value === 'true'}
                onChange={(e) => handleFieldChange(field.name, e.target.checked ? 'true' : 'false')}
              />
              <Label htmlFor={field.name} className="text-sm">
                {field.label}
              </Label>
            </div>
          ) : (
            <Input
              {...fieldProps}
              type={field.type}
              autoComplete={field.type === 'email' ? 'email' : field.type === 'password' ? 'current-password' : 'off'}
              inputMode={field.type === 'number' ? 'numeric' : field.type === 'tel' ? 'tel' : 'text'}
            />
          )}
          
          {layout === 'floating' && field.type !== 'checkbox' && (
            <Label
              htmlFor={field.name}
              className={cn(
                "absolute left-3 transition-all duration-200 pointer-events-none",
                value 
                  ? "top-1 text-xs text-muted-foreground" 
                  : "top-3 text-base text-muted-foreground",
                hasError && "text-red-600"
              )}
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
          )}
        </div>
        
        {hasError && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        
        {field.helpText && !hasError && (
          <p className="text-sm text-muted-foreground">{field.helpText}</p>
        )}
      </div>
    );
  };

  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {showProgress && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>Step {currentStep + 1} of {totalSteps}</span>
                <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                />
              </div>
            </div>
          )}
        </CardHeader>
      )}
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className={cn("grid grid-cols-1 gap-4", spacingClasses[spacing])}>
            {currentFields.map(renderField)}
          </div>
          
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {canGoBack && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="w-full sm:w-auto"
              >
                Back
              </Button>
            )}
            
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto min-w-[120px]"
              size="lg"
            >
              {loading ? 'Loading...' : (isLastStep ? submitText : 'Next')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export type { MobileFormField, MobileFormProps };