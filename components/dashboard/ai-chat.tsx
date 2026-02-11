"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Sparkles,
    X,
    Send,
    MessageSquare,
    ChevronDown,
    Loader2,
    BarChart2,
    Lightbulb,
    AlertTriangle,
    Lock
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { cn } from "../../lib/utils";

interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

interface SafetyAIChatProps {
    stats: {
        avgScore: number;
        respondentCount: number;
        strongDimensions: string[];
        belowMinDimensions: string[];
        atRiskDimensions: string[];
    };
    isDemo?: boolean;
    onUpgradeClick?: () => void;
}

const MessageContent = ({ content }: { content: string }) => {
    // Split by lines to handle bullets and spacing
    const lines = content.split('\n');
    return (
        <div className="space-y-2">
            {lines.map((line, idx) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return <div key={idx} className="h-2" />;

                // Bullet points
                if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('• ')) {
                    return (
                        <div key={idx} className="flex gap-2 pl-1">
                            <span className="text-primary mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                            <span className="flex-1">{trimmedLine.substring(2)}</span>
                        </div>
                    );
                }

                // Bold text (simple)
                const parts = line.split(/(\*\*.*?\*\*)/g);
                return (
                    <p key={idx} className="leading-relaxed">
                        {parts.map((part, pidx) => (
                            part.startsWith('**') && part.endsWith('**')
                                ? <strong key={pidx} className="font-bold text-primary/90">{part.slice(2, -2)}</strong>
                                : part
                        ))}
                    </p>
                );
            })}
        </div>
    );
};

export default function SafetyAIChat({ stats, isDemo, onUpgradeClick }: SafetyAIChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial greeting and context
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    role: "assistant",
                    content: "Hello! I'm your **Safety Culture AI Assistant**. I've analyzed your current dashboard data.\n\nHow can I help you improve your safety culture today?"
                }
            ]);
        }
    }, [messages.length]);

    // Scroll to bottom on new message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async (customText?: string) => {
        const textToSend = customText || input;
        if (!textToSend.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: "user", content: textToSend };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            // Context injection
            const systemContext = `
                You are a Safety Culture Expert AI.
                Current Dashboard Context:
                - Overall Score: ${stats.avgScore.toFixed(2)}/5.0
                - Total Respondents: ${stats.respondentCount}
                - Strong Areas: ${stats.strongDimensions.join(", ") || "None identified"}
                - Critical Gaps: ${stats.belowMinDimensions.join(", ") || "None identified"}
                - At-Risk Areas: ${stats.atRiskDimensions.join(", ") || "None identified"}
                
                ADVICE ON FORMATTING:
                - Use **bold text** for emphasis on key metrics or terms.
                - Use bullet points (- ) for lists, recommendations, or multiple points.
                - Use double newlines for paragraph spacing.
                - Keep responses structured and easy to read.
                
                Always be professional, data-driven, and focused on practical safety improvements. 
                Keep responses concise (max 120 words unless detail is requested).
            `;

            const history = messages.map(m => ({ role: m.role, content: m.content }));

            const response = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: systemContext },
                        ...history,
                        userMessage
                    ]
                })
            });

            if (!response.ok) throw new Error("Failed to get AI response");

            const data = await response.json();
            const aiText = data?.result?.response || "I'm sorry, I couldn't process that request.";

            setMessages(prev => [...prev, { role: "assistant", content: aiText }]);
        } catch (err) {
            console.error("Chat Error:", err);
            setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please check your connection and try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const quickActions = [
        { label: "Analyze Gaps", icon: AlertTriangle, text: "Can you analyze our current safety gaps and tell me why they are critical?" },
        { label: "Improve Scores", icon: Lightbulb, text: "What are the top 3 specific actions we can take to improve our overall score?" },
        { label: "Summary", icon: BarChart2, text: "Give me a high-level executive summary of this survey's performance." }
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <Card className="mb-4 w-[350px] md:w-[450px] h-[550px] shadow-2xl border-card flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-400">
                    <CardHeader className="p-4 bg-card border-0 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-bold">Safety AI Assistant</CardTitle>
                                <p className="text-[10px] text-muted-foreground">Context-aware Analysis</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-hidden p-0 flex flex-col bg-background/50">
                        {/* Messages Area */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-primary/10"
                        >
                            {messages.map((msg, i) => (
                                <div key={i} className={cn(
                                    "flex flex-col w-full",
                                    msg.role === "user" ? "items-end" : "items-start"
                                )}>
                                    <div className={cn(
                                        "px-4 py-3 rounded-2xl text-[13px] shadow-sm max-w-[90%]",
                                        msg.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                            : "bg-muted text-foreground rounded-tl-none border border-border/50"
                                    )}>
                                        {msg.role === "assistant" ? <MessageContent content={msg.content} /> : msg.content}
                                    </div>
                                    <span className="text-[9px] mt-1.5 opacity-40 px-2 uppercase tracking-tight font-semibold">
                                        {msg.role === "user" ? "User" : "AI Insight"}
                                    </span>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex items-start gap-2 max-w-[85%]">
                                    <div className="bg-muted px-3 py-2 rounded-2xl rounded-tl-none border border-border/50 shadow-sm flex items-center gap-2">
                                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                        <span className="text-xs text-muted-foreground italic">Thinking...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quick Actions List (Only if history is short) */}
                        {messages.length < 4 && (
                            <div className="px-4 pb-2 flex flex-wrap gap-2">
                                {quickActions.map((action, i) => (
                                    <Button
                                        key={i}
                                        variant="outline"
                                        size="sm"
                                        className="text-[10px] h-7 gap-1.5 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all shadow-sm"
                                        onClick={() => handleSend(action.text)}
                                        disabled={isLoading}
                                    >
                                        <action.icon className="w-3 h-3" />
                                        {action.label}
                                    </Button>
                                ))}
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="p-3 border-0 bg-card border-card mt-auto">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                className="flex gap-2"
                            >
                                <Input
                                    placeholder="Ask anything about the data..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    className="h-10 text-sm focus-visible:ring-primary/30 border-primary/10"
                                    disabled={isLoading}
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    className="h-10 w-10 shrink-0 shadow-lg shadow-primary/20"
                                    disabled={isLoading || !input.trim()}
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            </form>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Pulsating Trigger Button */}
            <Button
                onClick={() => {
                    if (isDemo) {
                        onUpgradeClick?.();
                        return;
                    }
                    setIsOpen(!isOpen);
                }}
                size="icon"
                className={cn(
                    "h-14 w-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group border-2 border-primary/50 relative",
                    isOpen
                        ? "bg-primary text-muted-foreground rotate-180"
                        : "bg-white text-primary hover:bg-white/90"
                )}
            >
                {isOpen ? (
                    <ChevronDown className="w-6 h-6 " />
                ) : (
                    <div className="relative">
                        <Sparkles className="w-6 h-6 text-primary group-hover:rotate-12 transition-transform" />

                        {isDemo ? (
                            <div className="absolute -top-1 -right-1 bg-primary text-white rounded-full p-0.5 shadow-sm border border-white">
                                <Lock className="w-2 h-2" />
                            </div>
                        ) : (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary/20 border border-primary/30"></span>
                            </span>
                        )}
                    </div>
                )}
            </Button>
        </div>
    );
}
