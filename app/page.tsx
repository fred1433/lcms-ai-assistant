"use client";

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { exampleDocuments } from '@/lib/example-documents';
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

type Document = { name: string; content: string };

const USAGE_LIMIT = 40;

export default function Chat() {
    const [userDocs, setUserDocs] = useState<Document[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    
    useEffect(() => {
        // Dynamically import pdfjs and set workerSrc only on client side
        import('pdfjs-dist/build/pdf.min.mjs').then(pdfjs => {
            pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        });
    }, []);

    const allDocs = [...exampleDocuments, ...userDocs];

    const { messages, input, handleInputChange, handleSubmit, setInput, isLoading: isChatLoading } = useChat({
        api: '/api/chat',
        body: { documents: allDocs },
        onError: (e) => setError(e.message),
    });

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        setIsParsing(true);
        const pdfjs = await import('pdfjs-dist/build/pdf.min.mjs');

        for (const file of Array.from(files)) {
            try {
                let content = '';
                if (file.type === 'application/pdf') {
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjs.getDocument(arrayBuffer).promise;
                    let text = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const pageText = await page.getTextContent();
                        text += pageText.items.map((item: TextItem) => item.str).join(' ');
                    }
                    content = text;
                } else {
                    content = await file.text();
                }
                setUserDocs(prev => [...prev, { name: file.name, content }]);
            } catch (err) {
                setError(`Error while parsing file ${file.name}`);
            }
        }
        setIsParsing(false);
    };

    const userMessagesCount = messages.filter(m => m.role === 'user').length;
    const messagesLeft = USAGE_LIMIT - userMessagesCount;

    const isUiDisabled = isChatLoading || isParsing || messagesLeft <= 0;

    return (
        <div className="grid grid-cols-[3fr_7fr] h-screen bg-slate-50 font-sans">
            <div className="flex-shrink-0 border-r border-slate-200 bg-white p-6 flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Documents</CardTitle>
                        <CardDescription>Review examples or upload your own.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <h4 className="font-semibold text-slate-700 mb-2">Pre-loaded Examples</h4>
                        <div className="space-y-2">
                            {exampleDocuments.map(doc => <div key={doc.name} className="text-base p-3 bg-slate-100 rounded-md truncate" title={doc.name}>{doc.name}</div>)}
                        </div>
                        <hr className="my-4" />
                        <h4 className="font-semibold text-slate-700 mb-2">Upload Your Documents</h4>
                        <input type="file" id="file-upload" multiple onChange={handleFileChange} className="hidden" accept=".pdf,.txt,.csv" disabled={isParsing} />
                        <Button onClick={() => document.getElementById('file-upload')?.click()} disabled={isParsing} className="w-full">
                            {isParsing ? 'Parsing...' : 'Upload (PDF, TXT, CSV)'}
                        </Button>
                        <div className="mt-2 space-y-2">
                            {userDocs.map(doc => <div key={doc.name} className="text-base p-3 bg-green-100 rounded-md truncate" title={doc.name}>{doc.name}</div>)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="flex-grow">
                     <CardHeader>
                        <CardTitle>Example Questions</CardTitle>
                        <CardDescription>Click one to try</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {exampleQuestions.map((q, i) => <Button key={i} variant="outline" className="w-full text-left justify-start h-auto whitespace-normal" onClick={() => setInput(q)} disabled={isUiDisabled}>{q}</Button>)}
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <div className="flex flex-col h-screen">
                <header className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
                    <h1 className="text-2xl font-bold">LabAssistant AI</h1>
                    <div className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                        {messagesLeft > 0 ? <strong>{messagesLeft} messages left</strong> : <strong>Usage limit reached</strong>}
                    </div>
                    {error && <div className="text-sm text-red-500 bg-red-100 p-2 rounded-md">{error}</div>}
                </header>
                <main className="flex-grow p-6 overflow-y-auto">
                    <div className="space-y-6">
                        {messages.length === 0 && !isParsing && (
                             <div className="text-center text-slate-500 h-full flex items-center justify-center">
                                {isParsing ? 'Parsing files...' : 'Documents are loaded. Ask a question to begin.'}
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
                                        <div className="text-xs text-red-500 pt-2">Error: {typeof error === 'string' ? error : error.message}</div>
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
