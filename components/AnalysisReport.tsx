import React, { useState, useEffect } from 'react';
import { type AnalysisResult, type DocumentStatus, type FieldValidation } from '../types';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, LightBulbIcon } from './icons/FeedbackIcons';
import { LogoIcon } from './icons/LogoIcon';

interface AnalysisReportProps {
  result: AnalysisResult | null;
  isLoading: boolean;
}

const statusConfig: Record<DocumentStatus, { text: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  VALID: { text: "Válido para exportación/importación", color: "text-green-800", bgColor: "bg-green-100", icon: <CheckCircleIcon className="h-6 w-6 text-green-600" /> },
  INCOMPLETE: { text: "Incompleto", color: "text-red-800", bgColor: "bg-red-100", icon: <XCircleIcon className="h-6 w-6 text-red-600" /> },
  INCONSISTENT: { text: "Inconsistente", color: "text-amber-800", bgColor: "bg-amber-100", icon: <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" /> },
};

const validationIcons = {
  CORRECT: <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />,
  WARNING: <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />,
  ERROR: <XCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />,
};

const FieldList: React.FC<{fields: FieldValidation[]}> = ({ fields }) => (
    <div className="flow-root">
        <ul role="list" className="divide-y divide-slate-200">
            {fields.map((field, index) => (
                <li key={index} className="py-4">
                    <div className="relative flex items-start space-x-3">
                        <div className="mt-1">{validationIcons[field.validation]}</div>
                        <div className="min-w-0 flex-1">
                            <div>
                                <p className="text-sm font-medium text-slate-900">{field.fieldName}</p>
                                <p className="mt-0.5 text-sm text-slate-500">
                                    Valor: <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">{field.value || 'No encontrado'}{field.unit ? ` ${field.unit}` : ''}</span>
                                </p>
                            </div>
                            <p className="mt-1 text-sm text-slate-600">{field.comment}</p>
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    </div>
);

const loadingSteps = [
    "Iniciando el análisis con la IA...",
    "Extrayendo datos clave del documento...",
    "Realizando validaciones cruzadas y cálculos...",
    "Buscando inconsistencias lógicas...",
    "Compilando el informe final..."
];

const LoadingSpinner: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentStep((prevStep) => (prevStep + 1) % loadingSteps.length);
        }, 2000); // Change step every 2 seconds

        return () => clearInterval(interval); // Cleanup on unmount
    }, []);

    return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl shadow-lg border border-slate-200">
            <LogoIcon className="animate-slow-spin h-12 w-12 text-slate-600" />
            <h3 className="mt-4 text-lg font-semibold text-slate-700">Analizando su documento...</h3>
            <p className="mt-1 text-sm text-slate-500 min-h-[20px] transition-opacity duration-300">
                {loadingSteps[currentStep]}
            </p>
        </div>
    );
};

export const AnalysisReport: React.FC<AnalysisReportProps> = ({ result, isLoading }) => {
  if (isLoading) {
    return <LoadingSpinner />;
  }
  if (!result) {
    return null;
  }
  
  const currentStatus = statusConfig[result.status];
  
  const priorityOrder = [
    'peso bruto unitario',
    'peso bruto total',
    'volumen unitario',
    'volumen total',
    'cantidad de bultos',
    'medida de los bultos',
  ];

  const priorityFields = result.fields
    .filter(field => priorityOrder.includes(field.fieldName.toLowerCase()))
    .sort((a, b) => priorityOrder.indexOf(a.fieldName.toLowerCase()) - priorityOrder.indexOf(b.fieldName.toLowerCase()));
  
  const otherFields = result.fields.filter(field => !priorityOrder.includes(field.fieldName.toLowerCase()));

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 text-left">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Resultado del Análisis</h2>
        
        {/* Overall Status */}
        <div className={`p-4 rounded-lg flex items-center gap-4 ${currentStatus.bgColor}`}>
          {currentStatus.icon}
          <div>
            <p className={`font-bold text-lg ${currentStatus.color}`}>{currentStatus.text}</p>
            <p className={`text-sm ${currentStatus.color.replace('800','700')}`}>{result.summary}</p>
          </div>
        </div>

        {/* Details */}
        <div className="mt-6">
            {priorityFields.length > 0 && (
              <>
                <h3 className="font-semibold text-slate-800 mb-3">Análisis de Carga y Bultos</h3>
                <FieldList fields={priorityFields} />
              </>
            )}

            {otherFields.length > 0 && (
               <>
                <h3 className="font-semibold text-slate-800 mt-6 mb-3">Información General del Documento</h3>
                <FieldList fields={otherFields} />
              </>
            )}
        </div>

        {/* Suggestions */}
        {result.suggestions && result.suggestions.length > 0 && (
            <div className="mt-8">
                <h3 className="font-semibold text-slate-800 mb-3">Sugerencias de Mejora</h3>
                <div className="bg-slate-50 border-l-4 border-slate-500 p-4 rounded-r-lg">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <LightBulbIcon className="h-5 w-5 text-slate-500" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <ul className="list-disc list-inside space-y-1 text-sm text-slate-800">
                                {result.suggestions.map((suggestion, index) => (
                                    <li key={index}>{suggestion}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};