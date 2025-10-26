import { useState, useEffect } from 'react';
import { User, Edit2, Check, X, Moon, Sun, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Mock data with dates and photos
const initialContacts = [
  { 
    id: 1, 
    name: 'Satpick Prasad', 
    summary: 'Talked about how family is, asked you to call him tomorrow afternoon', 
    date: '2024-10-24',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Satpick',
    confirmed: false 
  },
  { 
    id: 2, 
    name: 'Arrtem Kim', 
    summary: 'New person, exchanged numbers and requested to play basketball sometime next week', 
    date: '2024-10-23',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arrtem',
    confirmed: false 
  },
  { 
    id: 3, 
    name: 'Duy Fam', 
    summary: 'You asked about UT Dallas, they said they would give you a tour sometime.',
    date: '2024-10-22',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Duy',
    confirmed: false 
  },
];

const initialTasks = [
  'Follow up with Satpick about the family call.',
  'Schedule basketball game with Arrtem next week.',
  'Coordinate UT Dallas tour with Duy Fam.',
]

export default function ContactDirectory() {
  const [contacts, setContacts] = useState(initialContacts);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedNames, setEditedNames] = useState<Record<number, string>>({});
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const toggleCard = (id: number) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const startEditing = (id: number, currentName: string) => {
    setEditingId(id);
    setEditedNames({ ...editedNames, [id]: currentName });
  };

  const handleConfirmName = (id: number) => {
    const newName = editedNames[id];
    const updatedContacts = contacts.map(c => 
      c.id === id 
        ? { ...c, name: newName, confirmed: true }
        : c
    );
    setContacts(updatedContacts);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            IMO Network
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">People Made Easy</p>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Left Column - Contact Cards */}
          <div className="space-y-4">
            {/* Stats Header */}
            <div className="text-left mb-4">
              <p className="text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{contacts.length}</span> contacts in your network
                {' • '}
                {contacts.filter(c => !c.confirmed).length === 0 ? (
                  <span className="font-semibold text-green-600 dark:text-green-400">All confirmed ✓</span>
                ) : (
                  <>
                    <span className="font-semibold text-red-600 dark:text-red-400">{contacts.filter(c => !c.confirmed).length}</span>
                    <span className="font-semibold text-red-600 dark:text-red-400"> unconfirmed</span>
                  </>
                )}
              </p>
            </div>
          {contacts.map((contact) => {
            const isExpanded = expandedId === contact.id;
            const isEditing = editingId === contact.id;
            
            return (
              <Card
                key={contact.id}
                className={`transition-all duration-300 hover:shadow-lg cursor-pointer overflow-hidden ${expandedId === contact.id ? 'h-auto' : 'h-25'
                }`}
              >
                <CardHeader onClick={() => !isEditing && toggleCard(contact.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={contact.photoUrl} alt={contact.name} />
                        <AvatarFallback>
                          <User className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-xl">{contact.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {contact.confirmed ? (
                            <Badge variant="outline" className="text-xs">✓ Confirmed</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Unconfirmed</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <div 
                  className={`transition-all duration-300 ease-in-out ${
                    isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <CardContent className="space-y-4 pt-0">
                    {/* Name Confirmation Section */}
                    {!contact.confirmed && (
                      <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                        <AlertDescription>
                          <div className="space-y-3">
                            <div className="text-sm font-medium text-blue-800 dark:text-blue-300">
                              Is this name spelled correctly?
                            </div>
                            
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="text"
                                  value={editedNames[contact.id] || contact.name}
                                  onChange={(e) => setEditedNames({ ...editedNames, [contact.id]: e.target.value })}
                                  className="flex-1 text-lg font-semibold border-blue-300 focus-visible:ring-blue-500 dark:text-slate-300"
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConfirmName(contact.id);
                                  }}
                                  size="icon"
                                  className="bg-green-600 hover:bg-green-700 shrink-0"
                                  title="Confirm"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelEdit();
                                  }}
                                  size="icon"
                                  variant="secondary"
                                  className="shrink-0"
                                  title="Cancel"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{contact.name}</div>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(contact.id, contact.name);
                                  }}
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 shrink-0"
                                  title="Edit name"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            
                            <div className="flex gap-2">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmName(contact.id);
                                }}
                                size="sm"
                                className="bg-green-600 hover:bg-green-800"
                                disabled={isEditing}
                              >
                                Correct
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(contact.id, contact.name);
                                }}
                                size="sm"
                                className="bg-red-600 hover:bg-red-800"
                                disabled={isEditing}
                              >
                                Fix Spelling
                              </Button>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Date */}
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Calendar className="h-4 w-4" />
                      <span>Met on {formatDate(contact.date)}</span>
                    </div>

                    {/* Photo Section */}
                    <div className="flex justify-center">
                      <Avatar className="h-32 w-32 border-4 border-slate-200 dark:border-slate-700">
                        <AvatarImage src={contact.photoUrl} alt={contact.name} />
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
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{contact.summary}</p>
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
              {initialTasks.map((task, index) => (
                <li key={index} className="flex items-center-safe gap-3">
                  <input type="checkbox" className="w-5 h-5 accent-blue-600 dark:accent-blue-400" />
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}