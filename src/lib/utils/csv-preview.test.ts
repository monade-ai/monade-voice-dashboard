import { createDedupedCSV, parseCSV } from '@/lib/utils/csv-preview';

describe('csv-preview', () => {
  test('parseCSV detects phone column variants and normalizes numbers', async () => {
    const content = [
      'Name,phone',
      'amol,+917795957544',
      'dup,+917795957544',
      'shashwat,9122833772',
      '',
    ].join('\n');
    // Jest's File polyfill may not implement File.text(); mock a minimal File-like object.
    const file = { name: 'contacts.csv', text: async () => content } as unknown as File;

    const result = await parseCSV(file);

    expect(result.phoneColumnName).toBe('phone_number');
    expect(result.fieldNames).toContain('phone_number');
    expect(result.totalContacts).toBe(2); // unique contacts only
    expect(result.duplicates.count).toBe(1);
    expect(result.contacts.map((c) => c.phone_number)).toEqual([
      '+917795957544',
      '+919122833772',
    ]);
  });

  test('createDedupedCSV produces a CSV without duplicates', async () => {
    const content = [
      'Name,phone',
      'a,+919000000000',
      'b,+919000000000',
      'c,+919111111111',
    ].join('\n');
    const file = { name: 'contacts.csv', text: async () => content } as unknown as File;

    const deduped = await createDedupedCSV(file);
    expect(deduped.name).toBe('contacts_deduped.csv');

    const parsed = await parseCSV(deduped);
    expect(parsed.duplicates.count).toBe(0);
    expect(parsed.totalContacts).toBe(2);
  });

  test('parseCSV normalizes name column variants to "name"', async () => {
    const content = [
      'FULL NAME,Phone Number',
      'John Doe,+919000000001',
      'Jane Smith,+919000000002',
    ].join('\n');
    const file = { name: 'leads.csv', text: async () => content } as unknown as File;

    const result = await parseCSV(file);

    expect(result.fieldNames).toContain('name');
    expect(result.fieldNames).not.toContain('FULL NAME');
    expect(result.contacts[0].name).toBe('John Doe');
    expect(result.contacts[1].name).toBe('Jane Smith');
  });

  test('parseCSV handles Customer_Name header', async () => {
    const content = [
      'Customer_Name,mobile',
      'Alice,9876543210',
    ].join('\n');
    const file = { name: 'customers.csv', text: async () => content } as unknown as File;

    const result = await parseCSV(file);

    expect(result.fieldNames).toContain('name');
    expect(result.contacts[0].name).toBe('Alice');
    expect(result.contacts[0].phone_number).toBe('+919876543210');
  });
});
