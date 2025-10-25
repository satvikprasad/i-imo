import { useState } from 'react';
import { User, ChevronDown, Edit2, Check, X } from 'lucide-react';

// Mock data
const initialContacts = [
  { id: 1, name: 'Satpick Prasad', summary: 'Talked about how family is, asked you to call him tomorrow afternoon', confirmed: false },
  { id: 2, name: 'Arrtem Kim', summary: 'New person, exchanged numbers and requested to play basketball sometime next week', confirmed: false },
  { id: 3, name: 'Duy Fam', summary: 'You asked about UT Dallas, they said they would give you a tour sometime.', confirmed: false },
];

export default function ContactDirectory() {
  const [contacts, setContacts] = useState(initialContacts);
  const [selectedContact, setSelectedContact] = useState(contacts[0]);
  const [showSummary, setShowSummary] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(selectedContact.name);

  const handleContactChange = (contactId: number) => {
    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      setSelectedContact(contact);
      setEditedName(contact.name);
      setShowSummary(false);
      setIsEditing(false);
    }
  };

  const handleConfirmName = () => {
    // Update the contact in the list
    const updatedContacts = contacts.map(c => 
      c.id === selectedContact.id 
        ? { ...c, name: editedName, confirmed: true }
        : c
    );
    setContacts(updatedContacts);
    
    // Update selected contact
    setSelectedContact({ ...selectedContact, name: editedName, confirmed: true });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedName(selectedContact.name);
    setIsEditing(false);
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-900 mb-2">
            IMO Network
          </h1>
          <p className="text-slate-600 text-lg">Your Professional Contact Hub</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          {/* Contact Selector */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                <User className="w-6 h-6 text-white" />
              </div>
              
              <div className="relative flex-1">
                <select
                  value={selectedContact.id}
                  onChange={(e) => handleContactChange(Number(e.target.value))}
                  className="w-full appearance-none bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 pr-10 text-lg font-medium text-slate-900 cursor-pointer hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} {contact.confirmed ? '✓' : '(unconfirmed)'}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Name Confirmation Section */}
          <div className="mb-6 p-5 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-sm font-medium text-amber-800 mb-2">
                  {selectedContact.confirmed ? 'Name confirmed ✓' : 'Is this name spelled correctly?'}
                </div>
                
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold text-slate-900"
                      autoFocus
                    />
                    <button
                      onClick={handleConfirmName}
                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      title="Confirm"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-2 bg-slate-400 text-white rounded-lg hover:bg-slate-500 transition-colors"
                      title="Cancel"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-slate-900">{selectedContact.name}</div>
                    {!selectedContact.confirmed && (
                      <button
                        onClick={startEditing}
                        className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
                        title="Edit name"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {!isEditing && !selectedContact.confirmed && (
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmName}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Correct
                  </button>
                  <button
                    onClick={startEditing}
                    className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    Fix Spelling
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* See Summary Button */}
          <button
            onClick={() => setShowSummary(!showSummary)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {showSummary ? 'Hide Conversation Summary' : 'See Conversation Summary'}
          </button>

          {/* Summary Display */}
          {showSummary && (
            <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 animate-in fade-in slide-in-from-top-4 duration-300">
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                Conversation Summary
              </h3>
              <p className="text-slate-700 leading-relaxed">{selectedContact.summary}</p>
            </div>
          )}
        </div>

        {/* Stats Footer */}
        <div className="mt-8 text-center">
          <p className="text-slate-600">
            <span className="font-semibold text-slate-900">{contacts.length}</span> contacts in your network
            {' • '}
            <span className="font-semibold text-green-600">{contacts.filter(c => c.confirmed).length}</span> confirmed
          </p>
        </div>
      </div>
    </div>
  );
}