import React, { useCallback, useState } from 'react';

// Make pdfjsLib and XLSX available in the global scope for TypeScript
declare const pdfjsLib: any;
declare const XLSX: any;

interface FileUploaderProps {
  packingListText: string;
  setPackingListText: (text: string) => void;
  invoiceText: string;
  setInvoiceText: (text: string) => void;
}

const FileInputArea: React.FC<{
  id: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
  onFileChange: (files: FileList | null) => void;
  placeholder: string;
}> = ({ id, title, value, onChange, onFileChange, placeholder }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        onFileChange(e.dataTransfer.files);
    };


    return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-2">
        {title}
      </label>
      <div 
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative bg-slate-50 border-2 rounded-lg p-4 focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-500 transition-all duration-200 ${isDragging ? 'border-slate-500 border-dashed ring-2 ring-slate-300' : 'border-slate-200'}`}
      >
        <textarea
          id={id}
          rows={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-full p-0 border-0 focus:ring-0 resize-none placeholder-slate-400 bg-transparent"
        />
        <div className="absolute bottom-4 right-4">
          <label htmlFor={`${id}File`} className="cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-1.5 px-4 rounded-md text-sm transition-colors">
            Subir archivo
          </label>
          <input 
            id={`${id}File`}
            type="file" 
            className="hidden" 
            accept=".txt,.csv,.pdf,.xlsx,.xls"
            onChange={(e) => onFileChange(e.target.files)}
          />
        </div>
      </div>
    </div>
  )
};


export const FileUploader: React.FC<FileUploaderProps> = ({ 
  packingListText, 
  setPackingListText,
  invoiceText,
  setInvoiceText
}) => {

  const handleFileChange = useCallback(async (files: FileList | null, setText: (text: string) => void) => {
    const file = files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = async (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        setText(`Error: No se pudo leer el archivo "${file.name}".`);
        return;
      }

      if (file.type === 'application/pdf') {
        try {
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const numPages = pdf.numPages;
          
          let allText = '';
          for (let i = 1; i <= numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map((item: any) => item.str).join(' ');
              allText += pageText + '\n\n';
          }
          setText(allText);
        } catch (error) {
            console.error('Error processing PDF file:', error);
            setText(`Error al procesar el PDF "${file.name}". El archivo podría estar dañado o protegido.`);
        }
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        try {
            const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
            let allText = '';
            workbook.SheetNames.forEach((sheetName: string) => {
                const worksheet = workbook.Sheets[sheetName];
                const sheetText = XLSX.utils.sheet_to_csv(worksheet);
                allText += `--- Hoja: ${sheetName} ---\n${sheetText}\n\n`;
            });
            setText(allText);
        } catch (error) {
            console.error('Error processing Excel file:', error);
            setText(`Error al procesar el archivo Excel "${file.name}". El archivo podría estar dañado.`);
        }
      } else {
        try {
          const decoder = new TextDecoder('utf-8');
          const fileText = decoder.decode(arrayBuffer);
          setText(fileText);
        } catch (error) {
          console.error('Error processing text file:', error);
          setText(`Error al leer el archivo de texto "${file.name}".`);
        }
      }
    };
    
    reader.onerror = () => {
        console.error('FileReader error');
        setText(`Error: Ocurrió un problema al leer el archivo "${file.name}".`);
    };

    reader.readAsArrayBuffer(file);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <FileInputArea
        id="packingList"
        title="1. Packing List (Obligatorio)"
        value={packingListText}
        onChange={setPackingListText}
        onFileChange={(files) => handleFileChange(files, setPackingListText)}
        placeholder="Arrastrá y soltá un archivo o pegá aquí el texto..."
      />
      <FileInputArea
        id="invoice"
        title="2. Factura Comercial (Opcional)"
        value={invoiceText}
        onChange={setInvoiceText}
        onFileChange={(files) => handleFileChange(files, setInvoiceText)}
        placeholder="Arrastrá y soltá un archivo o pegá el texto para validación cruzada..."
      />
    </div>
  );
};
