import { GoogleGenAI, Type } from "@google/genai";
import { type AnalysisResult } from '../types';

const API_KEY = "AIzaSyDPPyes3JWO2TR1bA3lgerKncmcsoXvpxM";

const ai = new GoogleGenAI({ apiKey: API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        status: {
            type: Type.STRING,
            enum: ['VALID', 'INCOMPLETE', 'INCONSISTENT'],
            description: 'El estado general del documento.'
        },
        summary: {
            type: Type.STRING,
            description: 'Un resumen conciso del resultado del análisis.'
        },
        fields: {
            type: Type.ARRAY,
            description: 'Una lista de los campos analizados del Packing List.',
            items: {
                type: Type.OBJECT,
                properties: {
                    fieldName: {
                        type: Type.STRING,
                        description: 'El nombre del campo, ej. "Exportador".'
                    },
                    value: {
                        type: Type.STRING,
                        description: 'El valor numérico o textual extraído del documento. Esfuérzate por encontrar un valor; solo debe ser nulo si es absolutamente imposible.'
                    },
                    unit: {
                        type: Type.STRING,
                        description: 'La unidad de medida para el valor, si aplica (ej. "kg", "m³"). Nulo si no aplica.'
                    },
                    validation: {
                        type: Type.STRING,
                        enum: ['CORRECT', 'WARNING', 'ERROR'],
                        description: 'El resultado de la validación para este campo.'
                    },
                    comment: {
                        type: Type.STRING,
                        description: 'Una explicación detallada de la validación. Si es un error de cálculo, debe mostrar el valor esperado vs. el encontrado.'
                    },
                },
                required: ['fieldName', 'validation', 'comment']
            }
        },
        suggestions: {
            type: Type.ARRAY,
            description: 'Una lista de sugerencias para corregir los problemas encontrados.',
            items: {
                type: Type.STRING
            }
        }
    },
    required: ['status', 'summary', 'fields', 'suggestions']
};

