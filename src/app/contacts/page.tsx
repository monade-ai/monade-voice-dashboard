import React from 'react';

import ContactListPage from './components/contact-list-page';
export const metadata = {
  title: 'Contact Management | Dashboard',
  description: 'Manage your contacts and contact lists',
};

export default function ContactsPage() {
  return <ContactListPage />;
}