import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const Table = ({ 
  columns, 
  data, 
  loading = false, 
  emptyMessage = 'Không có dữ liệu',
  onEdit,
  onDelete,
  showActions = true
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12 bg-white rounded-lg shadow">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <div className="text-gray-400 text-5xl mb-3">📋</div>
        <p className="text-gray-500 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-blue-600 to-blue-700">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-blue-500 last:border-r-0"
                >
                  {column.label}
                </th>
              ))}
              {showActions && (onEdit || onDelete) && (
                <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                  Thao Tác
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                className="hover:bg-blue-50 transition-colors duration-150"
              >
                {columns.map((column, colIndex) => (
                  <td 
                    key={colIndex} 
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200 last:border-r-0"
                  >
                    {column.render ? column.render(row) : row[column.field]}
                  </td>
                ))}
                {showActions && (onEdit || onDelete) && (
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex justify-center gap-2">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row)}
                          className="inline-flex items-center px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md transition-colors duration-150 shadow-sm"
                          title="Sửa"
                        >
                          <Edit2 size={14} className="mr-1" />
                          Sửa
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(row)}
                          className="inline-flex items-center px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors duration-150 shadow-sm"
                          title="Xóa"
                        >
                          <Trash2 size={14} className="mr-1" />
                          Xóa
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Footer with total count */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Tổng số: <span className="font-semibold text-gray-900">{data.length}</span> bản ghi
        </p>
      </div>
    </div>
  );
};

export default Table;