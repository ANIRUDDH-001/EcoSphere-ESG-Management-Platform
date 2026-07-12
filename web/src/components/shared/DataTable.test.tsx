import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DataTable } from './DataTable';

describe('DataTable', () => {
  it('renders rows correctly', () => {
    const columns = [{ header: 'Name', accessorKey: 'name' }];
    const data = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
    render(<DataTable columns={columns} data={data as any} />);
    
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
  });

  it('handles empty state', () => {
    const columns = [{ header: 'Name', accessorKey: 'name' }];
    render(<DataTable columns={columns} data={[]} />);
    
    expect(screen.getByText('No results.')).toBeTruthy();
  });
});
