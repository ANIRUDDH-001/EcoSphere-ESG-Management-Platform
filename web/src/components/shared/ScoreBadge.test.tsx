import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ScoreBadge } from './ScoreBadge';

describe('ScoreBadge', () => {
  it('maps excellent score (>=80) to excellent band', () => {
    const { container } = render(<ScoreBadge score={85} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('excellent');
  });

  it('maps poor score (<40) to poor band', () => {
    const { container } = render(<ScoreBadge score={35} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('poor');
  });
});
