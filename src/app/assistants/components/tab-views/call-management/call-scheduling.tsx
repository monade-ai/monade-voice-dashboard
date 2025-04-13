// components/tab-views/call-management/call-scheduling.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, Search, Users, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DaySelector from './components/day-selector';
import MonthCalendar from './components/month-calendar';
import ScheduleList from './components/schedule-list';
import ContactSearchPopup from './components/contact-search-popup';

interface ContactList {
  id: string;
  name: string;
  color: string;
  count: number;
}

interface IndividualContact {
  id: number;
  name: string;
  email: string;
  company?: string;
}

interface DateRange {
  start: Date;
  end: Date | null;
}

interface Schedule {
  id: number;
  contactList: string;
  contactName?: string;
  contactEmail?: string;
  time: string;
  days: string[];
  dateRange: DateRange | null;
  isActive: boolean;
}

interface ScheduleForm {
  contactList: string;
  contactName?: string;
  contactEmail?: string;
  time: string;
  days: string[];
  dateRange: DateRange | null;
  isActive: boolean;
}

type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

interface ContactDisplay {
  name: string;
  color: string;
}

/**
 * Enhanced call scheduling component with robust calendar and improved UX
 */
export default function CallScheduling() {
  // State for selected date range
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: new Date()
  });
  
  // State for month view
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // State for the scheduling form
  const [scheduleForm, setScheduleForm] = useState({
    contactList: 'customers',
    time: '09:00',
    days: ['mon', 'wed', 'fri'],
    dateRange: null, // For specific date selections
    isActive: true
  });
  
  // State for showing contact search popup
  const [showContactSearch, setShowContactSearch] = useState(false);
  
  // State for confirmation animation
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Sample existing schedules
  const [schedules, setSchedules] = useState([
    { id: 1, contactList: 'customers', time: '09:00', days: ['mon', 'wed', 'fri'], dateRange: null, isActive: true },
    { id: 2, contactList: 'leads', time: '14:30', days: ['tue', 'thu'], dateRange: null, isActive: true },
    { id: 3, contactList: 'subscribers', time: '16:00', days: ['fri'], dateRange: null, isActive: false },
    { 
      id: 4, 
      contactList: 'individual', 
      contactName: 'Jane Smith',
      contactEmail: 'jane@example.com',
      time: '11:00', 
      days: [], 
      dateRange: { 
        start: new Date(new Date().setDate(new Date().getDate() + 2)), 
        end: new Date(new Date().setDate(new Date().getDate() + 2)) 
      }, 
      isActive: true 
    }
  ]);
  
  // Contact list options with colors
  const contactLists = [
    { id: 'customers', name: 'Customers', color: '#34d399', count: 156 },
    { id: 'leads', name: 'Leads', color: '#60a5fa', count: 89 },
    { id: 'subscribers', name: 'Subscribers', color: '#c084fc', count: 273 },
    { id: 'partners', name: 'Partners', color: '#f97316', count: 42 },
    { id: 'inactive', name: 'Inactive Users', color: '#94a3b8', count: 118 }
  ];
  
  // Individual contacts for search
  const individualContacts = [
    { id: 1, name: 'Jane Smith', email: 'jane@example.com', company: 'Acme Inc.' },
    { id: 2, name: 'John Doe', email: 'john@example.com', company: 'XYZ Corp' },
    { id: 3, name: 'Robert Johnson', email: 'robert@example.com', company: 'ABC Ltd' },
    { id: 4, name: 'Sarah Williams', email: 'sarah@example.com', company: 'Tech Solutions' },
    // ... more contacts
  ];
  
  // Handle form changes
  const handleFormChange = (field: keyof ScheduleForm, value: any) => {
    setScheduleForm(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle day toggle
  const handleDayToggle = (day: DayOfWeek) => {
    setScheduleForm(prev => {
      const days = [...prev.days];
      const index = days.indexOf(day);
      
      if (index === -1) {
        days.push(day);
      } else {
        days.splice(index, 1);
      }
      
      return {
        ...prev,
        days
      };
    });
  };
  
  // Handle contact selection from popup
  const handleContactSelect = (type: 'list' | 'individual', contact: ContactList | IndividualContact) => {
    if (type === 'list') {
      setScheduleForm(prev => ({
        ...prev,
        contactList: contact.id,
        contactName: undefined,
        contactEmail: undefined
      }));
    } else {
      setScheduleForm(prev => ({
        ...prev,
        contactList: 'individual',
        contactName: contact.name,
        contactEmail: contact.email
      }));
    }
    
    setShowContactSearch(false);
  };
  
  // Handle schedule creation
  const handleCreateSchedule = () => {
    // Create new schedule
    const newSchedule = {
      id: Date.now(),
      contactList: scheduleForm.contactList,
      contactName: scheduleForm.contactName,
      contactEmail: scheduleForm.contactEmail,
      time: scheduleForm.time,
      days: scheduleForm.days,
      dateRange: scheduleForm.dateRange,
      isActive: scheduleForm.isActive
    };
    
    setSchedules(prev => [...prev, newSchedule]);
    
    // Show confirmation animation
    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 2000);
    
    // Reset form
    setScheduleForm({
      contactList: 'customers',
      time: '09:00',
      days: ['mon', 'wed', 'fri'],
      dateRange: null,
      isActive: true
    });
  };
  
  // Function to toggle schedule active state
  const toggleScheduleActive = (id: number) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.id === id ? {...schedule, isActive: !schedule.isActive} : schedule
    ));
  };
  
  // Function to delete a schedule
  const deleteSchedule = (id: number) => {
    setSchedules(prev => prev.filter(schedule => schedule.id !== id));
  };
  
  // Function to format time from 24h to 12h
  const formatTime = (time24: string): string => {
    const [hours, minutes] = time24.split(':');
    let period = 'AM';
    let hour = parseInt(hours);
    
    if (hour >= 12) {
      period = 'PM';
      if (hour > 12) hour -= 12;
    }
    if (hour === 0) hour = 12;
    
    return `${hour}:${minutes} ${period}`;
  };
  
  // Get contact display information
  const getContactDisplay = (schedule: Schedule): ContactDisplay => {
    if (schedule.contactList === 'individual') {
      return {
        name: schedule.contactName,
        color: '#f43f5e' // Pink for individuals
      };
    }
    
    const contactList = contactLists.find(c => c.id === schedule.contactList);
    return {
      name: contactList?.name || 'Unknown',
      color: contactList?.color || '#9ca3af'
    };
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border h-full overflow-hidden flex flex-col">
      {/* Confirmation Animation */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-green-600 text-white rounded-full p-6 shadow-lg">
              <Check className="h-16 w-16" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Contact Search Popup */}
      <AnimatePresence>
        {showContactSearch && (
          <ContactSearchPopup 
            contactLists={contactLists}
            individuals={individualContacts}
            onSelect={handleContactSelect}
            onClose={() => setShowContactSearch(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Add schedule form */}
      <div className="p-4 bg-gradient-to-b from-amber-50 to-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Schedule Automated Calls</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {/* Contact Selector */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Select Contacts</label>
            <div className="relative">
              <button
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm hover:bg-gray-50"
                onClick={() => setShowContactSearch(true)}
              >
                {scheduleForm.contactList === 'individual' ? (
                  <span className="text-pink-600 font-medium">{scheduleForm.contactName}</span>
                ) : (
                  <span 
                    className="font-medium"
                    style={{ color: contactLists.find(c => c.id === scheduleForm.contactList)?.color }}
                  >
                    {contactLists.find(c => c.id === scheduleForm.contactList)?.name}
                  </span>
                )}
                <Search className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
          
          {/* Time Selector */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Time</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="time"
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                value={scheduleForm.time}
                onChange={(e) => handleFormChange('time', e.target.value)}
              />
            </div>
          </div>
          
          {/* Submit Button */}
          <div className="flex items-end">
            <button
              className="w-full px-4 py-2 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-700 transition-colors flex items-center justify-center"
              onClick={handleCreateSchedule}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Calls
            </button>
          </div>
        </div>
        
        {/* Day Selector */}
        <div className="mt-4">
          <label className="block text-xs text-gray-500 mb-2">Repeat on Days</label>
          <div className="flex justify-start">
            <DaySelector 
              selectedDays={scheduleForm.days}
              onDayToggle={handleDayToggle}
            />
          </div>
        </div>
        
        {/* Calendar for specific dates */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs text-gray-500">Or Select Specific Dates</label>
            <div className="flex space-x-1">
              <button 
                className="p-1 rounded-full hover:bg-gray-100"
                onClick={() => {
                  const prevMonth = new Date(currentMonth);
                  prevMonth.setMonth(prevMonth.getMonth() - 1);
                  setCurrentMonth(prevMonth);
                }}
              >
                <ChevronLeft className="h-4 w-4 text-gray-500" />
              </button>
              <button 
                className="p-1 rounded-full hover:bg-gray-100"
                onClick={() => {
                  const nextMonth = new Date(currentMonth);
                  nextMonth.setMonth(nextMonth.getMonth() + 1);
                  setCurrentMonth(nextMonth);
                }}
              >
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>
          <MonthCalendar 
            month={currentMonth}
            schedules={schedules}
            selectedRange={dateRange}
            onDateSelect={(dates) => {
              setDateRange(dates);
              handleFormChange('dateRange', dates);
              // When specific dates are selected, clear the repeating days
              handleFormChange('days', []);
            }}
          />
        </div>
      </div>
      
      {/* List of schedules */}
      <div className="flex-1 overflow-auto p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Scheduled Calls</h3>
        <ScheduleList 
          schedules={schedules}
          contactLists={contactLists}
          formatTime={formatTime}
          getContactDisplay={getContactDisplay}
          onToggleActive={toggleScheduleActive}
          onDelete={deleteSchedule}
        />
      </div>
    </div>
  );
}