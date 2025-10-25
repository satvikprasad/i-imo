import { useState, useEffect } from "react";
import { User, Edit2, Moon, Sun, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Profile {
    name: string;
    conversationSummary: string;
    metOn: number;
}

interface Task {
  description: string;
  dueBy: Date | null;
}

export default function ContactDirectory() {
    const [contacts, setContacts] = useState<(Profile & {
      confirmed: boolean
    })[]>([]);

    const [tasks, setTasks] = useState<Task[]>([]);

    const [theme, setTheme] = useState<"light" | "dark">("light");

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

        fetch(
            "https://imo-8d4faadab8d7.herokuapp.com/omi/profiles?name=Satvik"
        ).then(async (res) => {
            const profiles = JSON.parse(await res.json()).profiles as Profile[];

            setContacts(profiles.map((p) => {
              return {
                name: p.name,
                conversationSummary: p.conversationSummary,
                metOn: p.metOn,
                confirmed: true
              };
            }))
        });

        fetch(
            "https://imo-8d4faadab8d7.herokuapp.com/omi/tasks?name=Satvik"
        ).then(async (res) => {
          const tasks = JSON.parse(await res.json()).tasks as {
            description: string,
            dueBy: number
          }[];

          setTasks(tasks.map((t) => {
            return {
              description: t.description,
              dueBy: t.dueBy ? new Date(t.dueBy) : null,
            }
          }));
        })
    }, []);

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
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
                        <div className="text-left mb-4">
                            <p className="text-slate-600 dark:text-slate-400">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                    {contacts.length}
                                </span>{" "}
                                contacts in your network
                                {" • "}
                                {contacts.filter((c) => !c.confirmed).length ===
                                0 ? (
                                    <span className="font-semibold text-green-600 dark:text-green-400">
                                        All confirmed ✓
                                    </span>
                                ) : (
                                    <>
                                        <span className="font-semibold text-red-600 dark:text-red-400">
                                            {
                                                contacts.filter(
                                                    (c) => !c.confirmed
                                                ).length
                                            }
                                        </span>
                                        <span className="font-semibold text-red-600 dark:text-red-400">
                                            {" "}
                                            unconfirmed
                                        </span>
                                    </>
                                )}
                            </p>
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
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {contact.confirmed ? (
                                                            <Badge
                                                                variant="outline"
                                                                className="text-xs"
                                                            >
                                                                ✓ Confirmed
                                                            </Badge>
                                                        ) : (
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-xs"
                                                            >
                                                                Unconfirmed
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <div
                                        className={`transition-all duration-300 ease-in-out max-h-[1000px] opacity-100`}
                                    >
                                        <CardContent className="space-y-4 pt-0">
                                            {/* Name Confirmation Section */}
                                            {!contact.confirmed && (
                                                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                                                    <AlertDescription>
                                                        <div className="space-y-3">
                                                            <div className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                                                Is this name
                                                                spelled
                                                                correctly?
                                                            </div>

                                                                <div className="flex items-center gap-3">
                                                                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                                                        {
                                                                            contact.name
                                                                        }
                                                                    </div>
                                                                    <Button
                                                                        onClick={(
                                                                            e
                                                                        ) => {
                                                                            e.stopPropagation();
                                                                        }}
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 shrink-0"
                                                                        title="Edit name"
                                                                    >
                                                                        <Edit2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                        </div>
                                                    </AlertDescription>
                                                </Alert>
                                            )}

                                            {/* Date */}
                                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                <Calendar className="h-4 w-4" />
                                                <span>
                                                    Met on{" "}
                                                    {formatDate(new Date(contact.metOn))}
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
                                                        {contact.conversationSummary}
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

                    <div className="bg-transparent p-10">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 md-4">
                            Tasks:
                        </h2>
                        <ul className="space-y-3 p-4 text-slate-700 dark:text-slate-300 text-lg">
                            {tasks.map((task, index) => (
                                <li
                                    key={index}
                                    className="flex items-center-safe gap-3"
                                >
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 accent-blue-600 dark:accent-blue-400"
                                    />
                                    <span>{task.description} {task.dueBy != null ? <span className="font-bold text-red-500">({formatDate(task.dueBy)})</span> : <></>}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
