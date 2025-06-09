"use client";

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import * as pdfjs from 'pdfjs-dist';

// Configuration du worker pour pdfjs-dist
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
    "D'après les logs, quelle est la cause probable pour l'erreur P-21 sur la machine LCMS-001 ?",
    "Que signifie une LED de statut qui clignote en orange sur le détecteur QDa ?",
    "Quelle est la procédure de mise sous tension du détecteur ACQUITY QDa ?",
];

type Document = { name: string; content: string };

export default function Chat() {
    const [preloadedDocs, setPreloadedDocs] = useState<Document[]>([]);
    const [userDocs, setUserDocs] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const allDocs = [...preloadedDocs, ...userDocs];

    useEffect(() => {
        const loadInitialDocuments = async () => {
            try {
                const response = await fetch('/api/load-documents');
                if (!response.ok) throw new Error('Failed to fetch pre-loaded documents');
                const data = await response.json();
                setPreloadedDocs(data.documents);
            } catch (err) {
                setError("Impossible de charger les documents d'exemple.");
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialDocuments();
    }, []);

    const { messages, input, handleInputChange, handleSubmit, setInput, isLoading: isChatLoading } = useChat({
        api: '/api/chat',
        body: { documents: allDocs },
        onError: (e) => setError(e.message),
    });

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        setIsLoading(true);
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
                        text += pageText.items.map(item => (item as any).str).join(' ');
                    }
                    content = text;
                } else {
                    content = await file.text();
                }
                setUserDocs(prev => [...prev, { name: file.name, content }]);
            } catch (err) {
                setError(`Erreur lors de l'analyse du fichier ${file.name}`);
            }
        }
        setIsLoading(false);
    };

    const isUiDisabled = isLoading || isChatLoading;

    return (
        <div className="grid grid-cols-[3fr_7fr] h-screen bg-slate-50 font-sans">
            <div className="flex-shrink-0 border-r border-slate-200 bg-white p-6 flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Documents</CardTitle>
                        <CardDescription>Consultez les exemples ou uploadez les vôtres.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <h4 className="font-semibold text-slate-700 mb-2">Exemples pré-chargés</h4>
                        {isLoading && <p className="text-sm text-slate-500">Chargement...</p>}
                        <div className="space-y-2">
                            {preloadedDocs.map(doc => <div key={doc.name} className="text-base p-3 bg-slate-100 rounded-md truncate" title={doc.name}>{doc.name}</div>)}
                        </div>
                        <hr className="my-4" />
                        <h4 className="font-semibold text-slate-700 mb-2">Uploadez vos documents</h4>
                        <input type="file" id="file-upload" multiple onChange={handleFileChange} className="hidden" accept=".pdf,.txt,.csv" />
                        <Button onClick={() => document.getElementById('file-upload')?.click()} disabled={isLoading} className="w-full">Uploader (PDF, TXT, CSV)</Button>
                        <div className="mt-2 space-y-2">
                            {userDocs.map(doc => <div key={doc.name} className="text-base p-3 bg-green-100 rounded-md truncate" title={doc.name}>{doc.name}</div>)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="flex-grow">
                     <CardHeader>
                        <CardTitle>Exemples de Questions</CardTitle>
                        <CardDescription>Cliquez pour tester</CardDescription>
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
                    {error && <div className="text-sm text-red-500 bg-red-100 p-2 rounded-md">{error}</div>}
                </header>
                <main className="flex-grow p-6 overflow-y-auto">
                    <div className="space-y-6">
                        {messages.length === 0 && !isLoading && (
                             <div className="text-center text-slate-500 h-full flex items-center justify-center">
                                {isLoading ? 'Chargement des documents...' : 'Les documents sont chargés. Posez une question pour commencer.'}
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
                                    <p className="text-base animate-pulse">LabAssistant AI est en train d'écrire...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
                <footer className="p-4 border-t border-slate-200 bg-white">
                    <form onSubmit={handleSubmit} className="flex gap-4">
                        <Input value={input} onChange={handleInputChange} placeholder="Posez votre question technique..." disabled={isUiDisabled} />
                        <Button type="submit" disabled={isUiDisabled || !input.trim()}>Envoyer</Button>
                    </form>
                </footer>
            </div>
        </div>
    );
}
