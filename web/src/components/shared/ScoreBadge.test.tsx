import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ScoreBadge } from './ScoreBadge';

describe('ScoreBadge', () => {
  it('maps strong score (>=85) to strong band', () => {
    const { container } = render(<ScoreBadge score={85} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('bg-primary');
  });

  it('maps poor score (<40) to danger band', () => {
    const { container } = render(<ScoreBadge score={35} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('bg-danger');
  });
});
