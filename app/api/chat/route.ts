import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenerativeAIStream, StreamingTextResponse } from 'ai';

// IMPORTANT: Assurez-vous que votre variable d'environnement est bien nommée
// NEXT_PUBLIC_GEMINI_API_KEY dans votre fichier .env.local
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const runtime = 'edge';

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
  console.log('--- API /api/chat called ---');
  const { messages, documents } = await req.json();

  // Create context from uploaded documents
  const documentContext = documents
    .map((doc: { name: string; content: string }) => `
--- START OF DOCUMENT: [${doc.name}] ---
${doc.content}
--- END OF DOCUMENT ---
`)
    .join('\n');

  // The user's last message
  const userMessage = messages[messages.length - 1];

  // Build the final prompt
  const fullPrompt = `
${systemPrompt}

## CONTEXT: TECHNICAL DOCUMENTS ##
Here are all the available manuals, maintenance logs, and procedures. Analyze them carefully.
${documentContext}

## TECHNICIAN'S QUESTION ##
${userMessage.content}
`;

  const model = genAI.getGenerativeModel({ 
    model: process.env.GEMINI_MODEL_NAME || "gemini-1.5-pro-latest" 
  });

  const streamingResponse = await model.generateContentStream(fullPrompt);
  
  const stream = GoogleGenerativeAIStream(streamingResponse);

  return new StreamingTextResponse(stream);
} 