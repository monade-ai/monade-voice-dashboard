// components/tab-views/call-management/components/contact-search-popup.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Users, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Popup component for searching and selecting contacts or contact lists
 */
export default function ContactSearchPopup({ contactLists, individuals, onSelect, onClose }) {
  // State for search term
  const [searchTerm, setSearchTerm] = useState('');
  // State for active tab
  const [activeTab, setActiveTab] = useState('lists');
  // Reference for the search input
  const searchInputRef = useRef(null);
  
  // Filter contacts/lists based on search term
  const filteredLists = contactLists.filter(list => 
    list.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredIndividuals = individuals.filter(contact => 
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contact.company && contact.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Focus the search input when the popup opens
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);
  
  // Close popup when Escape key is pressed
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-white rounded-xl shadow-lg w-full max-w-lg p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Select Contacts</h3>
          <button 
            className="p-1 rounded-full hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {/* Search input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
            placeholder="Search contacts or lists..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Tabs */}
        <div className="flex mb-4 border-b">
          <button
            className={`px-4 py-2 text-sm font-medium flex items-center ${
              activeTab === 'lists' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('lists')}
          >
            <Users className="h-4 w-4 mr-2" />
            Contact Lists
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium flex items-center ${
              activeTab === 'individuals' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('individuals')}
          >
            <User className="h-4 w-4 mr-2" />
            Individual Contacts
          </button>
        </div>
        
        {/* Content based on active tab */}
        <div className="max-h-64 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'lists' ? (
                <ContactListsSection 
                  lists={filteredLists} 
                  onSelect={(list) => onSelect('list', list)} 
                />
              ) : (
                <IndividualContactsSection 
                  contacts={filteredIndividuals} 
                  onSelect={(contact) => onSelect('individual', contact)} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Component for displaying contact lists
function ContactListsSection({ lists, onSelect }) {
  if (lists.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No matching contact lists found
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {lists.map(list => (
        <motion.button
          key={list.id}
          className="w-full p-3 rounded-lg hover:bg-gray-50 flex items-center justify-between text-left"
          onClick={() => onSelect(list)}
          whileHover={{ x: 5 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
              style={{ backgroundColor: list.color + '20', color: list.color }}
            >
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium text-gray-800">{list.name}</div>
              <div className="text-xs text-gray-500">{list.count} contacts</div>
            </div>
          </div>
          
          <div 
            className="px-2 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: list.color + '20', color: list.color }}
          >
            Select
          </div>
        </motion.button>
      ))}
    </div>
  );
}

// Component for displaying individual contacts
function IndividualContactsSection({ contacts, onSelect }) {
  if (contacts.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No matching contacts found
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {contacts.map(contact => (
        <motion.button
          key={contact.id}
          className="w-full p-3 rounded-lg hover:bg-gray-50 flex items-center justify-between text-left"
          onClick={() => onSelect(contact)}
          whileHover={{ x: 5 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mr-3 font-medium">
              {contact.name.charAt(0)}
            </div>
            <div>
              <div className="font-medium text-gray-800">{contact.name}</div>
              <div className="text-xs text-gray-500">
                {contact.email}
                {contact.company && <span className="ml-2 text-gray-400">• {contact.company}</span>}
              </div>
            </div>
          </div>
          
          <div className="px-2 py-1 bg-pink-100 text-pink-600 rounded-full text-xs font-medium">
            Select
          </div>
        </motion.button>
      ))}
    </div>
  );
}