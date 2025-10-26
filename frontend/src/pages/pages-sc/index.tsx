import { useState, useEffect, useCallback } from "react";
import { User, Moon, Sun, Calendar, RectangleEllipsisIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "../../../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import CameraComponent from "@/components/CameraComponent";

import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { Arrow } from "@radix-ui/react-context-menu";

interface Profile {
    name: string;
    conversationSummary: string;
}

interface Task {
    description: string;
    dueBy: Date | null;
}

export default function ContactDirectory() {
    const contacts = useQuery(api.profile.getProfiles, {});
    const tasks = useQuery(api.task.getTasks, {});

    const updateProfiles = useMutation(api.profile.updateProfiles);

	const createTasks = useMutation(api.task.createTasks);

    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [chatMessages, setChatMessages] = useState<
        { role: "user" | "assistant"; content: string }[]
    >([]);

    const [chatInput, setChatInput] = useState("");
    const [isAiThinking, setIsAiThinking] = useState(false);

    const [indexingProfiles, setIndexingProfiles] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") as
            | "light"
            | "dark"
            | null;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.classList.toggle(
                "dark",
                savedTheme === "dark"
            );
        }
    }, []);

    const handleSendMessage = async () => {
        if (!chatInput.trim() || isAiThinking) return;

        const userMessage = {
            role: "user" as const,
            content: chatInput,
        };

        setChatMessages((prev) => [...prev, userMessage]);
        setChatInput("");
        setIsAiThinking(true);

        try {
            const res = await fetch(
                `https://imo-8d4faadab8d7.herokuapp.com/omi/prompt?prompt=${chatInput}`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            const data = await res.json();

            const aiMessage = { role: "assistant" as const, content: data };

            setChatMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
            console.error("Error sending message:", error);

            setChatMessages((prev) => [
                ...prev,
                {
                    role: "assistant" as const,
                    content: "Sorry, there was an error.",
                },
            ]);
        } finally {
            setIsAiThinking(false);
        }
    };

    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const reIndexProfiles = useCallback(async () => {
        if (indexingProfiles) return;

        const params = new URLSearchParams();

        contacts?.forEach((c) => {
            params.append(`profiles`, c.name);
        });

        setIndexingProfiles(true);

		const endpoint = `https://imo-8d4faadab8d7.herokuapp.com/omi/profiles?name=Satvik`;

        fetch(
            `${endpoint}${(contacts && contacts.length > 0) ? `&${params.toString()}` : ""}`
        ).then(async (res) => {
            const profiles = JSON.parse(await res.json()).profiles as Profile[];

            updateProfiles({
                profiles: profiles,
            });

            setIndexingProfiles(false);
        });
    }, [indexingProfiles, contacts]);

    const regenerateTasks = useCallback(async () => {
        const currTasks = new URLSearchParams();

		tasks?.forEach((t) => {
			currTasks.append('curr_tasks', t.description);
		})

		const endpoint = 'https://imo-8d4faadab8d7.herokuapp.com/omi/tasks?name=Satvik';

		const url = `${endpoint}${(tasks && tasks.length > 0) ? `&${currTasks.toString()}` : ""}`;

		console.log(url);

        fetch(
			url
        ).then(async (res) => {
			console.log(res);

			const json = await res.json();

			console.log(json);

            const newTasks = JSON.parse(json).tasks as {
                description: string;
                dueBy: number;
            }[];

			createTasks({ tasks: newTasks.map((t) => {
				return {
					description: t.description,
					dueBy: t.dueBy ? t.dueBy : undefined
				}
			}) });
        });
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
            {contacts && tasks ? (
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12 relative">
                        <Button
                            onClick={toggleTheme}
                            variant="outline"
                            size="icon"
                            className="absolute right-0 top-0"
                        >
                            {theme === "light" ? (
                                <Moon className="h-5 w-5" />
                            ) : (
                                <Sun className="h-5 w-5" />
                            )}
                        </Button>
                        <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                            IMO Network
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 text-lg">
                            People Made Easy
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        {/* Left Column - Contact Cards */}
                        <div className="space-y-4">
                            {/* Stats Header */}
                            <div className="text-left mb-4 flex flex-row items-center">
                                <p className="text-slate-600 dark:text-slate-400">
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                                        {contacts.length}
                                    </span>{" "}
                                    contacts in your network
                                    {" • "}
                                </p>
                                <Button
                                    className="ml-auto hover:cursor-pointer"
                                    onClick={reIndexProfiles}
                                >
                                    Re-index Profiles
                                    <ArrowPathIcon
                                        className={`${indexingProfiles ? "animate-spin" : ""}`}
                                    />
                                </Button>
                            </div>
                            {contacts.map((contact, index) => {
                                return (
                                    <Card
                                        key={index}
                                        className={`transition-all duration-300 hover:shadow-lg cursor-pointer overflow-hidden h-auto`}
                                    >
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4 flex-1">
                                                    <Avatar className="h-12 w-12">
                                                        <AvatarFallback>
                                                            <User className="h-6 w-6" />
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <CardTitle className="text-xl">
                                                            {contact.name}
                                                        </CardTitle>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>

                                        <div
                                            className={`transition-all duration-300 ease-in-out max-h-[1000px] opacity-100`}
                                        >
                                            <CardContent className="space-y-4 pt-0">
                                                {/* Date */}
                                                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>
                                                        Met on{" "}
                                                        {formatDate(
                                                            new Date(
                                                                contact.createdAt
                                                            )
                                                        )}
                                                    </span>
                                                </div>

                                                {/* Photo Section */}
                                                <div className="flex justify-center">
                                                    <Avatar className="h-32 w-32 border-4 border-slate-200 dark:border-slate-700">
                                                        <AvatarFallback>
                                                            <User className="h-16 w-16" />
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>

                                                {/* Conversation Summary */}
                                                <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
                                                    <CardHeader>
                                                        <CardTitle className="text-lg flex items-center gap-2">
                                                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                                            Conversation Summary
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                                            {
                                                                contact.conversationSummary
                                                            }
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                            </CardContent>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Right Column - Tasks Section */}

                        <div className="p-6 space-y-6">
                            {/* Camera Component */}
                            <CameraComponent />

                            {/* Tasks Section */}
                            <Card>
                                <CardContent>
                                    <div className="flex flex-row">
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                                            Tasks
                                        </h2>
                                        <Button className="ml-auto hover:cursor-pointer" onClick={regenerateTasks}>
                                            Regenerate Tasks
                                            <ArrowPathIcon/>
                                        </Button>
                                    </div>

                                    {tasks.length === 0 ? (
                                        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                            <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                            <p className="text-lg">
                                                No tasks yet
                                            </p>
                                            <p className="text-sm">
                                                Your tasks will appear here
                                            </p>
                                        </div>
                                    ) : (
                                        <ul className="space-y-3 text-slate-700 dark:text-slate-300 text-lg">
                                            {tasks.map((task, index) => (
                                                <li
                                                    key={index}
                                                    className="flex items-start gap-3"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="w-5 h-5 mt-1 accent-blue-600 dark:accent-blue-400"
                                                    />
                                                    <span>
                                                        {task.description}{" "}
                                                        {task.dueBy != null ? (
                                                            <span className="font-bold text-red-500">
                                                                (
                                                                {formatDate(
                                                                    new Date(
                                                                        task.dueBy
                                                                    )
                                                                )}
                                                                )
                                                            </span>
                                                        ) : (
                                                            <></>
                                                        )}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                                        Chat with AI:
                                    </h2>
                                    <div className="space-y-4">
                                        <div className="h-64 overflow-y-auto bg-slate-100 dark:bg-slate-800 rounded-lg p-4 space-y-3">
                                            {chatMessages.map((msg, index) => (
                                                <div
                                                    key={index}
                                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                                >
                                                    <div
                                                        className={`max-w-xs px-4 py-2 rounded-lg ${
                                                            msg.role === "user"
                                                                ? "bg-blue-600 text-white"
                                                                : "bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                                        }`}
                                                    >
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            ))}
                                            {isAiThinking && (
                                                <div className="flex justify-start">
                                                    <div className="max-w-xs px-4 py-2 rounded-lg bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-slate-100">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex gap-1">
                                                                <span
                                                                    className="w-2 h-2 bg-slate-600 dark:bg-slate-400 rounded-full animate-bounce"
                                                                    style={{
                                                                        animationDelay:
                                                                            "0ms",
                                                                    }}
                                                                ></span>
                                                                <span
                                                                    className="w-2 h-2 bg-slate-600 dark:bg-slate-400 rounded-full animate-bounce"
                                                                    style={{
                                                                        animationDelay:
                                                                            "150ms",
                                                                    }}
                                                                ></span>
                                                                <span
                                                                    className="w-2 h-2 bg-slate-600 dark:bg-slate-400 rounded-full animate-bounce"
                                                                    style={{
                                                                        animationDelay:
                                                                            "300ms",
                                                                    }}
                                                                ></span>
                                                            </div>
                                                            <span className="text-sm">
                                                                AI is
                                                                thinking...
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={chatInput}
                                                onChange={(e) =>
                                                    setChatInput(e.target.value)
                                                }
                                                onKeyPress={(e) =>
                                                    e.key === "Enter" &&
                                                    handleSendMessage()
                                                }
                                                disabled={isAiThinking}
                                                placeholder="Type your message..."
                                                className="flex-1 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={
                                                    isAiThinking ||
                                                    !chatInput.trim()
                                                }
                                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                                            >
                                                {isAiThinking
                                                    ? "Sending..."
                                                    : "Send"}
                                            </button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-screen flex-col flex">
                    <div className="flex flex-col items-center m-auto text-slate-200 gap-3 text-xl">
                        <h5 className="text-slate-400 animate-bounce">
                            Loading...
                        </h5>
                        <ArrowPathIcon className="h-15 animate-spin" />
                    </div>
                </div>
            )}
        </div>
    );
}
