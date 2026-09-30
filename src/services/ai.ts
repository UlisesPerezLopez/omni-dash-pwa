/**
 * Centralized AI Service Gateway & LLM Infrastructure
 * Provides configuration interfaces for future external endpoints (Ollama, FreeLLMAPI, OpenAI)
 * and standard inference abstractions.
 */

export interface AIServiceConfig {
  provider: "simulated" | "ollama" | "freellmapi" | "custom";
  endpoint?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

let activeConfig: AIServiceConfig = {
  provider: "simulated",
  model: "llama-3-8b-instruct",
  endpoint: "http://localhost:11434/api/generate",
};

export function getAIConfig(): AIServiceConfig {
  return { ...activeConfig };
}

export function updateAIConfig(newConfig: Partial<AIServiceConfig>): void {
  activeConfig = { ...activeConfig, ...newConfig };
}

type AIIntent = "summary" | "translate" | "tasks" | "reply" | "general";

function parsePromptIntent(prompt: string): AIIntent {
  const p = prompt.toLowerCase();
  if (/(resume|resumen|summary|summarize|zusammenfassung|résumé|sintesi|tldr)/i.test(p)) {
    return "summary";
  }
  if (/(translate|traducir|traducción|traduccion|übersetz|tradui|traduci)/i.test(p)) {
    return "translate";
  }
  if (/(task|tarea|action|acciones|aufgabe|pendientes|checklist)/i.test(p)) {
    return "tasks";
  }
  if (/(reply|draft|responder|respuesta|redactar|antworte|écrire)/i.test(p)) {
    return "reply";
  }
  return "general";
}

/**
 * Centralized AI Gateway function.
 * Evaluates context and userPrompt to produce intelligent, simulated responses
 * with network latency simulation, structured for seamless future API handoff.
 */
export const generateAIResponse = async (
  context: any,
  userPrompt: string
): Promise<string> => {
  // Simulate network latency (e.g. 750ms)
  await new Promise((resolve) => setTimeout(resolve, 750));

  const intent = parsePromptIntent(userPrompt);

  switch (intent) {
    case "summary": {
      const summaryText =
        context?.aiAnalysis?.summary ||
        (context?.body
          ? context.body.slice(0, 220) + (context.body.length > 220 ? "..." : "")
          : typeof context === "string"
          ? context
          : "Información operativa disponible en el contexto.");

      return `📋 Resumen Ejecutivo:\n\n${summaryText}\n\n• Asunto: ${context?.subject || "Documento / Correo"}\n• Remitente: ${context?.sender || "Sistema Corporativo"}\n• Estado: Analizado por Copilot (Gateway Local)`;
    }

    case "translate": {
      const p = userPrompt.toLowerCase();
      const isGerman = /german|alemán|aleman|deutsch/i.test(p);
      const isEnglish = /english|inglés|ingles|englisch/i.test(p);

      if (isGerman) {
        return `🇩🇪 Deutsche Übersetzung (Simuliert):\n\nBetreff: Re: ${context?.subject || "Kommunikation"}\n\nWir haben Ihre Nachricht erhalten und die entsprechenden Prozessschritte im lokalen System verifiziert. Alle Maßnahmen werden gemäß den betrieblichen Qualitätsrichtlinien durchgeführt.`;
      }

      if (isEnglish) {
        return `🇬🇧 English Translation (Simulated):\n\nSubject: Re: ${context?.subject || "Communication"}\n\nWe have received your message and cross-checked the specifications in the local system. All workflow stages are being processed in compliance with operational guidelines.`;
      }

      return `🌐 Traducción al Español (Simulada):\n\nAsunto: Re: ${context?.subject || "Comunicación"}\n\nHemos recibido y procesado el contenido en el sistema. Todos los puntos operativos han sido registrados satisfactoriamente según las directrices establecidas.`;
    }

    case "tasks": {
      const tasks = context?.aiAnalysis?.extractedTasks;
      if (Array.isArray(tasks) && tasks.length > 0) {
        return `🎯 Tareas extraídas del contexto:\n\n` + tasks.map((t: string, i: number) => `${i + 1}. [ ] ${t}`).join("\n");
      }
      return `🎯 Tareas y acciones recomendadas:\n\n1. [ ] Verificar parámetros operativos con el departamento responsable.\n2. [ ] Validar fecha límite en el registro de tareas.\n3. [ ] Confirmar acuse de recibo y cerrar ticket.`;
    }

    case "reply": {
      const sender = context?.sender?.split("<")[0]?.trim() || "Colega";
      const subject = context?.subject || "Comunicación recibida";
      return `✍️ Propuesta de Respuesta:\n\nEstimado/a ${sender},\n\nGracias por su mensaje en relación a "${subject}". Hemos tomado nota de las observaciones y estamos coordinando los siguientes pasos de acuerdo con los protocolos establecidos.\n\nQuedamos a su disposición para cualquier consulta adicional.\n\nSaludos cordiales,\nUlises Pérez`;
    }

    case "general":
    default: {
      return `Entendido. He analizado la solicitud "${userPrompt}" sobre "${context?.subject || "este elemento"}". Estoy listo para asistirte en redactar respuestas, extraer tareas o sintetizar la información.`;
    }
  }
};

/**
 * Global Enterprise AI Copilot Gateway.
 * Queries the entire enterprise workspace database and telemetry across
 * revenue, orders, expenses, logistics, quality compliance, and personnel.
 */
export const generateGlobalAIResponse = async (userPrompt: string): Promise<string> => {
  // Simulate network / database query latency
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const p = userPrompt.toLowerCase();

  // 1. Revenue / Ingresos / Ventas (Summarize the $136k revenue from the dashboard)
  if (/(revenue|ingresos|ventas|sales|turnover|umsatz)/i.test(p)) {
    return (
      `📊 Resumen Global de Ingresos & Finanzas (OmniDash CoreERP):\n\n` +
      `• Ingresos Totales: $136.2k (+12.4% vs. período anterior)\n` +
      `• Volumen de Pedidos: 1,250 transacciones consolidadas\n` +
      `• Margen Comercial Medio: 28.5%\n` +
      `• Tasa de Conversión de Cotizaciones: 64.2%\n` +
      `• Flujo de Caja Proyectado: $84.6k en positivo\n\n` +
      `La trayectoria financiera refleja un crecimiento sostenido con cuentas comerciales al día y un ratio de cobro óptimo.`
    );
  }

  // 2. Gastos / Expenses / Compras
  if (/(expense|gastos|costes|costos|purchas|compras|ausgaben)/i.test(p)) {
    return (
      `💸 Análisis de Gastos y Adquisiciones:\n\n` +
      `• Gasto Total Registrado: $42.8k\n` +
      `• Desembolsos Aprobados a Proveedores: $31.4k en 8 contratos vigentes\n` +
      `• Facturas en Cola de Aprobación: 3 facturas ($4,850 total)\n` +
      `• Desviación de Presupuesto: -2.1% (favorable respecto al plan anual)`
    );
  }

  // 3. Inventario / Logística / Operaciones / Envíos
  if (/(inventory|inventario|ops|operaciones|stock|shipment|envios|logistica|harbor)/i.test(p)) {
    return (
      `📦 Estado de Operaciones y Logística:\n\n` +
      `• Backlog de Envíos: 18 pedidos en preparación\n` +
      `• Tasa de Cumplimiento (Fulfillment): 94.8%\n` +
      `• Alerta en Puerto Harbor: Lote de micro-conectores en cuarentena preventiva por discrepancia dimensional (defectos al 4.2%)\n` +
      `• Stock en Almacén Central: 88% de capacidad de servicio inmediata`
    );
  }

  // 4. Calidad / SLAs / Incidencias
  if (/(quality|calidad|sla|escalat|incidencia|ticket|inspeccion)/i.test(p)) {
    return (
      `🛡️ Métricas de Calidad y Acuerdos de Servicio (SLA):\n\n` +
      `• Cumplimiento de SLA Global: 98.2%\n` +
      `• Tickets Críticos Activos: 1 (cuarentena de micro-conectores)\n` +
      `• Tiempo Promedio de Resolución: 18 minutos\n` +
      `• Puertas de Calidad Aprobadas: 42 de 43 checkpoints en el último ciclo`
    );
  }

  // 5. Recursos Humanos / Plantilla / Empleados
  if (/(hr|rrhh|personal|empleados|headcount|equipo|retention)/i.test(p)) {
    return (
      `👥 Talento y Recursos Humanos:\n\n` +
      `• Plantilla Activa: 48 especialistas\n` +
      `• Retención Interanual: 96.0%\n` +
      `• Evaluaciones de Desempeño Pendientes: 4 programadas para este trimestre\n` +
      `• Antigüedad Promedio: 3.4 años`
    );
  }

  // 6. Resumen General del Sistema / Dashboard Overview
  if (/(resumen|summary|status|estado|panorama|overview|dashboard|sistema)/i.test(p)) {
    return (
      `🌐 Panorama Ejecutivo Integral de OmniDash:\n\n` +
      `• Finanzas: $136k en ingresos con margen positivo del 28.5%\n` +
      `• Operaciones: 94.8% en entregas a tiempo y 18 pedidos en preparación\n` +
      `• Calidad: 98.2% cumplimiento de SLA\n` +
      `• Almacenamiento Local: Base de datos IndexedDB activa con 1,250+ registros locales, sin dependencia de nube.`
    );
  }

  // Fallback general
  return (
    `Entendido. He procesado la consulta sobre "${userPrompt}" en el repositorio de la empresa. ` +
    `Todos los módulos de telemetría operan con normalidad en Dexie IndexedDB. ` +
    `Puedes consultarme por ingresos ($136k), gastos de compras, estado del inventario o cumplimiento de SLAs.`
  );
};
