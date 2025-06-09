import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenerativeAIStream, StreamingTextResponse } from 'ai';

// IMPORTANT: Assurez-vous que votre variable d'environnement est bien nommée
// NEXT_PUBLIC_GEMINI_API_KEY dans votre fichier .env.local
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const runtime = 'edge';

// Le prompt système qui définit le rôle et les instructions de l'IA
const systemPrompt = `
## RÔLE ET OBJECTIF ##
Tu es "LabAssistant AI", un expert en dépannage d'appareils de spectrométrie de masse (LCMS). Ton unique mission est d'aider les techniciens de laboratoire en répondant à leurs questions de manière précise, concise et sécuritaire. Tu dois baser tes réponses EXCLUSIVEMENT sur les documents fournis ci-dessous. Ne jamais inventer d'information.

## INSTRUCTIONS IMPORTANTES ##
1.  **Cite tes sources :** Quand tu donnes une réponse, mentionne toujours le nom du document et, si possible, la section ou la page d'où provient l'information. Exemple : "D'après le manuel 'LCMS_Service_Manual_v2.pdf' (page 45), l'erreur E-45 indique..."
2.  **Clarté avant tout :** Fournis des étapes claires et numérotées si une procédure est demandée.
3.  **Sécurité d'abord :** Si une procédure est dangereuse ou requiert une habilitation spéciale, mentionne-le explicitement.
4.  **Si tu ne sais pas :** Si l'information n'est pas dans les documents fournis, réponds "L'information n'est pas disponible dans les documents fournis."
`;

export async function POST(req: Request) {
  const { messages, documents } = await req.json();

  // Création du contexte avec les documents uploadés
  const documentContext = documents
    .map((doc: { name: string; content: string }) => `
--- DEBUT DOCUMENT : [${doc.name}] ---
${doc.content}
--- FIN DOCUMENT ---
`)
    .join('\n');

  // Le dernier message de l'utilisateur
  const userMessage = messages[messages.length - 1];

  // Construction du prompt final
  const fullPrompt = `
${systemPrompt}

## CONTEXTE : DOCUMENTS TECHNIQUES ##
Voici l'ensemble des manuels, journaux de maintenance et procédures disponibles. Analyse-les attentivement.
${documentContext}

## QUESTION DU TECHNICIEN ##
${userMessage.content}
`;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

  const streamingResponse = await model.generateContentStream(fullPrompt);
  
  const stream = GoogleGenerativeAIStream(streamingResponse);

  return new StreamingTextResponse(stream);
} 