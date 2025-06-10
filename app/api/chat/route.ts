import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenerativeAIStream, Message, StreamingTextResponse } from 'ai';
import { supabaseAdmin as supabase } from '@/lib/supabase/server';

// IMPORTANT: Assurez-vous que votre variable d'environnement est bien nommée
// GEMINI_API_KEY dans votre fichier .env.local
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 secondes de timeout

// System prompt that defines the AI's role and instructions
const systemPrompt = `
You are LabAssistant AI, a helpful and versatile assistant.
Your goal is to provide the best possible answer to the user.
To do this, use all the information available to you:
- The content of any document provided.
- The history of the conversation.
- Your own general knowledge.

Adapt your tone and the level of detail to the user's question. Be natural and helpful.
`;

export async function POST(req: Request) {
  // Log pour débogage
  console.log('--- New request to /api/chat ---');
  console.log('Checking environment variables...');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  console.log('Supabase URL available:', !!supabaseUrl);
  console.log('Supabase Service Key available:', !!serviceKey);
  console.log('Gemini API Key available:', !!geminiKey);

  if (serviceKey) {
    console.log('Service Key starts with:', serviceKey.substring(0, 5));
    console.log('Service Key ends with:', serviceKey.substring(serviceKey.length - 5));
  }
   if (geminiKey) {
    console.log('Gemini Key starts with:', geminiKey.substring(0, 5));
  }
  console.log('------------------------------------');

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