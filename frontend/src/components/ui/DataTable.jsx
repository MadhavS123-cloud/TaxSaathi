import React from 'react';

export default function DataTable({ columns, data }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th 
                key={index}
                className={`py-3 px-4 border-b border-hairline text-xs uppercase tracking-widest text-ink-muted font-sans font-semibold sticky top-0 bg-paper-raised ${col.align === 'right' ? 'text-right' : ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="group hover:bg-paper/50 transition-colors">
              {columns.map((col, colIndex) => {
                const isNumeric = col.type === 'numeric' || col.type === 'mono';
                return (
                  <td 
                    key={colIndex}
                    className={`py-4 px-4 border-b border-hairline align-top text-sm ${isNumeric ? 'font-mono' : 'font-sans'} text-ink ${col.align === 'right' ? 'text-right' : ''}`}
                  >
                    {col.accessor ? row[col.accessor] : col.cell(row)}
                  </td>
                );
              })}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-ink-muted text-sm font-sans border-b border-hairline">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
