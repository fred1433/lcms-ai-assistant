import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenerativeAIStream, Message, StreamingTextResponse } from 'ai';
import { supabase } from '@/lib/supabase/client';

export const runtime = 'edge';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const systemPrompt = `You are LabAssistantAI, a helpful AI assistant specialized in Waters LC-MS instruments.
You are chatting with a lab technician.
Your goal is to help them troubleshoot their instrument based on the documents provided and your general knowledge.
Be concise, professional, and accurate.
If you don't know the answer, say so. Do not invent information.
When referencing a document, mention it by name.`;

export async function POST(req: Request) {
    try {
        const { messages, documents }: { messages: Message[], documents?: { name: string; content: string }[] } = await req.json();

        if (!messages || messages.length === 0) {
            return new Response('No messages provided', { status: 400 });
        }
        
        const lastUserMessage = messages[messages.length - 1];

        let documentContext = '';
        if (documents && documents.length > 0) {
            const documentsContent = documents.map(doc => `## Document: ${doc.name}\n\n${doc.content}`).join('\n\n---\n\n');
            documentContext = `You must base your answer on the following documents. If the user asks a question that is not related to the documents, you should say that you can only answer questions about the provided documents. Here are the documents:\n\n---\n\n${documentsContent}\n\n---\n\n`;
        }

        const historyForModel = messages.slice(0, -1).map(m => `${m.role}: ${m.content}`).join('\n');
        
        const prompt = `${systemPrompt}\n\n${documentContext}## PREVIOUS CONVERSATION HISTORY\n${historyForModel}\n\n## CURRENT USER QUESTION\nuser: ${lastUserMessage.content}\nassistant:`;

        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL_NAME! });
        const stream = await model.generateContentStream(prompt);

        const aiStream = GoogleGenerativeAIStream(stream, {
            onStart: async () => {
                let contentToSave = lastUserMessage.content;
                if (documents && documents.length > 0) {
                    contentToSave = `[DOCUMENTS ATTACHED: ${documents.map(doc => doc.name).join(', ')}]\n\n${lastUserMessage.content}`;
                }
                await supabase.from('messages').insert({ role: 'user', content: contentToSave });
            },
            onCompletion: async (completion) => {
                await supabase.from('messages').insert({ role: 'assistant', content: completion });
            }
        });

        return new StreamingTextResponse(aiStream);

    } catch (error: any) {
        console.error('Error in /api/chat:', error);
        return new Response(`Error processing request: ${(error as Error).message}`, { status: 500 });
    }
} 