"use client";

import { useState, useEffect, useRef } from 'react';
import { useChat, Message } from 'ai/react';
import { supabase } from '@/lib/supabase/client';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Icônes simples pour le chat
const BotIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>
);
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);

const exampleQuestions = [
    "According to the logs, what is the probable cause for error P-21 on the LCMS-001 machine?",
    "What does a flashing orange status LED on the QDa detector mean?",
    "What is the power-on procedure for the ACQUITY QDa detector?",
];

type TempDocument = { name: string; content: string };

const MAX_DOCUMENTS = 3;

export default function Chat() {
    const [documents, setDocuments] = useState<TempDocument[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    
    const { messages, setMessages, input, handleInputChange, handleSubmit, setInput, isLoading: isChatLoading } = useChat({
        body: { documents },
        onError: (e) => setError(e.message),
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Charger l'historique initial
    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: initialMessages } = await supabase.from('messages').select('role, content').order('created_at');
            setMessages(initialMessages!.map((m: any) => ({ id: Math.random().toString(), role: m.role, content: m.content } as Message)));
        };
        fetchInitialData();
    }, [setMessages]);

    // Auto-scroll on new messages or when assistant starts typing
    useEffect(() => {
        scrollToBottom();
    }, [messages, isChatLoading]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        if (documents.length + files.length > MAX_DOCUMENTS) {
            setError(`You cannot attach more than ${MAX_DOCUMENTS} documents in total.`);
            // Reset file input to allow re-selection
            event.target.value = '';
            return;
        }

        setIsParsing(true);
        setError(null);
        const pdfjs = await import('pdfjs-dist/build/pdf.min.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

        try {
            const newDocuments: TempDocument[] = [];
            for (const file of Array.from(files)) {
                let content = '';
                if (file.type === 'application/pdf') {
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjs.getDocument(arrayBuffer).promise;
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const pageText = await page.getTextContent();
                        content += pageText.items.map((item: TextItem) => item.str).join(' ');
                    }
                } else {
                    content = await file.text();
                }
                newDocuments.push({ name: file.name, content });
            }
            setDocuments(prevDocs => [...prevDocs, ...newDocuments]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsParsing(false);
        }
         // Reset file input to allow re-uploading the same file
        event.target.value = '';
    };
    
    const isUiDisabled = isChatLoading || isParsing;
    const isUploadDisabled = isParsing || documents.length >= MAX_DOCUMENTS;

  return (
        <div className="grid grid-cols-[3fr_7fr] h-screen bg-slate-50 font-sans">
            <div className="flex-shrink-0 border-r border-slate-200 bg-white p-6 flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Attach a Document</CardTitle>
                        <CardDescription>Upload max 3 files per message</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <input type="file" id="file-upload" onChange={handleFileChange} className="hidden" accept=".pdf,.txt,.csv" disabled={isUploadDisabled} multiple />
                        <Button onClick={() => document.getElementById('file-upload')?.click()} disabled={isUploadDisabled} className="w-full">
                            {isParsing ? 'Parsing...' : 'Upload (PDF, TXT, CSV)'}
                        </Button>
                        {documents.length > 0 && (
                          <div className="mt-2 text-sm space-y-2">
                            <p className="font-semibold">Attached files:</p>
                            <ul className="list-disc list-inside">
                                {documents.map((doc, index) => (
                                    <li key={index} className="p-1 bg-green-100 rounded-md truncate" title={doc.name}>
                                        {doc.name}
                                    </li>
                                ))}
                            </ul>
                          </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col h-screen">
                <header className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
                    <h1 className="text-2xl font-bold">LabAssistant AI</h1>
                    {error && <div className="text-sm text-red-500 bg-red-100 p-2 rounded-md">{error}</div>}
                </header>
                <main className="flex-grow p-6 overflow-y-auto">
                    <div className="space-y-6">
                        {messages.length === 0 && (
                             <div className="text-center text-slate-500 h-full flex items-center justify-center">
                                {isParsing ? 'Parsing document...' : 'Upload a document for context, or ask a question to get started.'}
                             </div>
                        )}
                        {messages.map((m, index) => (
                            <div key={index} className={`flex items-start gap-4 ${m.role === 'user' ? 'justify-end' : ''}`}>
                                {m.role === 'assistant' && (
                                    <Avatar className="w-10 h-10">
                                        <AvatarFallback><BotIcon /></AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={`max-w-2xl p-4 rounded-lg shadow-sm ${m.role === 'user' ? 'bg-blue-500 text-white' : 'bg-white'}`}>
                                    <p className="text-base whitespace-pre-wrap">{m.content}</p>
                                    {m.role === 'assistant' && error && m.id === messages[messages.length - 1].id && (
                                        <div className="text-xs text-red-500 pt-2">An error occurred.</div>
                                    )}
                                </div>
                                {m.role === 'user' && (
                                    <Avatar className="w-10 h-10">
                                        <AvatarFallback><UserIcon /></AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))}
                         {isChatLoading && (
                            <div className="flex items-start gap-4">
                                <Avatar className="w-10 h-10">
                                    <AvatarFallback><BotIcon /></AvatarFallback>
                                </Avatar>
                                <div className="max-w-2xl p-4 rounded-lg shadow-sm bg-white">
                                    <p className="text-base animate-pulse">LabAssistant AI is typing...</p>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
        </div>
      </main>
                <footer className="p-4 border-t border-slate-200 bg-white">
                    <form onSubmit={handleSubmit} className="flex gap-4">
                        <Input value={input} onChange={handleInputChange} placeholder="Ask your technical question..." disabled={isUiDisabled} />
                        <Button type="submit" disabled={isUiDisabled || !input.trim()}>Send</Button>
                    </form>
      </footer>
            </div>
    </div>
  );
}
