import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenerativeAIStream, Message, StreamingTextResponse } from 'ai';
import { supabaseAdmin as supabase } from '@/lib/supabase/server';

// IMPORTANT: Assurez-vous que votre variable d'environnement est bien nommée
// NEXT_PUBLIC_GEMINI_API_KEY dans votre fichier .env.local
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 secondes de timeout

// System prompt that defines the AI's role and instructions
const systemPrompt = `
## ROLE AND GOAL ##
You are "LabAssistant AI", an expert in troubleshooting Mass Spectrometry (LCMS) devices. Your sole mission is to assist lab technicians by answering their questions accurately, concisely, and safely. You must base your answers EXCLUSIVELY on the documents provided below. Never invent information.

## IMPORTANT INSTRUCTIONS ##
1.  **Cite your sources:** When providing an answer, always mention the name of the document and, if possible, the section or page number from which the information originates. Example: "According to the 'LCMS_Service_Manual_v2.pdf' manual (page 45), error E-45 indicates..."
2.  **Clarity first:** Provide clear, numbered steps if a procedure is requested.
3.  **Safety first:** If a procedure is dangerous or requires special authorization, state it explicitly.
4.  **If you don't know:** If the information is not in the provided documents, reply with "The information is not available in the provided documents."
`;

export async function POST(req: Request) {
  const { messages, document } = await req.json();
  const lastUserMessage = messages[messages.length - 1];

  // 1. Récupérer l'historique de la DB
  const { data: dbMessages, error: msgError } = await supabase.from('messages').select('role, content').order('created_at');
  if (msgError) {
    return new Response(`Error fetching history: ${msgError.message}`, { status: 500 });
  }
  const historyForModel = dbMessages.map((msg): Message => ({ id: '', role: msg.role as 'user' | 'assistant', content: msg.content }));

  // 2. Construire le contexte du document temporaire, s'il existe
  let documentContext = '';
  if (document) {
    documentContext = `## CONTEXT: A DOCUMENT HAS BEEN PROVIDED ##
--- START OF DOCUMENT: [${document.name}] ---
${document.content}
--- END OF DOCUMENT ---`;
  }

  // 3. Construire le prompt final
  const promptForGemini = `
${systemPrompt}

${documentContext}

## PREVIOUS CONVERSATION HISTORY ##
${historyForModel.map(m => `${m.role}: ${m.content}`).join('\n')}

## CURRENT USER QUESTION ##
user: ${lastUserMessage.content}
assistant:`;

  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL_NAME! });
  const stream = await model.generateContentStream(promptForGemini);

  // 4. Stream la réponse et sauvegarder dans la DB
  const aiStream = GoogleGenerativeAIStream(stream, {
    onStart: async () => {
      let contentToSave = lastUserMessage.content;
      if (document) {
        contentToSave = `[DOCUMENT ATTACHED: ${document.name}]\n\n${lastUserMessage.content}`;
      }
      await supabase.from('messages').insert({ role: 'user', content: contentToSave });
    },
    onCompletion: async (completion) => {
      await supabase.from('messages').insert({ role: 'assistant', content: completion });
    },
  });

  return new StreamingTextResponse(aiStream);
} 