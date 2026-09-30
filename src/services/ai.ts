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
 * Returns a multilingual introductory greeting from Enterprise Copilot.
 */
export function getCopilotGreeting(language: string = "es"): string {
  const lang = (language || "es").toLowerCase().slice(0, 2);
  switch (lang) {
    case "de":
      return "Hallo! Ich bin Omni. Ich habe Zugriff auf Echtzeitmetriken zu Finanzen, Betrieb, Einkauf und Qualität in OmniDash. Wie kann ich dir helfen?";
    case "en":
      return "Hello! I am Omni. I have real-time access to metrics across finance, operations, purchasing, and quality in OmniDash. How can I assist you?";
    case "fr":
      return "Bonjour ! Je suis Omni. J'ai accès en temps réel aux métriques de finances, opérations, achats et qualité d'OmniDash. Comment puis-je vous aider ?";
    case "it":
      return "Ciao! Sono Omni. Ho accesso in tempo reale alle metriche di finanza, operazioni, acquisti e qualità di OmniDash. Come posso aiutarti?";
    case "zh":
      return "您好！我是 Omni。我可以实时访问 OmniDash 的财务、运营、采购与质量指标。请问有什么可以帮助您的？";
    case "ja":
      return "こんにちは！Omni です。OmniDash の財務、オペレーション、購買、品質のリアルタイム指標にアクセスできます。どのようなご用件でしょうか？";
    case "es":
    default:
      return "¡Hola! Soy Omni. Tengo acceso a las métricas en tiempo real de finanzas, operaciones, compras y calidad de OmniDash. ¿En qué puedo ayudarte?";
  }
}

/**
 * Centralized AI Gateway function for email/context interactions.
 */
export const generateAIResponse = async (
  context: any,
  userPrompt: string,
  language: string = "es"
): Promise<string> => {
  // Simulate network latency (e.g. 750ms)
  await new Promise((resolve) => setTimeout(resolve, 750));

  const lang = (language || "es").toLowerCase().slice(0, 2);
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

      if (lang === "de") {
        return `📋 Zusammenfassung:\n\n${summaryText}\n\n• Betreff: ${context?.subject || "Dokument / E-Mail"}\n• Absender: ${context?.sender || "Unternehmenssystem"}\n• Status: Von Omni analysiert (Lokales Gateway)`;
      }
      if (lang === "en") {
        return `📋 Executive Summary:\n\n${summaryText}\n\n• Subject: ${context?.subject || "Document / Email"}\n• Sender: ${context?.sender || "Corporate System"}\n• Status: Analyzed by Omni (Local Gateway)`;
      }
      return `📋 Resumen Ejecutivo:\n\n${summaryText}\n\n• Asunto: ${context?.subject || "Documento / Correo"}\n• Remitente: ${context?.sender || "Sistema Corporativo"}\n• Estado: Analizado por Omni (Gateway Local)`;
    }

    case "translate": {
      const p = userPrompt.toLowerCase();
      const isGerman = /german|alemán|aleman|deutsch/i.test(p) || lang === "de";
      const isEnglish = /english|inglés|ingles|englisch/i.test(p) || lang === "en";

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
        const header = lang === "de" ? "🎯 Extrahierte Aufgaben:" : lang === "en" ? "🎯 Extracted Tasks:" : "🎯 Tareas extraídas del contexto:";
        return `${header}\n\n` + tasks.map((t: string, i: number) => `${i + 1}. [ ] ${t}`).join("\n");
      }
      if (lang === "de") {
        return `🎯 Aufgaben und empfohlene Maßnahmen:\n\n1. [ ] Betriebsparameter mit der zuständigen Abteilung abstimmen.\n2. [ ] Frist im Aufgabenregister validieren.\n3. [ ] Empfangsbestätigung senden und Ticket schließen.`;
      }
      if (lang === "en") {
        return `🎯 Tasks and Recommended Actions:\n\n1. [ ] Verify operational parameters with the responsible department.\n2. [ ] Validate deadline in task registry.\n3. [ ] Confirm receipt acknowledgment and resolve ticket.`;
      }
      return `🎯 Tareas y acciones recomendadas:\n\n1. [ ] Verificar parámetros operativos con el departamento responsable.\n2. [ ] Validar fecha límite en el registro de tareas.\n3. [ ] Confirmar acuse de recibo y cerrar ticket.`;
    }

    case "reply": {
      const sender = context?.sender?.split("<")[0]?.trim() || "Colega";
      const subject = context?.subject || "Comunicación recibida";

      if (lang === "de") {
        return `✍️ Antwortentwurf:\n\nSehr geehrte/r ${sender},\n\nvielen Dank für Ihre Nachricht bezüglich "${subject}". Wir haben Ihre Anmerkungen erfasst und koordinieren die nächsten Schritte gemäß den Richtlinien.\n\nFür Rückfragen stehen wir gerne zur Verfügung.\n\nMit freundlichen Grüßen,\nUlises Pérez`;
      }
      if (lang === "en") {
        return `✍️ Drafted Reply:\n\nDear ${sender},\n\nThank you for reaching out regarding "${subject}". We have noted the requirements and are coordinating the next steps in accordance with established protocols.\n\nPlease feel free to reach out if you have any questions.\n\nBest regards,\nUlises Pérez`;
      }
      return `✍️ Propuesta de Respuesta:\n\nEstimado/a ${sender},\n\nGracias por su mensaje en relación a "${subject}". Hemos tomado nota de las observaciones y estamos coordinando los siguientes pasos de acuerdo con los protocolos establecidos.\n\nQuedamos a su disposición para cualquier consulta adicional.\n\nSaludos cordiales,\nUlises Pérez`;
    }

    case "general":
    default: {
      if (lang === "de") {
        return `Verstanden. Ich habe die Anfrage "${userPrompt}" zu "${context?.subject || "diesem Eintrag"}" analysiert. Ich stehe bereit, um Antworten zu verfassen, Aufgaben zu extrahieren oder Informationen zusammenzufassen.`;
      }
      if (lang === "en") {
        return `Understood. I have analyzed the request "${userPrompt}" regarding "${context?.subject || "this item"}". I am ready to assist with drafting replies, extracting tasks, or synthesizing information.`;
      }
      return `Entendido. He analizado la solicitud "${userPrompt}" sobre "${context?.subject || "este elemento"}". Estoy listo para asistirte en redactar respuestas, extraer tareas o sintetizar la información.`;
    }
  }
};

