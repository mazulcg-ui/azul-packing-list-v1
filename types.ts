
export type ValidationStatus = 'CORRECT' | 'WARNING' | 'ERROR';
export type DocumentStatus = 'VALID' | 'INCOMPLETE' | 'INCONSISTENT';

export interface FieldValidation {
  fieldName: string;
  value: string | null;
  unit?: string;
  validation: ValidationStatus;
  comment: string;
}

export interface AnalysisResult {
  status: DocumentStatus;
  summary: string;
  fields: FieldValidation[];
  suggestions: string[];
}