const buildPrompt = (packingListText: string, invoiceText?: string): string => {
    let prompt = `
    **ROLE & TASK:**
    Eres un Auditor de Cumplimiento Aduanero de élite, extremadamente meticuloso. Tu misión es realizar un análisis forense del siguiente Packing List. El texto ha sido extraído digitalmente (PDF, Excel), así que ignora problemas de formato y enfócate en el contenido. Tu análisis debe ser riguroso, como si un envío de alto valor dependiera de ello.

    **Packing List Text:**
    \`\`\`
    ${packingListText}
    \`\`\`
    `;

    if (invoiceText && invoiceText.trim()) {
        prompt += `
        **Commercial Invoice Text (for cross-reference):**
        \`\`\`
        ${invoiceText}
        \`\`\`
        `;
    }

    prompt += `
    **ANALYSIS INSTRUCTIONS:**

    **PRIORITY FOCUS (CRITICAL):** Tu máxima prioridad es la extracción y validación de los siguientes 6 campos. Dedica la mayor parte de tu esfuerzo a estos. Si no están explícitamente presentes, debes intentar inferirlos o calcularlos como se indica en las instrucciones de cálculo.
        -   **Peso bruto unitario**: ¿Está presente y es un número válido?
        -   **Peso bruto total**: ¿Está presente y es un número válido?
        -   **Volumen unitario**: ¿Está presente y es un número válido? (ej. en m³)
        -   **Volumen total**: ¿Está presente y es un número válido?
        -   **Cantidad de bultos**: ¿Es un número entero y positivo?
        -   **Medida de los bultos**: ¿Están las dimensiones (largo x ancho x alto)?

    **GENERAL INSTRUCTIONS:**
    1.  **Data Extraction Persistence (CRITICAL):** Tu objetivo principal es encontrar un valor para cada campo. Busca de forma agresiva en todo el texto, incluso si el formato es inusual. Por ejemplo, si ves "Peso: 150KG", debes extraer "150" como 'value' y "KG" como 'unit'. Solo devuelve un valor nulo como último recurso absoluto si la información está definitivamente ausente. Si devuelves nulo, tu comentario debe justificar por qué fue imposible encontrarlo. NO te rindas fácilmente.

    2.  **Proactive Calculation & Inference (CRITICAL):**
        -   Aplica esta regla especialmente a los campos prioritarios. Si un valor total (como 'Peso bruto total' o 'Volumen total') está ausente en el documento, pero tienes los componentes para calcularlo ('valor unitario' y 'Cantidad de bultos'), DEBES calcularlo.
        -   Completa el campo 'value' del total con tu resultado calculado.
        -   Establece la 'validation' para este campo calculado como 'WARNING'.
        -   En el 'comment', DEBES indicar claramente que el valor fue calculado por ti. Ejemplo: "WARNING: El valor no se encontró explícitamente y fue calculado a partir de los datos unitarios. Se recomienda verificar."

    3.  **Extract & Validate All Fields:** Después de asegurar los campos prioritarios, extrae y valida rigurosamente todos los campos, incluyendo:
        -   **Peso neto unitario**: ¿Está presente y es un número válido?
        -   **Peso neto total**: ¿Está presente y es un número válido?
        -   **Exportador / Importador**: ¿Están presentes los nombres y direcciones completos?
        -   **Número y fecha del documento**: ¿Son válidos y están presentes?
        -   **Número de factura comercial asociada**: ¿Se menciona?
        -   **Descripción de la mercadería**: ¿Es específica o genérica (ej. "repuestos")?
        -   **Marcas y números de bulto**: ¿Se especifican?
        -   **Número de contenedor / precinto**: ¿Aplica y está presente?
        -   **Incoterms**: ¿Se especifica el Incoterm (ej. FOB, CIF)? Esto es CRÍTICO.
        -   **Código HS (Sistema Armonizado)**: ¿Se menciona para la mercancía? Esto es CRÍTICO.

    4.  **Perform Logical & Mathematical Cross-Checks (CRITICAL):**
        -   **Weight Calculation:** Una vez que tengas todos los valores (extraídos o calculados), verifica. Si 'Peso bruto unitario' y 'Cantidad de bultos' están presentes, calcula el 'Peso bruto total' esperado. Compara con el valor declarado/calculado. Si no coinciden, marca 'Peso bruto total' como 'ERROR' y en el comentario especifica: "ERROR: El valor declarado (X) no coincide con el total calculado (Y)".
        -   **Volume Calculation:** Realiza la misma verificación para el volumen. Si 'Volumen unitario' y 'Cantidad de bultos' están presentes, calcula el 'Volumen total' esperado. Compara con el valor declarado/calculado. Si no coinciden, marca 'Volumen total' como 'ERROR' y en el comentario especifica: "ERROR: El valor declarado (X) no coincide con el total calculado (Y)".
        -   **Weight Consistency:** Verifica que 'Peso bruto total' sea MAYOR O IGUAL que 'Peso neto total'. Si no, marca ambos como 'ERROR' y explica la inconsistencia en sus comentarios.
        -   **Description Specificity:** Si la 'Descripción de la mercadería' es genérica (ej. "mercancía", "repuestos", "muestras"), márcala como 'WARNING' y comenta que se requiere mayor especificidad para la aduana.

    5.  **Final Assessment & Formatting:**
        -   **Data Formatting:** Para cualquier campo con un valor numérico y una unidad (como peso o volumen), coloca ÚNICAMENTE el número en el campo 'value' y la unidad (ej. 'kg', 'm³') en el campo 'unit'. El campo 'value' debe ser puramente numérico.
        -   Proporciona un 'comment' claro y conciso para CADA campo, explicando el porqué de la validación ('CORRECT', 'WARNING', 'ERROR').
        -   Determina el 'status' general: 'VALID' (todo 'CORRECT'), 'INCOMPLETE' (faltan campos críticos como Incoterms, Pesos, etc.), o 'INCONSISTENT' (fallan las validaciones lógicas o matemáticas).
        -   Proporciona 'suggestions' accionables para cada 'ERROR' o 'WARNING' identificado.

    Realiza el análisis y devuelve el resultado ÚNICAMENTE en formato JSON, adhiriéndote estrictamente al esquema proporcionado.
    `;
    return prompt.trim();
};

export const analyzePackingList = async (packingListText: string, invoiceText?: string): Promise<AnalysisResult> => {
    try {
        const prompt = buildPrompt(packingListText, invoiceText);

        const response = await ai.models.generateContent({
            // Se utiliza el modelo 'gemini-flash-latest' para optimizar la velocidad de respuesta.
            model: 'gemini-flash-latest',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonString = response.text.trim();
        const result: AnalysisResult = JSON.parse(jsonString);

        return result;

    } catch (error) {
        console.error("Error analyzing document with Gemini:", error);
        throw new Error("Failed to analyze packing list. The AI service may be temporarily unavailable or the response was invalid.");
    }
};