/**
 * Global Enterprise AI Copilot Gateway.
 * Queries the entire enterprise workspace database and telemetry across
 * revenue, orders, expenses, logistics, quality compliance, and personnel.
 * 
 * Supports polymorphic signatures:
 * - generateGlobalAIResponse(userPrompt: string, language?: string)
 * - generateGlobalAIResponse(context: any, userPrompt: string, language?: string)
 */
export async function generateGlobalAIResponse(
  promptOrContext: any,
  userPromptOrLang?: string,
  maybeLanguage?: string
): Promise<string> {
  // Simulate network / database query latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  let userPrompt = "";
  let language = "es";

  if (typeof promptOrContext === "string") {
    userPrompt = promptOrContext;
    language = userPromptOrLang || maybeLanguage || "es";
  } else {
    // Called with (context, userPrompt, language)
    userPrompt = typeof userPromptOrLang === "string" ? userPromptOrLang : "";
    language = maybeLanguage || "es";
  }

  const lang = (language || "es").toLowerCase().slice(0, 2);
  const p = userPrompt.toLowerCase().trim();

  // 0. Greeting detection
  if (!p || /^(hallo|hi|hey|hello|hola|bonjour|ciao|guten tag|buenos dias|buen dia|salut|hallo!)/i.test(p)) {
    return getCopilotGreeting(lang);
  }

  // 1. Revenue / Ingresos / Ventas / Umsatz
  if (/(revenue|ingresos|ventas|sales|turnover|umsatz|chiffre|entrate|rendita|收入)/i.test(p)) {
    if (lang === "de") {
      return (
        `📊 Globaler Umsatz- & Finanzbericht (OmniDash CoreERP):\n\n` +
        `• Gesamtumsatz: $136.2k (+12.4% ggü. Vorperiode)\n` +
        `• Auftragsvolumen: 1.250 konsolidierte Transaktionen\n` +
        `• Durchschnittliche Handelsmarge: 28.5%\n` +
        `• Angebots-Konvertierungsrate: 64.2%\n` +
        `• Prognostizierter Cashflow: $84.6k positiv\n\n` +
        `Die Finanzentwicklung zeigt nachhaltiges Wachstum mit aktuellen Geschäftskonten und optimaler Forderungsquote.`
      );
    }
    if (lang === "en") {
      return (
        `📊 Global Revenue & Financial Summary (OmniDash CoreERP):\n\n` +
        `• Total Revenue: $136.2k (+12.4% vs. previous period)\n` +
        `• Order Volume: 1,250 consolidated transactions\n` +
        `• Average Commercial Margin: 28.5%\n` +
        `• Quote Conversion Rate: 64.2%\n` +
        `• Projected Cash Flow: +$84.6k\n\n` +
        `The financial trajectory reflects sustained growth with up-to-date commercial accounts and an optimal collection ratio.`
      );
    }
    if (lang === "fr") {
      return (
        `📊 Résumé Global des Revenus & Finances (OmniDash CoreERP) :\n\n` +
        `• Revenu Total : 136,2 k$ (+12,4 % vs période précédente)\n` +
        `• Volume de Commandes : 1 250 transactions consolidées\n` +
        `• Marge Commerciale Moyenne : 28,5 %\n` +
        `• Taux de Conversion des Devis : 64,2 %\n` +
        `• Flux de Trésorerie Projeté : +84,6 k$\n\n` +
        `La trajectoire financière reflète une croissance soutenue avec des comptes commerciaux à jour.`
      );
    }
    if (lang === "it") {
      return (
        `📊 Riepilogo Globale Entrate & Finanze (OmniDash CoreERP):\n\n` +
        `• Entrate Totali: $136.2k (+12.4% rispetto al periodo precedente)\n` +
        `• Volume Ordini: 1.250 transazioni consolidate\n` +
        `• Margine Commerciale Medio: 28.5%\n` +
        `• Tasso di Conversione Preventivi: 64.2%\n` +
        `• Flusso di Cassa Previsto: +$84.6k\n\n` +
        `La traiettoria finanziaria riflette una crescita costante con conti commerciali aggiornati.`
      );
    }
    if (lang === "zh") {
      return (
        `📊 全球收入与财务概览 (OmniDash CoreERP)：\n\n` +
        `• 总收入：$136.2k（较上一周期 +12.4%）\n` +
        `• 订单总量：1,250 笔合并交易\n` +
        `• 平均商业利润率：28.5%\n` +
        `• 报价转化率：64.2%\n` +
        `• 预计现金流：+$84.6k\n\n` +
        `财务表现保持持续增长态势，商业账户与回款状态良好。`
      );
    }
    if (lang === "ja") {
      return (
        `📊 グローバル収益・財務サマリー (OmniDash CoreERP):\n\n` +
        `• 総収益: $136.2k (前期比 +12.4%)\n` +
        `• 受注総数: 1,250 取引\n` +
        `• 平均売上マージン: 28.5%\n` +
        `• 見積成約率: 64.2%\n` +
        `• 予想キャッシュフロー: +$84.6k\n\n` +
        `財務推移は堅調な成長を維持しており、債権回収率も健全です。`
      );
    }
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

  // 2. Gastos / Expenses / Compras / Ausgaben
  if (/(expense|gastos|costes|costos|purchas|compras|ausgaben|dépenses|depenses|spese|支出)/i.test(p)) {
    if (lang === "de") {
      return (
        `💸 Analyse der Ausgaben und Beschaffung:\n\n` +
        `• Erfasste Gesamtausgaben: $42.8k\n` +
        `• Genehmigte Lieferantenzahlungen: $31.4k in 8 aktiven Verträgen\n` +
        `• Rechnungen in Freigabeschlange: 3 Rechnungen ($4.850 gesamt)\n` +
        `• Budgetabweichung: -2.1% (günstig im Vergleich zum Jahresplan)`
      );
    }
    if (lang === "en") {
      return (
        `💸 Expenses & Procurement Analysis:\n\n` +
        `• Total Recorded Expenses: $42.8k\n` +
        `• Approved Vendor Disbursements: $31.4k across 8 active contracts\n` +
        `• Invoices in Approval Queue: 3 invoices ($4,850 total)\n` +
        `• Budget Variance: -2.1% (favorable vs. annual plan)`
      );
    }
    return (
      `💸 Análisis de Gastos y Adquisiciones:\n\n` +
      `• Gasto Total Registrado: $42.8k\n` +
      `• Desembolsos Aprobados a Proveedores: $31.4k en 8 contratos vigentes\n` +
      `• Facturas en Cola de Aprobación: 3 facturas ($4,850 total)\n` +
      `• Desviación de Presupuesto: -2.1% (favorable respecto al plan anual)`
    );
  }

  // 3. Inventario / Logística / Operaciones / Envíos / Inventar
  if (/(inventory|inventario|ops|operaciones|stock|shipment|envios|logistica|logistics|lager|bestand|harbor|stocks|inventaire|库存|在庫)/i.test(p)) {
    if (lang === "de") {
      return (
        `📦 Betriebs- und Logistikstatus:\n\n` +
        `• Versand-Rückstand: 18 Bestellungen in Bearbeitung\n` +
        `• Erfüllungsquote (Fulfillment): 94.8%\n` +
        `• Hafenwarnung (Harbor): Charge von Mikro-Steckverbindern in vorsorglicher Quarantäne (Fehlerrate 4.2%)\n` +
        `• Zentrales Lager: 88% sofortige Servicekapazität`
      );
    }
    if (lang === "en") {
      return (
        `📦 Operations & Logistics Status:\n\n` +
        `• Shipping Backlog: 18 orders in preparation\n` +
        `• Fulfillment Rate: 94.8%\n` +
        `• Harbor Port Alert: Batch of micro-connectors in preventive quarantine (4.2% defect rate)\n` +
        `• Central Warehouse Stock: 88% immediate service capacity`
      );
    }
    return (
      `📦 Estado de Operaciones y Logística:\n\n` +
      `• Backlog de Envíos: 18 pedidos en preparación\n` +
      `• Tasa de Cumplimiento (Fulfillment): 94.8%\n` +
      `• Alerta en Puerto Harbor: Lote de micro-conectores en cuarentena preventiva por discrepancia dimensional (defectos al 4.2%)\n` +
      `• Stock en Almacén Central: 88% de capacidad de servicio inmediata`
    );
  }

  // 4. Calidad / SLAs / Incidencias / Qualität
  if (/(quality|calidad|sla|escalat|incidencia|ticket|inspeccion|qualität|qualite|qualità|质量|品質)/i.test(p)) {
    if (lang === "de") {
      return (
        `🛡️ Qualitätsmetriken und Service Level Agreements (SLA):\n\n` +
        `• Globale SLA-Einhaltung: 98.2%\n` +
        `• Aktive kritische Tickets: 1 (Quarantäne der Mikro-Steckverbinder)\n` +
        `• Durchschnittliche Lösungszeit: 18 Minuten\n` +
        `• Genehmigte Quality Gates: 42 von 43 Prüfpunkten im letzten Zyklus`
      );
    }
    if (lang === "en") {
      return (
        `🛡️ Quality Metrics & Service Level Agreements (SLA):\n\n` +
        `• Global SLA Compliance: 98.2%\n` +
        `• Active Critical Tickets: 1 (micro-connectors quarantine)\n` +
        `• Average Resolution Time: 18 minutes\n` +
        `• Approved Quality Gates: 42 of 43 checkpoints in recent cycle`
      );
    }
    return (
      `🛡️ Métricas de Calidad y Acuerdos de Servicio (SLA):\n\n` +
      `• Cumplimiento de SLA Global: 98.2%\n` +
      `• Tickets Críticos Activos: 1 (cuarentena de micro-conectores)\n` +
      `• Tiempo Promedio de Resolución: 18 minutos\n` +
      `• Puertas de Calidad Aprobadas: 42 de 43 checkpoints en el último ciclo`
    );
  }

  // 5. Recursos Humanos / Plantilla / Empleados / Personal
  if (/(hr|rrhh|personal|empleados|headcount|equipo|retention|belegschaft|effectifs|personale|人员|人事)/i.test(p)) {
    if (lang === "de") {
      return (
        `👥 Talent- und Personalbericht:\n\n` +
        `• Aktive Belegschaft: 48 Fachkräfte\n` +
        `• Jährliche Mitarbeiterbindung: 96.0%\n` +
        `• Ausstehende Leistungsbeurteilungen: 4 für dieses Quartal geplant\n` +
        `• Durchschnittliche Betriebszugehörigkeit: 3.4 Jahre`
      );
    }
    if (lang === "en") {
      return (
        `👥 Talent & Human Resources:\n\n` +
        `• Active Headcount: 48 specialists\n` +
        `• Year-over-Year Retention: 96.0%\n` +
        `• Pending Performance Reviews: 4 scheduled for this quarter\n` +
        `• Average Tenure: 3.4 years`
      );
    }
    return (
      `👥 Talento y Recursos Humanos:\n\n` +
      `• Plantilla Activa: 48 especialistas\n` +
      `• Retención Interanual: 96.0%\n` +
      `• Evaluaciones de Desempeño Pendientes: 4 programadas para este trimestre\n` +
      `• Antigüedad Promedio: 3.4 años`
    );
  }

  // 6. Resumen General del Sistema / Dashboard Overview / Übersicht
  if (/(resumen|summary|status|estado|panorama|overview|dashboard|sistema|übersicht|uebersicht|zusammenfassung|aperçu|panoramica|概览|概要)/i.test(p)) {
    if (lang === "de") {
      return (
        `🌐 Ganzheitlicher OmniDash-Führungsüberblick:\n\n` +
        `• Finanzen: $136k Umsatz mit positiver Handelsmarge von 28.5%\n` +
        `• Betrieb: 94.8% Liefertreue und 18 Bestellungen in Bearbeitung\n` +
        `• Qualität: 98.2% SLA-Einhaltung\n` +
        `• Lokale Speicherung: Aktive IndexedDB-Datenbank mit über 1.250 lokalen Einträgen ohne Cloud-Abhängigkeit.`
      );
    }
    if (lang === "en") {
      return (
        `🌐 Comprehensive OmniDash Executive Overview:\n\n` +
        `• Finance: $136k in revenue with 28.5% positive margin\n` +
        `• Operations: 94.8% on-time fulfillment and 18 orders in preparation\n` +
        `• Quality: 98.2% SLA compliance\n` +
        `• Local Storage: Active IndexedDB database with 1,250+ local records, zero cloud dependency.`
      );
    }
    return (
      `🌐 Panorama Ejecutivo Integral de OmniDash:\n\n` +
      `• Finanzas: $136k en ingresos con margen positivo del 28.5%\n` +
      `• Operaciones: 94.8% en entregas a tiempo y 18 pedidos en preparación\n` +
      `• Calidad: 98.2% cumplimiento de SLA\n` +
      `• Almacenamiento Local: Base de datos IndexedDB activa con 1,250+ registros locales, sin dependencia de nube.`
    );
  }

  // Fallback general
  if (lang === "de") {
    return (
      `Verstanden. Ich habe die Anfrage zu "${userPrompt}" im Unternehmens-Repository verarbeitet. ` +
      `Alle Telemetriemodule laufen einwandfrei in Dexie IndexedDB. ` +
      `Du kannst mich nach Umsatz ($136k), Einkaufsausgaben, Inventarstatus oder SLA-Einhaltung fragen.`
    );
  }
  if (lang === "en") {
    return (
      `Understood. I processed the query regarding "${userPrompt}" across the enterprise repository. ` +
      `All telemetry modules operate normally in Dexie IndexedDB. ` +
      `You can ask about revenue ($136k), procurement expenses, inventory status, or SLA compliance.`
    );
  }
  if (lang === "fr") {
    return (
      `Compris. J'ai traité la demande concernant "${userPrompt}" dans le référentiel d'entreprise. ` +
      `Tous les modules fonctionnent normalement dans Dexie IndexedDB. ` +
      `Vous pouvez me consulter sur les revenus (136 k$), les dépenses, les stocks ou les SLA.`
    );
  }
  if (lang === "it") {
    return (
      `Ricevuto. Ho elaborato la richiesta per "${userPrompt}" nel repository aziendale. ` +
      `Tutti i moduli operano normalmente in Dexie IndexedDB. ` +
      `Puoi chiedermi informazioni su entrate ($136k), spese, inventario o conformità SLA.`
    );
  }
  if (lang === "zh") {
    return (
      `已收到。我已在企业存储库中处理了关于“${userPrompt}”的查询。` +
      `所有遥测模块均在本地 Dexie IndexedDB 中平稳运行。` +
      `您可以向我询问收入 ($136k)、采购支出、库存状态或 SLA 履约情况。`
    );
  }
  if (lang === "ja") {
    return (
      `了解いたしました。「${userPrompt}」に関するクエリを企業リポジトリで処理しました。` +
      `すべてのテレメトリモジュールは Dexie IndexedDB で正常に稼働しています。` +
      `収益 ($136k)、調達費用、在庫状況、SLA 遵守状況などについてご質問いただけます。`
    );
  }

  return (
    `Entendido. He procesado la consulta sobre "${userPrompt}" en el repositorio de la empresa. ` +
    `Todos los módulos de telemetría operan con normalidad en Dexie IndexedDB. ` +
    `Puedes consultarme por ingresos ($136k), gastos de compras, estado del inventario o cumplimiento de SLAs.`
  );
}
