// types/call-management.ts
export interface Schedule {
    id: number;
    contactList: string;
    contactName?: string;
    contactEmail?: string;
    time: string;
    days: string[];
    dateRange: DateRange | null;
    isActive: boolean;
  }
  
  export interface DateRange {
    start: Date;
    end: Date | null;
  }
  
  export interface ContactList {
    id: string;
    name: string;
    color: string;
    count: number;
  }
  
  export interface Contact {
    id: number;
    name: string;
    email: string;
    company?: string;
  }
  
  // Define other types here...