import React, { useState, useCallback } from 'react';
import { FileUploader } from './components/FileUploader';
import { AnalysisReport } from './components/AnalysisReport';
import { analyzePackingList } from './services/geminiService';
import { type AnalysisResult } from './types';
import { LogoIcon } from './components/icons/LogoIcon';
import { UserIcon } from './components/icons/UserIcon';

const App: React.FC = () => {
  const [packingListText, setPackingListText] = useState<string>('');
  const [invoiceText, setInvoiceText] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState<boolean>(false);

  const handleAnalyze = useCallback(async () => {
    if (!packingListText.trim()) {
      setError('Por favor, proporciona el texto del Packing List para analizar.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setShowReport(true); // Start showing the container for loading animation

    try {
      const result = await analyzePackingList(packingListText, invoiceText);
      setAnalysisResult(result);
    } catch (e) {
      console.error(e);
      let errorMessage = 'Ocurrió un error al analizar el documento. Por favor, inténtalo de nuevo.';
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      setError(errorMessage);
      setShowReport(false); // Hide report on error
    } finally {
      setIsLoading(false);
    }
  }, [packingListText, invoiceText]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans text-slate-800">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <LogoIcon className="h-9 w-9 text-slate-800" />
              <div>
                <h1 className="text-lg font-bold text-slate-900">360 Comex</h1>
                <p className="text-xs text-slate-500 font-medium">Packing Analyzer</p>
              </div>
            </div>
            <button className="p-2 rounded-full hover:bg-slate-200 transition-colors">
              <UserIcon className="h-6 w-6 text-slate-600" />
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="max-w-4xl mx-auto text-center">
           <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Analizador de Packing List</h2>
           <p className="mt-3 text-base md:text-lg text-slate-600">Cargá tu documento (PDF, Excel o texto) y verificá su validez al instante.</p>
        </div>

        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-slate-200">
            <FileUploader 
              packingListText={packingListText}
              setPackingListText={setPackingListText}
              invoiceText={invoiceText}
              setInvoiceText={setInvoiceText}
            />
            <div className="mt-8 text-center">
              <button 
                onClick={handleAnalyze}
                disabled={isLoading || !packingListText}
                className="bg-slate-800 text-white font-bold py-3 px-12 rounded-lg shadow-md hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed transform hover:-translate-y-0.5 disabled:transform-none"
              >
                {isLoading ? 'Analizando...' : 'Analizar Documento'}
              </button>
            </div>
          </div>
          
          {error && <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg max-w-4xl mx-auto animate-fade-in-up" role="alert">{error}</div>}

          <div className="mt-8">
            { showReport ? (
              <div className="animate-fade-in-up">
                <AnalysisReport 
                  result={analysisResult} 
                  isLoading={isLoading} 
                />
              </div>
            ) : (
              <div className="text-center py-10 px-6 bg-white rounded-2xl border-2 border-dashed border-slate-300">
                <p className="text-slate-500">Tu informe aparecerá aquí.</p>
              </div>
            )}
          </div>
        </div>
      </main>
       <footer className="text-center py-6 text-sm text-slate-500">
        <p>© {new Date().getFullYear()} 360 Comex | Desarrollo y validación documental inteligente.</p>
      </footer>
    </div>
  );
};

export default App;