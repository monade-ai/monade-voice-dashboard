import fs from 'node:fs';
import path from 'node:path';

describe('login page content', () => {
  it('does not include the TechFin testimonial', () => {
    const loginPage = fs.readFileSync(
      path.join(process.cwd(), 'src/app/login/page.tsx'),
      'utf8',
    );

    expect(loginPage).not.toContain(
      'We replaced our entire tier-1 support with Monade',
    );
    expect(loginPage).not.toContain('Director of CX');
    expect(loginPage).not.toContain('TechFin Corp');
  });
});
