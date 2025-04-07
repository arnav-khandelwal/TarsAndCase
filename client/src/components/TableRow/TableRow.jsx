import { useState } from 'react';
import './TableRow.css';

const TableRow = ({ rowIndex, onDataChange, onRowSubmit }) => {
  const [rowData, setRowData] = useState({
    file: null,
    aiResponse: ''
  });
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e) => {
    console.log('Files selected:', e.target.files); // Add this line
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      setFileName(file.name);
      const updatedData = { ...rowData, file };
      setRowData(updatedData);
      onDataChange(rowIndex, updatedData);
    }
  };

  // In TableRow.jsx - modify the handleSubmit function
// In TableRow.jsx
const handleSubmit = async () => {
    if (!rowData.file) {
      alert('Please select an image first');
      return;
    }
  
    setSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('image', rowData.file);
      formData.append('serialNumber', rowIndex + 1);
      
      // Debug: Check what's being passed to onRowSubmit
      console.log('Submitting formData with:', {
        file: rowData.file,
        serialNumber: rowIndex + 1
      });
  
      const response = await onRowSubmit(rowIndex, formData);
      
      const updatedData = { 
        ...rowData, 
        aiResponse: `Similarity score: ${response.aiScore}/10`,
        aiScore: response.aiScore
      };
      
      setRowData(updatedData);
      onDataChange(rowIndex, updatedData);
      
      // Reset file input
      setFileName('');
      document.getElementById(`file-${rowIndex}`).value = '';
    } catch (error) {
      console.error('Submission error:', error);
      alert(error.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <tr>
      <td className="serial-number">{rowIndex + 1}</td>
      <td className="file-cell">
        <div className="file-input-container">
          <input
            type="file"
            id={`file-${rowIndex}`}
            onChange={handleFileChange}
            accept="image/*"
            className="file-input"
            disabled={submitting}
          />
          <label htmlFor={`file-${rowIndex}`} className="file-label">
            {fileName || 'Choose image'}
          </label>
        </div>
      </td>
      <td className="submit-cell">
        <button 
          type="button" 
          className="btn btn-sm btn-primary row-submit-btn" 
          onClick={handleSubmit}
          disabled={submitting || !rowData.file}
        >
          {submitting ? 'Processing...' : 'Submit'}
        </button>
      </td>
      <td className="ai-response-cell">
        {rowData.aiResponse ? (
          <div className="ai-response-text">{rowData.aiResponse}</div>
        ) : (
          <span className="no-response">No response yet</span>
        )}
      </td>
    </tr>
  );
};

export default TableRow;