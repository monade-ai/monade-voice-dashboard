/**
 * Centralized permissions matrix for RBAC (Admin/User model).
 * Each key is a role, each value is a map of action keys to booleans.
 * Action keys are namespaced as "module.action".
 */
export type Role = 'admin' | 'user';

export type Action =
  // Assistants
  | 'assistants.view'
  | 'assistants.create'
  | 'assistants.edit'
  | 'assistants.delete'
  | 'assistants.assign_workflow'
  // Contacts
  | 'contacts.view'
  | 'contacts.create_bucket'
  | 'contacts.delete_bucket'
  | 'contacts.add_contact'
  | 'contacts.bulk_upload'
  | 'contacts.delete_contact'
  | 'contacts.search'
  | 'contacts.download'
  | 'contacts.view_details'
  // Call History
  | 'callHistory.view'
  | 'callHistory.view_details'
  | 'callHistory.delete'
  | 'callHistory.export'
  // Dashboard
  | 'dashboard.view'
  | 'dashboard.export'
  | 'dashboard.configure'
  // Knowledge Base
  | 'knowledgeBase.view'
  | 'knowledgeBase.upload'
  | 'knowledgeBase.edit'
  | 'knowledgeBase.delete'
  | 'knowledgeBase.download'
  // Workflow
  | 'workflow.view'
  | 'workflow.create'
  | 'workflow.edit'
  | 'workflow.delete'
  | 'workflow.assign'
  | 'workflow.run';

export const permissionsMatrix: Record<Role, Record<Action, boolean>> = {
  admin: {
    // Assistants
    'assistants.view': true,
    'assistants.create': true,
    'assistants.edit': true,
    'assistants.delete': true,
    'assistants.assign_workflow': true,
    // Contacts
    'contacts.view': true,
    'contacts.create_bucket': true,
    'contacts.delete_bucket': true,
    'contacts.add_contact': true,
    'contacts.bulk_upload': true,
    'contacts.delete_contact': true,
    'contacts.search': true,
    'contacts.download': true,
    'contacts.view_details': true,
    // Call History
    'callHistory.view': true,
    'callHistory.view_details': true,
    'callHistory.delete': true,
    'callHistory.export': true,
    // Dashboard
    'dashboard.view': true,
    'dashboard.export': true,
    'dashboard.configure': true,
    // Knowledge Base
    'knowledgeBase.view': true,
    'knowledgeBase.upload': true,
    'knowledgeBase.edit': true,
    'knowledgeBase.delete': true,
    'knowledgeBase.download': true,
    // Workflow
    'workflow.view': true,
    'workflow.create': true,
    'workflow.edit': true,
    'workflow.delete': true,
    'workflow.assign': true,
    'workflow.run': true,
  },
  user: {
    // Assistants
    'assistants.view': true,
    'assistants.create': true,
    'assistants.edit': true,
    'assistants.delete': true,
    'assistants.assign_workflow': false,
    // Contacts
    'contacts.view': true,
    'contacts.create_bucket': true,
    'contacts.delete_bucket': false,
    'contacts.add_contact': true,
    'contacts.bulk_upload': true,
    'contacts.delete_contact': false,
    'contacts.search': true,
    'contacts.download': true,
    'contacts.view_details': true,
    // Call History
    'callHistory.view': true,
    'callHistory.view_details': true,
    'callHistory.delete': false,
    'callHistory.export': false,
    // Dashboard
    'dashboard.view': true,
    'dashboard.export': false,
    'dashboard.configure': false,
    // Knowledge Base
    'knowledgeBase.view': true,
    'knowledgeBase.upload': true,
    'knowledgeBase.edit': true,
    'knowledgeBase.delete': false,
    'knowledgeBase.download': true,
    // Workflow
    'workflow.view': true,
    'workflow.create': true,
    'workflow.edit': true,
    'workflow.delete': false,
    'workflow.assign': false,
    'workflow.run': true,
  },
};
