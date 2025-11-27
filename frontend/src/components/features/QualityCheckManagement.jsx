import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Search, Plus, Eye, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const QualityCheckManagement = ({ permissions }) => {
  const [qcRecords, setQcRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ status: '', qcResult: '' });
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('inspect');
  const [selectedQC, setSelectedQC] = useState(null);
  const [inspectionData, setInspectionData] = useState({
    acceptedQty: '',
    rejectedQty: '',
    damagedQty: '',
    defectTypes: [],
    notes: ''
  });

  const statusOptions = [
    { value: 'pending', label: 'Chờ kiểm tra', color: 'yellow' },
    { value: 'in_progress', label: 'Đang kiểm tra', color: 'blue' },
    { value: 'completed', label: 'Hoàn thành', color: 'green' },
    { value: 'cancelled', label: 'Đã hủy', color: 'red' }
  ];

  const resultOptions = [
    { value: 'pending', label: 'Chưa có', icon: AlertCircle, color: 'gray' },
    { value: 'passed', label: 'Đạt', icon: CheckCircle, color: 'green' },
    { value: 'partial', label: 'Một phần', icon: AlertCircle, color: 'yellow' },
    { value: 'failed', label: 'Không đạt', icon: XCircle, color: 'red' }
  ];

  const defectTypeOptions = [
    { value: 'damaged', label: 'Hư hỏng' },
    { value: 'expired', label: 'Hết hạn' },
    { value: 'wrong_item', label: 'Sai hàng' },
    { value: 'poor_quality', label: 'Chất lượng kém' },
    { value: 'packaging_issue', label: 'Bao bì lỗi' }
  ];

  useEffect(() => {
    fetchQCRecords();
  }, [filter]);

  const fetchQCRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.qcResult) params.append('qcResult', filter.qcResult);
      
      const response = await api.get(`/qc?${params.toString()}`);
      setQcRecords(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching QC records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInspection = (qc) => {
    setSelectedQC(qc);
    setModalMode('inspect');
    setInspectionData({
      acceptedQty: qc.acceptedQty || '',
      rejectedQty: qc.rejectedQty || '',
      damagedQty: qc.damagedQty || '',
      defectTypes: qc.defectTypes || [],
      notes: qc.notes || ''
    });
    setShowModal(true);
  };

  const handleInspectionSubmit = async (e) => {
    e.preventDefault();
    
    const totalChecked = parseFloat(inspectionData.acceptedQty || 0) + 
                        parseFloat(inspectionData.rejectedQty || 0) + 
                        parseFloat(inspectionData.damagedQty || 0);

    if (totalChecked > parseFloat(selectedQC.receivedQty)) {
      alert('Tổng số lượng kiểm tra vượt quá số lượng nhận!');
      return;
    }

    try {
      await api.post(`/qc/${selectedQC.id}/inspect`, inspectionData);
      alert('Kiểm tra chất lượng thành công!');
      setShowModal(false);
      fetchQCRecords();
    } catch (error) {
      console.error('Error inspection:', error);
      alert(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const getStatusColor = (status) => {
    const option = statusOptions.find(s => s.value === status);
    return option?.color || 'gray';
  };

  const getResultBadge = (result) => {
    const option = resultOptions.find(r => r.value === result);
    if (!option) return null;
    const Icon = option.icon;
    return (
      <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
        ${option.color === 'green' ? 'bg-green-100 text-green-700' : ''}
        ${option.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' : ''}
        ${option.color === 'red' ? 'bg-red-100 text-red-700' : ''}
        ${option.color === 'gray' ? 'bg-gray-100 text-gray-700' : ''}
      `}>
        <Icon size={14} />
        {option.label}
      </span>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <ClipboardCheck size={32} className="text-blue-600" />
          Kiểm Tra Chất Lượng (QC)
        </h1>
        <p className="text-gray-600 mt-1">Kiểm tra và xác nhận chất lượng hàng nhập kho</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center gap-4">
        <select
          value={filter.status}
          onChange={(e) => setFilter({...filter, status: e.target.value})}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <select
          value={filter.qcResult}
          onChange={(e) => setFilter({...filter, qcResult: e.target.value})}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả kết quả</option>
          {resultOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* QC Records Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Đang tải...</p>
        </div>
      ) : qcRecords.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <ClipboardCheck size={64} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">Chưa có phiếu QC nào</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã QC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số lô</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dự kiến</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thực nhận</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Đạt</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Lỗi</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Kết quả</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {qcRecords.map((qc) => (
                <tr key={qc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{qc.qcNo}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {qc.product?.name}
                    <div className="text-xs text-gray-400">{qc.product?.sku}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{qc.batchNo || '-'}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">{qc.expectedQty}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">{qc.receivedQty}</td>
                  <td className="px-6 py-4 text-sm text-right text-green-600 font-medium">{qc.acceptedQty}</td>
                  <td className="px-6 py-4 text-sm text-right text-red-600 font-medium">
                    {parseFloat(qc.rejectedQty || 0) + parseFloat(qc.damagedQty || 0)}
                  </td>
                  <td className="px-6 py-4 text-center">{getResultBadge(qc.qcResult)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${getStatusColor(qc.status) === 'green' ? 'bg-green-100 text-green-700' : ''}
                      ${getStatusColor(qc.status) === 'yellow' ? 'bg-yellow-100 text-yellow-700' : ''}
                      ${getStatusColor(qc.status) === 'blue' ? 'bg-blue-100 text-blue-700' : ''}
                      ${getStatusColor(qc.status) === 'red' ? 'bg-red-100 text-red-700' : ''}
                    `}>
                      {statusOptions.find(s => s.value === qc.status)?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {qc.status !== 'completed' && qc.status !== 'cancelled' && (
                      <button
                        onClick={() => handleOpenInspection(qc)}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Kiểm tra
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inspection Modal */}
      {showModal && selectedQC && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-bold text-gray-800">Kiểm Tra Chất Lượng</h2>
              <p className="text-sm text-gray-600 mt-1">{selectedQC.qcNo} - {selectedQC.product?.name}</p>
            </div>

            <form onSubmit={handleInspectionSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng đạt</label>
                  <input
                    type="number"
                    step="0.01"
                    value={inspectionData.acceptedQty}
                    onChange={(e) => setInspectionData({...inspectionData, acceptedQty: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng lỗi</label>
                  <input
                    type="number"
                    step="0.01"
                    value={inspectionData.rejectedQty}
                    onChange={(e) => setInspectionData({...inspectionData, rejectedQty: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng hỏng</label>
                  <input
                    type="number"
                    step="0.01"
                    value={inspectionData.damagedQty}
                    onChange={(e) => setInspectionData({...inspectionData, damagedQty: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Loại lỗi</label>
                <div className="flex flex-wrap gap-2">
                  {defectTypeOptions.map(defect => (
                    <label key={defect.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inspectionData.defectTypes.includes(defect.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setInspectionData({
                              ...inspectionData,
                              defectTypes: [...inspectionData.defectTypes, defect.value]
                            });
                          } else {
                            setInspectionData({
                              ...inspectionData,
                              defectTypes: inspectionData.defectTypes.filter(d => d !== defect.value)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{defect.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  value={inspectionData.notes}
                  onChange={(e) => setInspectionData({...inspectionData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Nhập ghi chú về kết quả kiểm tra..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Xác Nhận Kiểm Tra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityCheckManagement;