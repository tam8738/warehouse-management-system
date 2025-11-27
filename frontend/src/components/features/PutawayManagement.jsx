import React, { useState, useEffect } from 'react';
import { PackagePlus, MapPin, User, Clock, CheckCircle } from 'lucide-react';
import api from '../../services/api';

const PutawayManagement = ({ permissions }) => {
  const [tasks, setTasks] = useState([]);
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedBinId, setSelectedBinId] = useState('');

  const statusOptions = [
    { value: 'pending', label: 'Chờ xử lý', color: 'yellow' },
    { value: 'assigned', label: 'Đã phân công', color: 'blue' },
    { value: 'in_progress', label: 'Đang thực hiện', color: 'purple' },
    { value: 'completed', label: 'Hoàn thành', color: 'green' }
  ];

  useEffect(() => {
    fetchTasks();
    fetchAvailableBins();
  }, [filter]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/putaway?status=${filter}`);
      setTasks(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBins = async () => {
    try {
      const response = await api.get('/locations/bins?status=empty&limit=100');
      setBins(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching bins:', error);
    }
  };

  const handleStartTask = async (taskId) => {
    try {
      await api.post(`/putaway/${taskId}/start`);
      alert('Đã bắt đầu nhiệm vụ!');
      fetchTasks();
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.error || 'Không thể bắt đầu'));
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedBinId) {
      alert('Vui lòng chọn vị trí đích!');
      return;
    }

    try {
      await api.post(`/putaway/${selectedTask.id}/complete`, {
        toBinId: selectedBinId
      });
      alert('Hoàn thành putaway thành công!');
      setShowModal(false);
      fetchTasks();
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.error || 'Không thể hoàn thành'));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <PackagePlus size={32} className="text-green-600" />
          Quản Lý Putaway
        </h1>
        <p className="text-gray-600 mt-1">Đưa hàng vào vị trí lưu trữ trong kho</p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex gap-2">
          {statusOptions.map(status => (
            <button
              key={status.value}
              onClick={() => setFilter(status.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <PackagePlus size={64} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">Không có nhiệm vụ putaway</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-800">{task.putawayNo}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                      task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {task.priority === 'urgent' ? 'Khẩn cấp' :
                       task.priority === 'high' ? 'Cao' : 'Bình thường'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-500">Sản phẩm</p>
                      <p className="font-medium">{task.product?.name}</p>
                      <p className="text-sm text-gray-600">{task.product?.sku}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Số lượng</p>
                      <p className="font-bold text-lg text-blue-600">{task.quantity}</p>
                    </div>
                    {task.batchNo && (
                      <div>
                        <p className="text-sm text-gray-500">Số lô</p>
                        <p className="font-medium">{task.batchNo}</p>
                      </div>
                    )}
                    {task.fromLocation && (
                      <div>
                        <p className="text-sm text-gray-500">Từ vị trí</p>
                        <p className="font-medium">{task.fromLocation}</p>
                      </div>
                    )}
                  </div>

                  {task.suggestedBin && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <MapPin size={14} className="inline mr-1" />
                        Vị trí gợi ý: <strong>{task.suggestedBin.code}</strong>
                      </p>
                    </div>
                  )}
                </div>

                <div className="ml-4 text-right">
                  {task.status === 'pending' && (
                    <button
                      onClick={() => handleStartTask(task.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Bắt đầu
                    </button>
                  )}
                  {task.status === 'in_progress' && (
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setSelectedBinId(task.suggestedBinId || '');
                        setShowModal(true);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Hoàn thành
                    </button>
                  )}
                  {task.status === 'completed' && task.destinationBin && (
                    <div className="text-sm text-gray-600">
                      <MapPin size={14} className="inline" />
                      <p className="font-medium">{task.destinationBin.code}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Complete Modal */}
      {showModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-bold">Hoàn thành Putaway</h2>
              <p className="text-sm text-gray-600">{selectedTask.putawayNo}</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Chọn vị trí đích</label>
                <select
                  value={selectedBinId}
                  onChange={(e) => setSelectedBinId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">-- Chọn vị trí --</option>
                  {bins.map(bin => (
                    <option key={bin.id} value={bin.id}>
                      {bin.code} {bin.status === 'empty' ? '(Trống)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Sản phẩm: <strong>{selectedTask.product?.name}</strong></p>
                <p className="text-sm text-gray-600">Số lượng: <strong>{selectedTask.quantity}</strong></p>
              </div>
            </div>

            <div className="border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Hủy
              </button>
              <button
                onClick={handleCompleteTask}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Xác nhận hoàn thành
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PutawayManagement;