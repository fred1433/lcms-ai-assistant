"use client";

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Icônes simples pour le chat
const BotIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>
);
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);


const exampleQuestions = [
    "Que signifie le code d'erreur P-21 ?",
    "Décris la procédure de nettoyage hebdomadaire.",
    "Quelle est la pression nominale de la pompe A ?",
    "La procédure X nécessite-t-elle un équipement de sécurité spécial ?",
];

export default function Chat() {
    const [uploadedFiles, setUploadedFiles] = useState<{ name: string; content: string }[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const { messages, input, handleInputChange, handleSubmit, setInput, isLoading } = useChat({
        api: '/api/chat',
        body: {
            documents: uploadedFiles,
        },
        onError: (error) => {
            console.error("Chat error:", error);
        }
    });

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsParsing(true);
        const newFiles = [...uploadedFiles];

        for (const file of Array.from(files)) {
            if (newFiles.some(f => f.name === file.name)) continue;

            let content = '';
            try {
                if (file.type.startsWith("text/")) {
                    content = await file.text();
                    newFiles.push({ name: file.name, content });
                } else {
                    console.warn(`Unsupported file type: ${file.type}. Skipping file ${file.name}.`);
                    // On pourrait afficher une notification à l'utilisateur ici
                    continue;
                }
            } catch (error) {
                console.error(`Error parsing file ${file.name}:`, error);
            }
        }

        setUploadedFiles(newFiles);
        setIsParsing(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleExampleQuestionClick = (question: string) => {
        setInput(question);
    };

    return (
        <div className="grid grid-cols-[3fr_7fr] h-screen bg-slate-50 font-sans">
            {/* Colonne de gauche: Upload et Exemples */}
            <div className="flex-shrink-0 border-r border-slate-200 bg-white p-6 flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Documents Techniques</CardTitle>
                        <CardDescription>Uploadez les manuels (TXT, CSV)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            multiple
                            className="hidden"
                            accept=".txt,.csv"
                            disabled={isParsing}
                        />
                        <Button onClick={() => fileInputRef.current?.click()} disabled={isParsing} className="w-full">
                            {isParsing ? 'Analyse en cours...' : 'Uploader des fichiers'}
                        </Button>

                        <div className="mt-4 space-y-2">
                            {uploadedFiles.map((file, index) => (
                                <div key={index} className="text-base p-3 bg-slate-100 rounded-md truncate">
                                    {file.name}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <p className="text-sm text-slate-500">
                            Les fichiers sont traités localement sur votre navigateur.
                        </p>
                    </CardFooter>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Exemples</CardTitle>
                        <CardDescription>Cliquez pour essayer une question</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {exampleQuestions.map((q, i) => (
                                <Button
                                    key={i}
                                    variant="outline"
                                    className="w-full text-left justify-start h-auto whitespace-normal"
                                    onClick={() => handleExampleQuestionClick(q)}
                                    disabled={isLoading || uploadedFiles.length === 0}
                                >
                                    {q}
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>


            {/* Colonne de droite: Interface de Chat */}
            <div className="flex flex-col h-screen">
                <header className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
                    <h1 className="text-2xl font-bold">LabAssistant AI</h1>
                </header>
                
                <main ref={chatContainerRef} className="flex-grow p-6 overflow-y-auto">
                    <div className="space-y-6">
                        {messages.length === 0 && !isLoading && (
                             <div className="text-center text-slate-500">Uploadez un document et posez une question pour commencer.</div>
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
                         {isLoading && (
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
                        <Input
                            value={input}
                            onChange={handleInputChange}
                            placeholder={uploadedFiles.length === 0 ? "Veuillez uploader un document d'abord" : "Posez votre question technique ici..."}
                            disabled={isLoading || uploadedFiles.length === 0}
                        />
                        <Button type="submit" disabled={isLoading || !input.trim()}>
                            Envoyer
                        </Button>
                    </form>
                </footer>
            </div>
        </div>
    );
}
